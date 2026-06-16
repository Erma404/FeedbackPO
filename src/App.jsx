import { useState } from "react";
import {
  Zap, Clock, Settings2, Copy, Download,
  Loader2, CheckCheck, AlertCircle, Sparkles,
  ListChecks, HelpCircle, BookOpen, ArrowRight,
  RefreshCw, ChevronRight, BarChart2, Plus
} from "lucide-react";

/* ─── SYSTEM PROMPT ─────────────────────────────────────────── */
const SYSTEM_PROMPT = `Tu es un expert Product Owner senior. Tu transformes des feedbacks bruts en éléments de backlog structurés.

IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans texte avant/après, sans backticks markdown.

Format JSON exact:
{
  "items": [
    {
      "id": "item-1",
      "type": "Epic | Feature | User Story",
      "titre": "En tant que [persona], je veux [action] afin de [bénéfice]",
      "contexte": "Problème sous-jacent en 1-2 phrases",
      "criteres_acceptation": ["CA1", "CA2", "CA3"],
      "priorite": {
        "framework": "MoSCoW | RICE | Valeur-Effort",
        "valeur": "Must Have | Should Have | Could Have | Won't Have (MoSCoW) — ou score 1-100 (RICE) — ou Haute | Moyenne | Faible (Valeur-Effort)",
        "justification": "Justification en une phrase"
      },
      "module_suggere": "Nom du module ou composant",
      "questions_clarification": ["Question 1 ?", "Question 2 ?"],
      "ambigu": false
    }
  ]
}

Règles:
- Génère 1 à 4 items selon la richesse du feedback
- Ne jamais inventer de fonctionnalités non mentionnées
- 2 à 4 critères d'acceptation minimum
- Toujours exactement 2 questions de clarification
- Si feedback trop vague: ambigu true`;

/* ─── CONFIG ─────────────────────────────────────────────────── */
const TYPE_CFG = {
  Epic:         { bg: "#FFF4ED", color: "#C2410C", dot: "#F97316", badge: "#FEDDCC" },
  Feature:      { bg: "#F0FDF4", color: "#15803D", dot: "#22C55E", badge: "#BBF7D0" },
  "User Story": { bg: "#EEF2FF", color: "#4338CA", dot: "#6366F1", badge: "#C7D2FE" },
};

const PRIO_CFG = {
  "Must Have":   { bg: "#FEF2F2", color: "#DC2626" },
  "Should Have": { bg: "#FFF7ED", color: "#C2410C" },
  "Could Have":  { bg: "#FEFCE8", color: "#A16207" },
  "Won't Have":  { bg: "#F9FAFB", color: "#6B7280" },
  "Haute":       { bg: "#FEF2F2", color: "#DC2626" },
  "Moyenne":     { bg: "#FFF7ED", color: "#C2410C" },
  "Faible":      { bg: "#F0FDF4", color: "#15803D" },
};

/* ─── SUB-COMPONENTS ─────────────────────────────────────────── */
function TypeBadge({ type }) {
  const c = TYPE_CFG[type] || TYPE_CFG["User Story"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      backgroundColor: c.bg, color: c.color,
      borderRadius: 6, padding: "3px 9px", fontSize: 12, fontWeight: 600,
      border: `1px solid ${c.badge}`
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: c.dot }} />
      {type}
    </span>
  );
}

