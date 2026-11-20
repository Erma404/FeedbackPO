import { Sparkles, Loader2, AlertCircle, MessageSquareQuote, CheckCircle2, ListChecks, ArrowRight, ClipboardPaste, Layers, Rocket } from "lucide-react";
import { Button, Card, Eyebrow, Pill, Ring, Segmented } from "../ds/primitives.jsx";
import { useIsMobile } from "../ds/useIsMobile.js";

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
const todayLabel = () => new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

function HeroCard({ icon: Icon, title, sub, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className="ds-glass" onClick={onClick} style={{ minWidth: 0 }}>
      <span className="ds-glass__icon"><Icon size={20} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{title}</span>
        <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 13, color: "rgba(255,255,255,.74)", marginTop: 3, lineHeight: 1.4 }}>{sub}</span>
      </span>
      {onClick && <ArrowRight size={16} style={{ opacity: .7, flexShrink: 0 }} />}
    </Tag>
  );
}

export default function AnalyserView({
  feedback, setFeedback, source, setSource, sources, loading, error, onAnalyze,
  themes, inbox, backlog, statusCfg, onNavigate, onLoadDemo,
}) {
  const isMobile = useIsMobile(900);
  const open    = themes.filter(t => t.status !== "pousse-backlog");
  const ready   = themes.filter(t => t.status === "valide");
  const pushed  = themes.length - open.length;
  const toClarify = backlog.filter(i => i.status === "a-clarifier").length;
  const pct     = themes.length ? Math.round((pushed / themes.length) * 100) : 0;
  const canSend = feedback.trim().length >= 10 && !loading;
  const empty   = themes.length === 0;

  const lead   = empty ? "Rien à trier pour l'instant." : `${plural(open.length, "thème en cours", "thèmes en cours")}.`;
  const strong = empty ? "Colle un premier feedback."
    : ready.length ? `${ready.length} ${ready.length > 1 ? "prêts" : "prêt"} pour le backlog.` : "Aucun prêt à pousser pour l'instant.";

  const actions = [];
  if (inbox[0]) actions.push({ icon: MessageSquareQuote, title: "Dernier feedback", sub: `${inbox[0].source || "Autre"} · ${inbox[0].apercu || inbox[0].texte}`, go: "themes" });
  if (ready[0]) actions.push({ icon: CheckCircle2, title: ready[0].titre, sub: "Validé, prêt à pousser au backlog", go: "themes" });
  if (toClarify) actions.push({ icon: ListChecks, title: `${plural(toClarify, "item à clarifier", "items à clarifier")}`, sub: "Questions à reprendre avec le stakeholder", go: "board" });

  const steps = [
    { icon: ClipboardPaste, title: "1 · Colle un feedback", sub: "Compte-rendu, mail, note vocale transcrite" },
    { icon: Layers,         title: "2 · Il rejoint un thème", sub: "Les pain points récurrents sont regroupés" },
    { icon: Rocket,         title: "3 · Pousse au backlog", sub: "Epics, Features et User Stories à relire" },
  ];

  const themeRows = [...open].sort((a, b) => (b.status === "valide") - (a.status === "valide") || new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 4);
  const recents = inbox.slice(0, 3);
  const themeById = Object.fromEntries(themes.map(t => [t.id, t]));
  const pad = isMobile ? 20 : 40;

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: `${isMobile ? 24 : 40}px ${pad}px 48px` }}>

        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <div>
            <Eyebrow>{todayLabel()}</Eyebrow>
            <h1 style={{ fontSize: isMobile ? 30 : 40, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--ds-text)", marginTop: 6 }}>Bonjour, Ernestine</h1>
          </div>
          {empty && inbox.length === 0 && <Button variant="secondary" onClick={onLoadDemo}>Explorer avec la démo <ArrowRight size={16} /></Button>}
        </header>

        <section className="ds-hero" style={{ padding: isMobile ? 22 : 32 }} aria-label="Briefing">
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, fontWeight: 500, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.72)" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#F0A0EA,#FBE9A0)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={12} color="#2A1B6B" /></span>
            Briefing du jour
          </div>
          <h2 style={{ fontSize: isMobile ? 26 : 40, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.15, margin: "14px 0 24px", maxWidth: 760 }}>
            <span style={{ opacity: .72 }}>{lead}</span> {strong}
          </h2>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
            {(actions.length ? actions : steps).map(a => <HeroCard key={a.title} icon={a.icon} title={a.title} sub={a.sub} onClick={a.go ? () => onNavigate(a.go) : undefined} />)}
          </div>
        </section>

        <div style={{ display: "grid", gap: 20, marginTop: 20, gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1.55fr) minmax(0,1fr)", alignItems: "start" }}>

          <div style={{ display: "grid", gap: 20, gridTemplateColumns: "minmax(0, 1fr)", minWidth: 0 }}>
          <Card style={{ padding: isMobile ? 20 : 28 }}>
            <div className="ds-card__title">Nouveau feedback</div>
            <div className="ds-card__sub">Colle un compte-rendu, un mail ou une note. Il est rattaché automatiquement à sa thématique.</div>

            <div style={{ margin: "22px 0 14px" }}>
              <Eyebrow style={{ marginBottom: 8 }}>Source</Eyebrow>
              <Segmented label="Source du feedback" options={sources} value={source} onChange={setSource} />
            </div>

            <textarea className="ds-textarea" value={feedback} onChange={e => setFeedback(e.target.value)} aria-label="Feedback brut"
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSend) onAnalyze(); }}
              placeholder={`Ex : "Marc m'a dit en réunion que son équipe perd 2h par jour à ressaisir les données de ventes dans Excel…"`} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: feedback.length > 0 && feedback.length < 60 ? "var(--ds-warning-text)" : "var(--ds-text-secondary)" }}>
                {feedback.length === 0 ? "⌘ + Entrée pour envoyer"
                  : feedback.length < 60 ? `${feedback.length} caractères · plus de détail donne un meilleur thème` : `${feedback.length} caractères`}
              </span>
              <Button size="lg" onClick={onAnalyze} disabled={!canSend} style={isMobile ? { width: "100%" } : undefined}>
                {loading ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Analyse en cours…</> : <><Sparkles size={18} /> Identifier le thème</>}
              </Button>
            </div>

            {error && (
              <div role="alert" style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16, padding: "12px 16px", borderRadius: 14, background: "var(--ds-danger-bg)", color: "var(--ds-danger-text)", fontSize: 14 }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
              </div>
            )}
          </Card>

          {recents.length > 0 && (
            <Card style={{ padding: isMobile ? 20 : 24 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <div className="ds-card__title">Derniers feedbacks classés</div>
                <Button variant="ghost" onClick={() => onNavigate("themes")} style={{ height: 32 }}>Voir les thèmes</Button>
              </div>
              <div style={{ margin: "10px -10px 0", display: "grid", gap: 2, gridTemplateColumns: "minmax(0, 1fr)" }}>
                {recents.map(f => (
                  <button key={f.id} className="ds-row" style={{ alignItems: "flex-start" }} onClick={() => onNavigate("themes")}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 14.5, lineHeight: 1.45, color: "var(--ds-text)" }}>{f.apercu || f.texte}</span>
                      {themeById[f.themeId] && <span style={{ display: "block", fontSize: 13, color: "var(--ds-text-secondary)", marginTop: 4 }}>Thème · {themeById[f.themeId].titre}</span>}
                    </span>
                    <Pill>{f.source || "Autre"}</Pill>
                  </button>
                ))}
              </div>
            </Card>
          )}
          </div>

          <div style={{ display: "grid", gap: 20, gridTemplateColumns: "minmax(0, 1fr)", minWidth: 0 }}>
            <Card style={{ padding: isMobile ? 20 : 24 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <div className="ds-card__title">Thèmes en cours</div>
                {open.length > 0 && <Button variant="ghost" onClick={() => onNavigate("themes")} style={{ height: 32 }}>Tout voir</Button>}
              </div>
              {themeRows.length === 0 ? (
                <p className="ds-card__sub" style={{ marginTop: 10 }}>Aucun thème pour l'instant. Le premier feedback analysé en crée un.</p>
              ) : (
                <div style={{ margin: "10px -10px 0", display: "grid", gap: 2, gridTemplateColumns: "minmax(0, 1fr)" }}>
                  {themeRows.map(t => {
                    const cfg = statusCfg[t.status];
                    return (
                      <button key={t.id} className="ds-row" onClick={() => onNavigate("themes")}>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 15, fontWeight: 600, color: "var(--ds-text)", lineHeight: 1.3 }}>{t.titre}</span>
                          <span style={{ display: "block", fontSize: 13, color: "var(--ds-text-secondary)", marginTop: 2 }}>{plural(t.feedbackIds.length, "feedback", "feedbacks")}</span>
                        </span>
                        <Pill tone={t.status === "valide" ? "success" : undefined} dot>{cfg?.label || t.status}</Pill>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card style={{ padding: isMobile ? 20 : 24 }}>
              <div className="ds-card__title">Avancement</div>
              <div className="ds-card__sub" style={{ marginBottom: 18 }}>Part des thèmes poussés au backlog.</div>
              <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                <Ring value={pct} size={150} stroke={15} caption="poussés" />
                <dl style={{ flex: 1, minWidth: 150, display: "grid", gap: 12, margin: 0 }}>
                  {[["Poussés au backlog", pushed, "#5B3FC9"], ["Validés, prêts", ready.length, "var(--ds-success)"], ["En cours", open.length - ready.length, "#B7A4F7"]].map(([l, n, c]) => (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--ds-text-secondary)" }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />
                      <dt style={{ flex: 1 }}>{l}</dt>
                      <dd style={{ margin: 0, fontWeight: 600, color: "var(--ds-text)" }}>{n}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
