/* Proxy serveur vers l'API Anthropic.
   La clé (ANTHROPIC_API_KEY) reste côté serveur : elle n'est jamais envoyée au navigateur.
   Garde-fous : même origine uniquement, modèles autorisés, tailles plafonnées,
   quotas par personne et par jour (Upstash Redis, voir _ratelimit.js). */
import { createLimiter, getRedis, limitMessage, limitsFromEnv, unitsFor } from "./_ratelimit.js";

const ALLOWED_MODELS = new Set(["claude-haiku-4-5-20251001", "claude-sonnet-4-6"]);
const MAX_TOKENS_CAP = 4096;
const MAX_INPUT_CHARS = 20000;

export const config = { maxDuration: 60 };

const fail = (res, status, message) => res.status(status).json({ error: { message } });

const clientIp = (req) => req.headers["x-real-ip"] || String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "";

/* Les dépendances sont injectables pour les tests ; la fonction exportée par défaut utilise l'environnement. */
export const makeHandler = ({ env = process.env, getLimiter = () => { const r = getRedis(env); return r ? createLimiter(r, limitsFromEnv(env)) : null; }, doFetch = (...a) => fetch(...a) } = {}) =>
  async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "Méthode non autorisée.");

  // Même origine uniquement : bloque l'usage depuis un autre site dans un navigateur.
  const origin = req.headers.origin;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  let originHost = "";
  try { originHost = origin ? new URL(origin).host : ""; } catch { /* origine invalide */ }
  if (!originHost || originHost !== host) return fail(res, 403, "Origine non autorisée.");

  const body = req.body && typeof req.body === "object" ? req.body : null;
  if (!body) return fail(res, 400, "Corps de requête invalide.");
  const { model, max_tokens, system, messages, temperature } = body;

  if (!ALLOWED_MODELS.has(model)) return fail(res, 400, "Modèle non autorisé.");
  if (!Number.isInteger(max_tokens) || max_tokens < 1 || max_tokens > MAX_TOKENS_CAP) return fail(res, 400, `max_tokens doit être entre 1 et ${MAX_TOKENS_CAP}.`);
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) return fail(res, 400, "Messages invalides.");
  if (system !== undefined && typeof system !== "string") return fail(res, 400, "Prompt système invalide.");
  const size = JSON.stringify(messages).length + (system ? system.length : 0);
  if (size > MAX_INPUT_CHARS) return fail(res, 413, "Requête trop volumineuse.");

  const key = env.ANTHROPIC_API_KEY;
  if (!key) return fail(res, 500, "Service IA non configuré : variable ANTHROPIC_API_KEY manquante côté serveur.");

  // Quotas. Sans compteur disponible, on refuse (fail closed) plutôt que de laisser la porte ouverte.
  const limiter = getLimiter();
  if (!limiter) return fail(res, 503, "Service IA indisponible : limites d'usage non configurées (Upstash Redis).");
  try {
    const verdict = await limiter({ ip: clientIp(req), units: unitsFor({ model, max_tokens }) });
    if (!verdict.ok) {
      res.setHeader("retry-after", String(verdict.retryAfter));
      return fail(res, 429, limitMessage(verdict));
    }
  } catch {
    return fail(res, 503, "Service IA indisponible : vérification des limites impossible. Réessaie dans un instant.");
  }

  try {
    const upstream = await doFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens, messages, ...(system ? { system } : {}), ...(typeof temperature === "number" ? { temperature } : {}) }),
    });
    const text = await upstream.text();
    // Une clé rejetée en amont ne doit pas être présentée comme une erreur du navigateur.
    if (upstream.status === 401 || upstream.status === 403) return fail(res, 502, "Clé API serveur refusée par Anthropic : à renouveler dans les variables Vercel.");
    res.status(upstream.status).setHeader("content-type", "application/json").send(text);
  } catch {
    return fail(res, 502, "Service IA injoignable. Réessaie dans un instant.");
  }
}

export default makeHandler();