function Card({ item, onCopy, copied }) {
  const [expanded, setExpanded] = useState(false);
  const isNum = !isNaN(parseInt(item.priorite?.valeur));
  const pc = isNum
    ? { bg: "#EEF2FF", color: "#4338CA" }
    : (PRIO_CFG[item.priorite?.valeur] || { bg: "#F3F4F6", color: "#6B7280" });

  return (
    <div style={{
      backgroundColor: "#FFF", borderRadius: 12, padding: "14px 16px",
      boxShadow: "0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)",
      border: "1px solid #F0F0F5", marginBottom: 10,
      transition: "box-shadow .15s"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 9 }}>
        <TypeBadge type={item.type} />
        <button onClick={() => onCopy(item)} style={{
          display: "flex", alignItems: "center", gap: 4, padding: "3px 8px",
          backgroundColor: copied ? "#F0FDF4" : "#F9FAFB",
          color: copied ? "#16A34A" : "#6B7280",
          border: `1px solid ${copied ? "#BBF7D0" : "#E5E7EB"}`,
          borderRadius: 6, fontSize: 11, cursor: "pointer", transition: "all .15s",
          fontFamily: "inherit"
        }}>
          {copied ? <CheckCheck size={11} /> : <Copy size={11} />}
          {copied ? "Copié !" : "Copier"}
        </button>
      </div>

      {/* Title */}
      <h3 style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 5px", lineHeight: 1.45 }}>
        {item.titre}
      </h3>

      {/* Context */}
      <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 10px", lineHeight: 1.5 }}>
        {item.contexte}
      </p>

      {/* Criteria bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <ListChecks size={12} color="#9CA3AF" />
            <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Critères d'acceptation</span>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, color: "#6366F1",
            backgroundColor: "#EEF2FF", borderRadius: 4, padding: "0 5px"
          }}>
            {item.criteres_acceptation?.length || 0}/{item.criteres_acceptation?.length || 0}
          </span>
        </div>
        <div style={{ height: 3, backgroundColor: "#EEF2FF", borderRadius: 99 }}>
          <div style={{ height: "100%", width: "100%", backgroundColor: "#6366F1", borderRadius: 99 }} />
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ backgroundColor: "#F9FAFB", borderRadius: 8, padding: "9px 11px", marginBottom: 10 }}>
          {item.criteres_acceptation?.map((ca, i) => (
            <div key={i} style={{ display: "flex", gap: 7, marginBottom: i < (item.criteres_acceptation.length - 1) ? 5 : 0 }}>
              <span style={{ color: "#22C55E", fontSize: 12, flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.4 }}>{ca}</span>
            </div>
          ))}
          {item.questions_clarification?.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed #E5E7EB" }}>
              {item.questions_clarification.map((q, i) => (
                <div key={i} style={{ display: "flex", gap: 7, marginBottom: i < item.questions_clarification.length - 1 ? 4 : 0 }}>
                  <span style={{ color: "#6366F1", fontSize: 12, flexShrink: 0, fontWeight: 700 }}>?</span>
                  <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.4 }}>{q}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 5,
            backgroundColor: pc.bg, color: pc.color
          }}>
            {isNum ? `RICE: ${item.priorite?.valeur}` : item.priorite?.valeur}
          </span>
          {item.module_suggere && (
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>· {item.module_suggere}</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {item.questions_clarification?.length > 0 && (
            <span style={{ fontSize: 11, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 3 }}>
              <HelpCircle size={11} />
              {item.questions_clarification.length}
            </span>
          )}
          <button onClick={() => setExpanded(!expanded)} style={{
            fontSize: 11, color: "#6366F1", background: "none", border: "none",
            cursor: "pointer", fontWeight: 500, fontFamily: "inherit", padding: 0
          }}>
            {expanded ? "Réduire ↑" : "Détails ↓"}
          </button>
        </div>
      </div>

      {/* Ambiguous warning */}
      {item.ambigu && (
        <div style={{
          marginTop: 9, padding: "6px 10px", borderRadius: 7,
          backgroundColor: "#FFFBEB", border: "1px solid #FDE68A",
          display: "flex", gap: 6, alignItems: "flex-start"
        }}>
          <AlertCircle size={12} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11, color: "#92400E", lineHeight: 1.4 }}>
            Feedback ambigu — clarifier avec le stakeholder avant de mettre en backlog
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── MAIN APP ───────────────────────────────────────────────── */
export default function App() {
  const [activeNav, setActiveNav] = useState("analyser");
  const [feedback, setFeedback]   = useState("");
  const [outputType, setOutputType] = useState("auto");
  const [framework, setFramework]   = useState("MoSCoW");
  const [results, setResults]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [copiedId, setCopiedId]     = useState(null);

  /* API call */
  const handleGenerate = async () => {
    if (!feedback.trim() || loading) return;
    setLoading(true); setError(""); setResults(null);

    const typeInstruction = outputType === "auto"
      ? "Détecte automatiquement le niveau (Epic/Feature/User Story). Tu peux mixer les types si le feedback couvre plusieurs granularités."
      : `Tous les items doivent être de type "${outputType}".`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{
            role: "user",
            content: `Framework de priorisation: ${framework}\n${typeInstruction}\n\nFeedback:\n${feedback}`
          }]
        })
      });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const txt  = (data.content?.[0]?.text || "")
        .replace(/```json\n?|```\n?/g, "").trim();
      const parsed = JSON.parse(txt);
      setResults(parsed.items || []);
    } catch {
      setError("Erreur lors de la génération. Ajoute plus de contexte et réessaie.");
    } finally {
      setLoading(false);
    }
  };

  /* Markdown helpers */
  const toMd = (item) =>
    `## [${item.type}] ${item.titre}\n\n**Contexte:** ${item.contexte}\n\n**Critères d'acceptation:**\n${
      item.criteres_acceptation?.map(c => `- [ ] ${c}`).join("\n") || ""
    }\n\n**Priorité (${item.priorite?.framework}):** ${item.priorite?.valeur}\n> ${item.priorite?.justification}\n\n**Module:** ${
      item.module_suggere || "À définir"
    }\n\n**Questions de clarification:**\n${
      item.questions_clarification?.map(q => `- ${q}`).join("\n") || ""
    }`;

  const handleCopy = (item) => {
    navigator.clipboard.writeText(toMd(item));
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = () => {
    if (!results?.length) return;
    const blob = new Blob([results.map(toMd).join("\n\n---\n\n")], { type: "text/markdown" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob), download: "backlog.md"
    });
    a.click();
  };

  /* Group by type for kanban */
  const TYPES = ["Epic", "Feature", "User Story"];
  const grouped = results
    ? Object.fromEntries(TYPES.map(t => [t, results.filter(i => i.type === t)]))
    : {};
  const cols = TYPES.filter(t => grouped[t]?.length > 0);

  const NAV = [
    { id: "analyser",   label: "Analyser",    Icon: Sparkles                    },
    { id: "historique", label: "Historique",   Icon: Clock,     disabled: true  },
    { id: "rapport",    label: "Rapport",      Icon: BarChart2, disabled: true  },
    { id: "settings",   label: "Paramètres",   Icon: Settings2, disabled: true  },
  ];

  /* ── render ── */
  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      backgroundColor: "#EEEEF8",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    }}>
      <style>{`
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        textarea:focus { outline: none; }
        button:active  { transform: scale(.98); }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 99px; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 248, flexShrink: 0,
        backgroundColor: "#FFF", borderRight: "1px solid #EAEAEF",
        display: "flex", flexDirection: "column", padding: "18px 12px",
        overflow: "hidden"
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "2px 8px", marginBottom: 28 }}>
          <div style={{
            width: 34, height: 34,
            background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
            borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(99,102,241,.28)"
          }}>
            <Zap size={17} color="#fff" fill="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", letterSpacing: "-.01em" }}>
              FeedbackPO
            </div>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 500 }}>Feedback → Backlog</div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "#CBD5E1",
            letterSpacing: ".07em", textTransform: "uppercase",
            padding: "0 10px", marginBottom: 7
          }}>Main</div>
          {NAV.map(({ id, label, Icon, disabled }) => (
            <div
              key={id}
              onClick={() => !disabled && setActiveNav(id)}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "8px 10px", borderRadius: 8, marginBottom: 1,
                cursor: disabled ? "default" : "pointer",
                backgroundColor: !disabled && activeNav === id ? "#EEF2FF" : "transparent",
                color: disabled ? "#D1D5DB" : activeNav === id ? "#6366F1" : "#6B7280",
                transition: "background .12s, color .12s"
              }}
            >
              <Icon size={15} />
              <span style={{ fontSize: 13.5, fontWeight: activeNav === id ? 600 : 400 }}>{label}</span>
              {disabled && (
                <span style={{
                  marginLeft: "auto", fontSize: 9, color: "#CBD5E1",
                  backgroundColor: "#F3F4F6", borderRadius: 3,
                  padding: "1px 5px", fontWeight: 600, letterSpacing: ".03em"
                }}>soon</span>
              )}
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Tip card */}
        <div style={{ backgroundColor: "#EEF2FF", borderRadius: 11, padding: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
            <BookOpen size={12} color="#6366F1" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6366F1" }}>Tip du PO</span>
          </div>
          <p style={{ fontSize: 11.5, color: "#4338CA", lineHeight: 1.58, margin: 0 }}>
            Plus le feedback est contextualisé (qui, quand, impact business), meilleures seront les User Stories générées.
          </p>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Header */}
        <div style={{
          backgroundColor: "#FFF", borderBottom: "1px solid #EAEAEF",
          padding: "13px 26px", display: "flex", alignItems: "center",
          justifyContent: "space-between", flexShrink: 0
        }}>
          <div>
            <div style={{
              fontSize: 11.5, color: "#9CA3AF", marginBottom: 3,
              display: "flex", alignItems: "center", gap: 3
            }}>
              <span>FeedbackPO</span>
              <ChevronRight size={11} />
              <span>Analyser</span>
            </div>
            <h1 style={{
              fontSize: 20, fontWeight: 700, color: "#111827",
              margin: 0, letterSpacing: "-.02em",
              display: "flex", alignItems: "center", gap: 8
            }}>
              Feedback Analyzer
              {results && (
                <span style={{
                  fontSize: 13, fontWeight: 500, color: "#6366F1",
                  backgroundColor: "#EEF2FF", borderRadius: 20, padding: "1px 10px"
                }}>
                  {results.length} item{results.length > 1 ? "s" : ""}
                </span>
              )}
            </h1>
          </div>

          {results && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { setResults(null); setFeedback(""); setError(""); }}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  backgroundColor: "#F9FAFB", color: "#6B7280",
                  border: "1px solid #E5E7EB", borderRadius: 7,
                  padding: "6px 13px", fontSize: 12.5, fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit"
                }}
              >
                <RefreshCw size={12} /> Nouveau
              </button>
              <button
                onClick={handleExport}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  backgroundColor: "#6366F1", color: "#FFF", border: "none",
                  borderRadius: 7, padding: "6px 15px", fontSize: 12.5,
                  fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  boxShadow: "0 1px 6px rgba(99,102,241,.3)"
                }}
              >
                <Download size={12} /> Exporter Markdown
              </button>
            </div>
          )}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflow: "auto", padding: "22px 26px" }}>

          {/* ── INPUT STATE ── */}
          {!results ? (
            <div style={{ maxWidth: 720, margin: "0 auto" }}>

              {/* Textarea card */}
              <div style={{
                background: "#FFF", borderRadius: 13, padding: 22,
                border: "1px solid #EAEAEF",
                boxShadow: "0 1px 4px rgba(0,0,0,.04)", marginBottom: 14
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                  <Sparkles size={15} color="#6366F1" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                    Colle ton feedback brut
                  </span>
                </div>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder={`Ex : « José m'a dit en réunion que son équipe perd 2h par jour à ressaisir manuellement les données de ventes dans Excel. Ils voudraient pouvoir exporter directement depuis l'app en format compatible avec leur outil de reporting. C'est bloquant pour leur adoption. »`}
                  style={{
                    width: "100%", minHeight: 160,
                    border: "1.5px solid #E5E7EB", borderRadius: 9,
                    padding: 13, fontSize: 13.5, color: "#374151",
                    lineHeight: 1.65, resize: "vertical", boxSizing: "border-box",
                    fontFamily: "inherit", backgroundColor: "#FAFAFA",
                    transition: "border-color .15s"
                  }}
                  onFocus={e => (e.target.style.borderColor = "#6366F1")}
                  onBlur={e  => (e.target.style.borderColor = "#E5E7EB")}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 5 }}>
                  <span style={{
                    fontSize: 11.5,
                    color: feedback.length > 0 && feedback.length < 60 ? "#F59E0B" : "#D1D5DB"
                  }}>
                    {feedback.length} car.{feedback.length > 0 && feedback.length < 60 ? " — ajoute plus de contexte" : ""}
                  </span>
                </div>
              </div>

              {/* Options grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>

                {/* Type */}
                <div style={{ background: "#FFF", borderRadius: 11, padding: 16, border: "1px solid #EAEAEF" }}>
                  <div style={{
                    fontSize: 10.5, fontWeight: 700, color: "#9CA3AF",
                    letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 10
                  }}>
                    Type de sortie
                  </div>
                  {[
                    { v: "auto",         label: "🎯 Auto-detect", sub: "Recommandé"     },
                    { v: "Epic",         label: "🔷 Epic",         sub: "Vision large"   },
                    { v: "Feature",      label: "🔹 Feature",      sub: "Fonctionnalité" },
                    { v: "User Story",   label: "📋 User Story",   sub: "Cas d'usage"   },
                  ].map(({ v, label, sub }) => (
                    <label key={v} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 0", cursor: "pointer" }}>
                      <input
                        type="radio" name="type" checked={outputType === v}
                        onChange={() => setOutputType(v)}
                        style={{ accentColor: "#6366F1" }}
                      />
                      <span style={{ fontSize: 12.5, color: "#374151", fontWeight: outputType === v ? 600 : 400 }}>
                        {label}
                      </span>
                      <span style={{ marginLeft: "auto", fontSize: 10.5, color: "#C9CDD8" }}>{sub}</span>
                    </label>
                  ))}
                </div>

                {/* Framework */}
                <div style={{ background: "#FFF", borderRadius: 11, padding: 16, border: "1px solid #EAEAEF" }}>
                  <div style={{
                    fontSize: 10.5, fontWeight: 700, color: "#9CA3AF",
                    letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 10
                  }}>
                    Priorisation
                  </div>
                  {[
                    { v: "MoSCoW",        label: "🎯 MoSCoW",       sub: "Must/Should/Could/Won't" },
                    { v: "RICE",          label: "📊 RICE",          sub: "Score composite"         },
                    { v: "Valeur-Effort", label: "⚖️ Valeur/Effort", sub: "Impact vs complexité"    },
                  ].map(({ v, label, sub }) => (
                    <label key={v} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 0", cursor: "pointer" }}>
                      <input
                        type="radio" name="fw" checked={framework === v}
                        onChange={() => setFramework(v)}
                        style={{ accentColor: "#6366F1" }}
                      />
                      <span style={{ fontSize: 12.5, color: "#374151", fontWeight: framework === v ? 600 : 400 }}>
                        {label}
                      </span>
                      <span style={{ marginLeft: "auto", fontSize: 10.5, color: "#C9CDD8" }}>{sub}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  display: "flex", gap: 7, alignItems: "center",
                  background: "#FEF2F2", border: "1px solid #FECACA",
                  borderRadius: 8, padding: "9px 12px", marginBottom: 12
                }}>
                  <AlertCircle size={13} color="#DC2626" />
                  <span style={{ fontSize: 12.5, color: "#DC2626" }}>{error}</span>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={handleGenerate}
                disabled={loading || feedback.trim().length < 10}
                style={{
                  width: "100%", padding: "12px 0", border: "none", borderRadius: 10,
                  backgroundColor: loading || feedback.trim().length < 10 ? "#C7D2FE" : "#6366F1",
                  color: "#FFF", fontSize: 14, fontWeight: 600,
                  cursor: loading || feedback.trim().length < 10 ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  boxShadow: loading || feedback.trim().length < 10 ? "none" : "0 2px 10px rgba(99,102,241,.35)",
                  transition: "all .2s", fontFamily: "inherit"
                }}
              >
                {loading
                  ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Structuration en cours…</>
                  : <><ArrowRight size={15} /> Transformer en backlog</>
                }
              </button>
            </div>

          ) : (
            /* ── RESULTS STATE — KANBAN ── */
            <div>
              {/* Kanban columns */}
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                {cols.map(type => {
                  const cfg   = TYPE_CFG[type] || TYPE_CFG["User Story"];
                  const items = grouped[type];
                  return (
                    <div key={type} style={{ flex: 1, minWidth: 0 }}>
                      {/* Column header */}
                      <div style={{
                        display: "flex", alignItems: "center", gap: 8,
                        marginBottom: 12, padding: "0 2px"
                      }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{type}</span>
                        <span style={{
                          backgroundColor: cfg.badge, color: cfg.color,
                          borderRadius: 20, fontSize: 11, fontWeight: 700, padding: "1px 8px"
                        }}>
                          {items.length}
                        </span>
                        <div style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
                        <div style={{
                          width: 22, height: 22, borderRadius: 6, border: "1.5px dashed #D1D5DB",
                          display: "flex", alignItems: "center", justifyContent: "center", cursor: "default"
                        }}>
                          <Plus size={12} color="#D1D5DB" />
                        </div>
                      </div>
                      {/* Cards */}
                      {items.map(item => (
                        <Card
                          key={item.id} item={item}
                          onCopy={handleCopy}
                          copied={copiedId === item.id}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Questions panel */}
              {results.some(i => i.questions_clarification?.length > 0) && (
                <div style={{
                  marginTop: 18, background: "#FFF",
                  borderRadius: 12, padding: 18, border: "1px solid #EAEAEF"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                    <HelpCircle size={14} color="#6366F1" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                      Questions à poser au stakeholder
                    </span>
                    <span style={{
                      fontSize: 11, color: "#6366F1", backgroundColor: "#EEF2FF",
                      borderRadius: 20, padding: "1px 8px", fontWeight: 600
                    }}>
                      {results.reduce((acc, i) => acc + (i.questions_clarification?.length || 0), 0)}
                    </span>
                  </div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: 8
                  }}>
                    {results.flatMap((item, i) =>
                      (item.questions_clarification || []).map((q, j) => (
                        <div key={`${i}-${j}`} style={{
                          display: "flex", gap: 8, backgroundColor: "#F8F9FF",
                          borderRadius: 8, padding: "8px 11px", border: "1px solid #EEF2FF"
                        }}>
                          <span style={{
                            color: "#6366F1", fontSize: 12,
                            flexShrink: 0, fontWeight: 700, marginTop: 1
                          }}>
                            {i + 1}.{j + 1}
                          </span>
                          <span style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.4 }}>{q}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
