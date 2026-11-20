/* Limitation d'usage du proxy IA. Compteurs dans Upstash Redis (fenêtres fixes).
   Trois plafonds, exprimés en "unités" : un appel léger vaut 1, un appel Sonnet long (push) vaut 5.
   - par personne et par heure, par personne et par jour, global par jour (UTC).
   Les adresses IP sont hachées avant d'être stockées. */
import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

const int = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : d; };

export const limitsFromEnv = (env = process.env) => ({
  ipHour:    int(env.LIMIT_IP_HOUR, 25),
  ipDay:     int(env.LIMIT_IP_DAY, 50),
  globalDay: int(env.LIMIT_GLOBAL_DAY, 400),
});

/* Un push (Sonnet, sortie longue) coûte 5 fois plus qu'un appel léger. */
export const unitsFor = ({ model, max_tokens }) => (model.includes("sonnet") && max_tokens >= 1000 ? 5 : 1);

export const getRedis = (env = process.env) => {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
};

const secondsToUtcMidnight = (now) => {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(60, Math.ceil((next - now.getTime()) / 1000));
};

export function createLimiter(redis, limits, now = () => new Date()) {
  return async function check({ ip, units }) {
    const t = now();
    const who = createHash("sha256").update(`fpo:${ip || "inconnue"}`).digest("hex").slice(0, 24);
    const day = t.toISOString().slice(0, 10);
    const rules = [
      { scope: "ip-hour", key: `fpo:ip:h:${who}`, ttl: 3600, limit: limits.ipHour },
      { scope: "ip-day", key: `fpo:ip:d:${who}`, ttl: 86400, limit: limits.ipDay },
      { scope: "global", key: `fpo:g:d:${day}`, ttl: 172800, limit: limits.globalDay },
    ];
    const counted = await Promise.all(rules.map(async (r) => {
      const [count] = await redis.pipeline().incrby(r.key, units).expire(r.key, r.ttl, "NX").exec();
      return { ...r, count: Number(count) };
    }));
    const over = counted.find((r) => r.count > r.limit);
    if (!over) return { ok: true };
    // Un appel refusé ne consomme pas de quota.
    await Promise.all(counted.map((r) => redis.decrby(r.key, units)));
    const retryAfter = over.scope === "global" ? secondsToUtcMidnight(t) : Math.max(60, Number(await redis.ttl(over.key)) || over.ttl);
    return { ok: false, scope: over.scope, retryAfter };
  };
}

export const limitMessage = ({ scope, retryAfter }) => {
  const min = Math.ceil(retryAfter / 60);
  if (scope === "ip-hour") return `Trop d'appels IA en peu de temps. Réessaie dans ${min} min.`;
  if (scope === "ip-day") return "Tu as atteint ta limite quotidienne d'appels IA. Reviens demain, ou explore la démo.";
  return "La démo a atteint sa limite quotidienne d'appels IA. Reviens demain, ou explore la démo.";
};
