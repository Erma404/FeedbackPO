import { useState } from "react";
import {
  Zap, Clock, Settings2, Copy, Download,
  Loader2, CheckCheck, AlertCircle, Sparkles,
  ListChecks, HelpCircle, BookOpen, ArrowRight,
  RefreshCw, ChevronRight, BarChart2, Plus, ChevronDown,
  TrendingUp, Timer, Repeat2, FileText, Eye, Key,
  Bell, Globe, Sliders, ChevronUp, Calendar, Tag,
  Users, Layers, CheckSquare
} from "lucide-react";

/* ─── DESIGN TOKENS ─────────────────────────────────────────── */
const T = {
  bg:           "#F5F5FA",
  sidebar:      "#FFFFFF",
  card:         "#FFFFFF",
  border:       "#E8E8F0",
  borderSubtle: "#F0F0F8",
  primary:      "#5C5FD4",
  primaryHover: "#4649B8",
  primaryLight: "#EEEEFF",
  primaryMid:   "#C7C8F5",
  text:         "#111827",
  textMuted:    "#6B7280",
  textSubtle:   "#9CA3AF",
  success:      "#16A34A",
  successLight: "#F0FDF4",
  successBorder:"#BBF7D0",
  warning:      "#D97706",
  warningLight: "#FFFBEB",
  warningBorder:"#FDE68A",
  danger:       "#DC2626",
  dangerLight:  "#FEF2F2",
  dangerBorder: "#FECACA",
  orange:       "#EA580C",
  orangeLight:  "#FFF4ED",
  orangeBorder: "#FED7AA",
  radius:       "12px",
  radiusSm:     "8px",
  radiusLg:     "16px",
  shadow:       "0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)",
  shadowMd:     "0 4px 12px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.05)",
  shadowPrimary:"0 4px 14px rgba(92,95,212,.30)",
  transition:   "all 0.15s ease",
};

/* ─── TYPE CONFIG ────────────────────────────────────────────── */
const TYPE_CFG = {
  Epic:         { bg: "#FFF4ED", color: "#C2410C", dot: "#F97316", badge: "#FED7AA" },
  Feature:      { bg: "#F0FDF4", color: "#15803D", dot: "#22C55E", badge: "#BBF7D0" },
  "User Story": { bg: "#EEEEFF", color: "#4338CA", dot: "#6366F1", badge: "#C7C8F5" },
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

/* ─── SYSTEM PROMPT ─────────────────────────────────────────── */
const SYSTEM_PROMPT = `Tu es un expert Product Owner senior. Tu transformes des feedbacks bruts en éléments de backlog structurés.
IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans texte avant/après, sans backticks markdown.
Format JSON exact:
{
  "items": [{
    "id": "item-1",
    "type": "Epic | Feature | User Story",
    "titre": "En tant que [persona], je veux [action] afin de [bénéfice]",
    "contexte": "Problème sous-jacent en 1-2 phrases",
    "criteres_acceptation": ["CA1","CA2","CA3"],
    "priorite": { "framework":"MoSCoW|RICE|Valeur-Effort","valeur":"...","justification":"..." },
    "module_suggere": "...",
    "questions_clarification": ["Q1 ?","Q2 ?"],
    "ambigu": false
  }]
}
Règles: génère 1-4 items, 2-4 critères min, 2 questions exactement, ambigu:true si vague.`;

/* ─── MOCK DATA ─────────────────────────────────────────────── */
const MOCK_KANBAN = [
  {
    id: "d1", type: "Epic",
    titre: "En tant que responsable commercial, je veux centraliser l'export des données de vente afin d'éliminer les ressaisies manuelles",
    contexte: "L'équipe perd 2h/jour à copier des données entre l'app et Excel. Blocage critique pour l'adoption chez le client Kantara (Marc, 50 licences).",
    criteres_acceptation: ["Export CSV et XLSX disponibles depuis le dashboard", "Données filtrables par période, équipe et produit", "Format compatible Power BI et Google Sheets", "Export planifiable automatiquement (hebdo/mensuel)"],
    priorite: { framework: "MoSCoW", valeur: "Must Have", justification: "Bloque l'adoption d'un compte stratégique — risque de churn élevé." },
    module_suggere: "Module Reporting & Export",
    questions_clarification: ["Quels champs spécifiques doivent figurer dans l'export ?", "L'export doit-il inclure les données historiques ou uniquement en temps réel ?"],
    ambigu: false,
  },
  {
    id: "d2", type: "Feature",
    titre: "En tant qu'utilisateur, je veux déclencher un export en un clic depuis le dashboard afin de gagner du temps sur mon reporting",
    contexte: "Aucune option d'export directe aujourd'hui. Les utilisateurs passent par des workarounds (copier-coller, captures d'écran, CSV manuel).",
    criteres_acceptation: ["Bouton 'Exporter' visible sur le dashboard principal", "Formats disponibles : CSV, XLSX, JSON", "Export déclenché en moins de 3 secondes", "Email de confirmation avec lien de téléchargement sécurisé"],
    priorite: { framework: "MoSCoW", valeur: "Must Have", justification: "Fonctionnalité de base manquante identifiée par 3 clients lors des entretiens." },
    module_suggere: "Dashboard Principal",
    questions_clarification: ["Faut-il un historique des exports précédents ?", "L'export doit-il tenir compte des filtres actifs au moment du clic ?"],
    ambigu: false,
  },
  {
    id: "d3", type: "Feature",
    titre: "En tant que manager, je veux recevoir un rapport hebdomadaire automatique par email afin de suivre les KPIs sans me connecter",
    contexte: "Les managers ne se connectent pas régulièrement à l'app. Ils veulent un résumé dans leur boîte mail chaque lundi matin sans action de leur part.",
    criteres_acceptation: ["Email automatique chaque lundi à 8h (fuseau configuré)", "Contient : chiffre clé de la semaine, évolution N-1, top 3 alertes", "Lien direct vers le dashboard complet", "Option de désabonnement en 1 clic"],
    priorite: { framework: "MoSCoW", valeur: "Should Have", justification: "Améliore l'engagement des décideurs sans effort de leur part." },
    module_suggere: "Notifications & Rapports Automatiques",
    questions_clarification: ["Quel est le fuseau horaire de référence pour l'envoi ?", "Les KPIs doivent-ils être personnalisables par manager ?"],
    ambigu: false,
  },
  {
    id: "d4", type: "User Story",
    titre: "En tant qu'utilisateur mobile, je veux consulter mes KPIs depuis mon téléphone afin de suivre l'activité en déplacement",
    contexte: "Les commerciaux terrain n'ont pas accès aux dashboards en mobilité. Ils demandent une vue simplifiée sur smartphone.",
    criteres_acceptation: ["Interface responsive sur iOS et Android", "Chargement en moins de 2 secondes en 4G", "Affichage des 5 KPIs principaux en mode portrait", "Navigation par swipe entre les périodes"],
    priorite: { framework: "MoSCoW", valeur: "Could Have", justification: "Confort d'usage pour les équipes terrain, non bloquant pour la V1." },
    module_suggere: "Application Mobile / PWA",
    questions_clarification: ["Faut-il une app native ou une PWA suffira-t-elle ?", "Quels sont les 5 KPIs prioritaires à afficher en mobile ?"],
    ambigu: false,
  },
  {
    id: "d5", type: "User Story",
    titre: "En tant qu'administrateur, je veux configurer les colonnes d'export par profil afin d'adapter le format aux besoins de chaque équipe",
    contexte: "Finance, sales et ops ont des besoins différents. Un export unique standardisé ne convient pas à tous les départements.",
    criteres_acceptation: ["Interface de sélection des colonnes par profil utilisateur", "Sauvegarde de templates d'export nommés", "Au moins 3 templates prédéfinis fournis (Finance, Sales, Ops)", "Partage d'un template entre plusieurs utilisateurs possible"],
    priorite: { framework: "MoSCoW", valeur: "Could Have", justification: "Valeur ajoutée après validation de l'export basique — roadmap V2." },
    module_suggere: "Administration & Paramètres",
    questions_clarification: ["Y a-t-il des colonnes sensibles à masquer par défaut ?", "Les templates peuvent-ils être partagés entre plusieurs équipes ?"],
    ambigu: false,
  },
];

const MOCK_HISTORY = [
  {
    id: "h1", date: "Aujourd'hui, 14h32", projet: "Kantara",
    apercu: "Marc m'a dit en réunion que son équipe perd 2h par jour à ressaisir les données de ventes dans Excel...",
    items: 5, framework: "MoSCoW", types: ["Epic", "Feature", "User Story"], duree: "8s",
    tags: ["export", "reporting", "adoption"],
  },
  {
    id: "h2", date: "Hier, 09h15", projet: "Nexio",
    apercu: "Retour de la démo client : les élus veulent pouvoir publier des actualités depuis leur mobile sans passer par le back-office...",
    items: 3, framework: "RICE", types: ["Feature", "User Story"], duree: "6s",
    tags: ["mobile", "publication", "accessibilité"],
  },
  {
    id: "h3", date: "13 juin, 16h50", projet: "Pathline",
    apercu: "L'équipe design a remonté que le flow d'onboarding est trop long — les utilisateurs abandonnent à l'étape 3 sur 7...",
    items: 4, framework: "Valeur-Effort", types: ["Feature", "User Story", "User Story"], duree: "11s",
    tags: ["onboarding", "rétention", "UX"],
  },
  {
    id: "h4", date: "12 juin, 11h20", projet: "Kantara",
    apercu: "Le support remonte 12 tickets cette semaine sur la recherche — les utilisateurs ne trouvent pas les contrats archivés...",
    items: 2, framework: "MoSCoW", types: ["Feature", "User Story"], duree: "5s",
    tags: ["recherche", "archives", "support"],
  },
  {
    id: "h5", date: "10 juin, 15h05", projet: "Nexio",
    apercu: "CR de réunion avec la DSI : ils veulent une API publique pour connecter leur GED existante sans migration de données...",
    items: 3, framework: "RICE", types: ["Epic", "Feature"], duree: "9s",
    tags: ["API", "intégration", "DSI"],
  },
  {
    id: "h6", date: "09 juin, 08h45", projet: "Pathline",
    apercu: "Note vocale de Marie-Laure (Sales) : les prospects demandent systématiquement un mode hors-ligne pour les zones blanches...",
    items: 2, framework: "MoSCoW", types: ["Feature", "User Story"], duree: "7s",
    tags: ["offline", "mobile", "prospect"],
  },
];

const RAPPORT_STATS = {
  feedbacks: 23,
  items: 67,
  reutilisation: 71,
  tempsSave: 4.2,
  parType: { Epic: 8, Feature: 24, "User Story": 35 },
  parPrio: { "Must Have": 19, "Should Have": 28, "Could Have": 14, "Won't Have": 6 },
  parProjet: { "Kantara": 28, "Nexio": 21, "Pathline": 18 },
  activite: [3, 5, 2, 7, 4, 6, 3],
  jours: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
};

/* ─── COMPONENTS ─────────────────────────────────────────────── */
function TypeBadge({ type }) {
  const c = TYPE_CFG[type] || TYPE_CFG["User Story"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      backgroundColor: c.bg, color: c.color,
      borderRadius: 6, padding: "3px 9px", fontSize: 11.5, fontWeight: 600,
      border: `1px solid ${c.badge}`, letterSpacing: "0.01em"
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: c.dot, flexShrink: 0 }} />
      {type}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = T.primary, bg = T.primaryLight }) {
  return (
    <div style={{
      backgroundColor: T.card, borderRadius: T.radiusLg, padding: "20px",
      border: `1px solid ${T.border}`, boxShadow: T.shadow,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, backgroundColor: bg,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: "-0.03em", marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: T.textSubtle }}>{sub}</div>
    </div>
  );
}

function PillGroup({ name, options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {options.map(({ v, label, sub }) => (
        <label key={v} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 11px", borderRadius: T.radiusSm,
          cursor: "pointer", transition: T.transition,
          backgroundColor: value === v ? T.primaryLight : "transparent",
          border: `1.5px solid ${value === v ? T.primaryMid : "transparent"}`,
        }}>
          <div style={{
            width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
            border: `2px solid ${value === v ? T.primary : "#D1D5DB"}`,
            backgroundColor: value === v ? T.primary : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: T.transition,
          }}>
            {value === v && <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#fff" }} />}
          </div>
          <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} style={{ display: "none" }} />
          <span style={{ fontSize: 13, color: value === v ? T.primary : T.text, fontWeight: value === v ? 600 : 400, flex: 1 }}>
            {label}
          </span>
          <span style={{ fontSize: 11, color: T.textSubtle, fontWeight: 500 }}>{sub}</span>
        </label>
      ))}
    </div>
  );
}

function KanbanCard({ item, onCopy, copied }) {
  const [expanded, setExpanded] = useState(false);
  const isNum = !isNaN(parseInt(item.priorite?.valeur));
  const pc = isNum
    ? { bg: T.primaryLight, color: T.primary }
    : (PRIO_CFG[item.priorite?.valeur] || { bg: "#F3F4F6", color: "#6B7280" });

  return (
    <div style={{
      backgroundColor: T.card, borderRadius: T.radius, padding: "16px",
      boxShadow: T.shadow, border: `1px solid ${T.border}`,
      marginBottom: 10, transition: "box-shadow 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = T.shadowMd}
      onMouseLeave={e => e.currentTarget.style.boxShadow = T.shadow}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <TypeBadge type={item.type} />
        <button onClick={() => onCopy(item)} style={{
          display: "flex", alignItems: "center", gap: 4, padding: "4px 9px",
          backgroundColor: copied ? T.successLight : "#F9FAFB",
          color: copied ? T.success : T.textMuted,
          border: `1px solid ${copied ? T.successBorder : T.border}`,
          borderRadius: T.radiusSm, fontSize: 11, cursor: "pointer",
          transition: T.transition, fontFamily: "inherit", fontWeight: 500,
        }}>
          {copied ? <CheckCheck size={11} /> : <Copy size={11} />}
          {copied ? "Copié !" : "Copier"}
        </button>
      </div>

      <h3 style={{ fontSize: 13.5, fontWeight: 600, color: T.text, margin: "0 0 5px", lineHeight: 1.5, letterSpacing: "-0.01em" }}>
        {item.titre}
      </h3>
      <p style={{ fontSize: 12.5, color: T.textMuted, margin: "0 0 12px", lineHeight: 1.6 }}>
        {item.contexte}
      </p>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <ListChecks size={12} color={T.textSubtle} />
            <span style={{ fontSize: 11, color: T.textSubtle, fontWeight: 500, letterSpacing: "0.03em" }}>CRITÈRES</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.primary, backgroundColor: T.primaryLight, borderRadius: 4, padding: "0 6px" }}>
            {item.criteres_acceptation?.length || 0}
          </span>
        </div>
        <div style={{ height: 2.5, backgroundColor: T.borderSubtle, borderRadius: 99 }}>
          <div style={{ height: "100%", width: "100%", backgroundColor: T.primary, borderRadius: 99, opacity: 0.7 }} />
        </div>
      </div>

      {expanded && (
        <div style={{ backgroundColor: "#FAFAFA", borderRadius: T.radiusSm, padding: "10px 12px", marginBottom: 12, border: `1px solid ${T.borderSubtle}` }}>
          {item.criteres_acceptation?.map((ca, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: i < item.criteres_acceptation.length - 1 ? 6 : 0 }}>
              <span style={{ color: "#22C55E", fontSize: 12, flexShrink: 0, marginTop: 1 }}>✓</span>
              <span style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.5 }}>{ca}</span>
            </div>
          ))}
          {item.questions_clarification?.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${T.border}` }}>
              <div style={{ fontSize: 11, color: T.textSubtle, fontWeight: 600, letterSpacing: "0.04em", marginBottom: 6 }}>QUESTIONS</div>
              {item.questions_clarification.map((q, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: i < item.questions_clarification.length - 1 ? 5 : 0 }}>
                  <HelpCircle size={12} color={T.primary} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.5 }}>{q}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5, backgroundColor: pc.bg, color: pc.color }}>
            {isNum ? `RICE ${item.priorite?.valeur}` : item.priorite?.valeur}
          </span>
          {item.module_suggere && <span style={{ fontSize: 11, color: T.textSubtle }}>· {item.module_suggere}</span>}
        </div>
        <button onClick={() => setExpanded(!expanded)} style={{
          fontSize: 11, color: T.primary, background: "none", border: "none",
          cursor: "pointer", fontWeight: 600, fontFamily: "inherit", padding: 0,
          display: "flex", alignItems: "center", gap: 3,
        }}>
          {expanded ? "Réduire" : "Détails"}
          <ChevronDown size={11} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        </button>
      </div>
    </div>
  );
}

/* ─── PAGE: ANALYSER ─────────────────────────────────────────── */
function PageAnalyser() {
  const [feedback, setFeedback]     = useState("");
  const [outputType, setOutputType] = useState("auto");
  const [framework, setFramework]   = useState("MoSCoW");
  const [results, setResults]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [copiedId, setCopiedId]     = useState(null);

  const handleGenerate = async () => {
    if (!feedback.trim() || loading) return;
    setLoading(true); setError(""); setResults(null);
    const typeInstruction = outputType === "auto"
      ? "Détecte automatiquement le niveau (Epic/Feature/User Story). Tu peux mixer les types."
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
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: `Framework: ${framework}\n${typeInstruction}\n\nFeedback:\n${feedback}` }]
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error("Clé API invalide ou manquante. Vérifiez votre fichier .env (VITE_ANTHROPIC_API_KEY).");
        if (res.status === 429) throw new Error("Quota API dépassé. Vérifiez votre plan sur console.anthropic.com.");
        throw new Error(`Erreur ${res.status} : ${err?.error?.message || "Contactez le support Anthropic."}`);
      }
      const data = await res.json();
      const txt = (data.content?.[0]?.text || "").replace(/```json\n?|```\n?/g, "").trim();
      setResults(JSON.parse(txt).items || []);
    } catch (e) {
      setError(e.message || "Erreur inattendue. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const toMd = (item) =>
    `## [${item.type}] ${item.titre}\n\n**Contexte:** ${item.contexte}\n\n**Critères d'acceptation:**\n${
      item.criteres_acceptation?.map(c => `- [ ] ${c}`).join("\n") || ""
    }\n\n**Priorité (${item.priorite?.framework}):** ${item.priorite?.valeur}\n> ${item.priorite?.justification}\n\n**Module:** ${
      item.module_suggere || "À définir"
    }\n\n**Questions:**\n${item.questions_clarification?.map(q => `- ${q}`).join("\n") || ""}`;

  const handleCopy = (item) => {
    navigator.clipboard.writeText(toMd(item));
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = () => {
    if (!results?.length) return;
    const blob = new Blob([results.map(toMd).join("\n\n---\n\n")], { type: "text/markdown" });
    Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "backlog.md" }).click();
  };

  const TYPES = ["Epic", "Feature", "User Story"];
  const grouped = results ? Object.fromEntries(TYPES.map(t => [t, results.filter(i => i.type === t)])) : {};
  const cols = TYPES.filter(t => grouped[t]?.length > 0);
  const charCount = feedback.length;
  const charWarning = charCount > 0 && charCount < 60;

  /* Demo mode */
  const loadDemo = () => {
    setFeedback("Marc m'a dit en réunion que son équipe perd 2h par jour à ressaisir les données de ventes dans Excel. Ils voudraient pouvoir exporter directement depuis l'app en format compatible avec leur outil de reporting. C'est bloquant pour leur adoption du produit.");
    setResults(MOCK_KANBAN);
  };

  return (
    <>
      {/* Header */}
      <div style={{
        backgroundColor: T.sidebar, borderBottom: `1px solid ${T.border}`,
        padding: "14px 28px", display: "flex", alignItems: "center",
        justifyContent: "space-between", flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 11.5, color: T.textSubtle, marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
            <span>FeedbackPO</span><ChevronRight size={11} /><span style={{ color: T.textMuted }}>Analyser</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: 0, letterSpacing: "-0.025em", display: "flex", alignItems: "center", gap: 9 }}>
            Feedback Analyzer
            {results && (
              <span style={{ fontSize: 12.5, fontWeight: 600, color: T.primary, backgroundColor: T.primaryLight, borderRadius: 20, padding: "2px 11px" }}>
                {results.length} item{results.length > 1 ? "s" : ""}
              </span>
            )}
          </h1>
        </div>
        {results && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setResults(null); setFeedback(""); setError(""); }} style={{
              display: "flex", alignItems: "center", gap: 6, backgroundColor: "#F9FAFB",
              color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
              padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
            }}>
              <RefreshCw size={13} /> Nouveau
            </button>
            <button onClick={handleExport} style={{
              display: "flex", alignItems: "center", gap: 6, backgroundColor: T.primary,
              color: "#FFF", border: "none", borderRadius: T.radiusSm, padding: "7px 16px",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              boxShadow: T.shadowPrimary,
            }}>
              <Download size={13} /> Exporter Markdown
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "28px" }}>
        {!results ? (
          <div style={{ maxWidth: 700, margin: "0 auto", animation: "fadeIn 0.2s ease" }}>
            {/* Textarea card */}
            <div style={{ background: T.card, borderRadius: T.radiusLg, padding: 24, border: `1px solid ${T.border}`, boxShadow: T.shadow, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Sparkles size={14} color={T.primary} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Colle ton feedback brut</span>
              </div>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder={`Ex : « Marc m'a dit en réunion que son équipe perd 2h par jour à ressaisir les données de ventes dans Excel… »`}
                style={{
                  width: "100%", minHeight: 150, border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm,
                  padding: "13px 15px", fontSize: 13.5, color: "#374151", lineHeight: 1.7,
                  resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", backgroundColor: "#FAFAFA",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onFocus={e => { e.target.style.borderColor = T.primary; e.target.style.boxShadow = `0 0 0 3px rgba(92,95,212,0.12)`; }}
                onBlur={e  => { e.target.style.borderColor = T.border;  e.target.style.boxShadow = "none"; }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <div style={{ height: 2, flex: 1, marginRight: 12, backgroundColor: T.borderSubtle, borderRadius: 99 }}>
                  {charCount > 0 && (
                    <div style={{ height: "100%", width: `${Math.min((charCount / 300) * 100, 100)}%`, backgroundColor: charWarning ? "#F59E0B" : T.primary, borderRadius: 99, transition: "width 0.2s ease" }} />
                  )}
                </div>
                <span style={{ fontSize: 11.5, color: charWarning ? "#F59E0B" : T.textSubtle, fontWeight: 500, whiteSpace: "nowrap" }}>
                  {charCount > 0 ? (charWarning ? "Ajoute plus de contexte" : `${charCount} car.`) : "0 car."}
                </span>
              </div>
            </div>

            {/* Options */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div style={{ background: T.card, borderRadius: T.radiusLg, padding: "18px 16px", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: T.textSubtle, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 12 }}>Type de sortie</div>
                <PillGroup name="type" value={outputType} onChange={setOutputType} options={[
                  { v: "auto",       label: "Auto-detect",  sub: "Recommandé"     },
                  { v: "Epic",       label: "Epic",         sub: "Vision large"   },
                  { v: "Feature",    label: "Feature",      sub: "Fonctionnalité" },
                  { v: "User Story", label: "User Story",   sub: "Cas d'usage"    },
                ]} />
              </div>
              <div style={{ background: T.card, borderRadius: T.radiusLg, padding: "18px 16px", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: T.textSubtle, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 12 }}>Priorisation</div>
                <PillGroup name="fw" value={framework} onChange={setFramework} options={[
                  { v: "MoSCoW",        label: "MoSCoW",        sub: "Must/Should/Could" },
                  { v: "RICE",          label: "RICE",          sub: "Score composite"   },
                  { v: "Valeur-Effort", label: "Valeur/Effort", sub: "Impact vs effort"  },
                ]} />
              </div>
            </div>

            {error && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", background: T.dangerLight, border: `1px solid ${T.dangerBorder}`, borderRadius: T.radiusSm, padding: "10px 14px", marginBottom: 14 }}>
                <AlertCircle size={14} color={T.danger} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: T.danger }}>{error}</span>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading || feedback.trim().length < 10}
              style={{
                width: "100%", padding: "13px 0", border: "none", borderRadius: T.radius,
                backgroundColor: loading || feedback.trim().length < 10 ? "#C7C8F5" : T.primary,
                color: "#FFF", fontSize: 14.5, fontWeight: 600,
                cursor: loading || feedback.trim().length < 10 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: loading || feedback.trim().length < 10 ? "none" : T.shadowPrimary,
                transition: "all 0.2s ease", fontFamily: "inherit",
              }}
            >
              {loading
                ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Structuration en cours…</>
                : <><ArrowRight size={16} /> Transformer en backlog</>
              }
            </button>
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button onClick={loadDemo} style={{
                fontSize: 12.5, color: T.primary, background: "none", border: "none",
                cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                textDecoration: "underline", textDecorationColor: T.primaryMid,
              }}>
                Voir un exemple avec le cas Kantara →
              </button>
            </div>
          </div>
        ) : (
          <div style={{ animation: "fadeIn 0.25s ease" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              {cols.map(type => {
                const cfg = TYPE_CFG[type] || TYPE_CFG["User Story"];
                const items = grouped[type];
                return (
                  <div key={type} style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "0 2px" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: cfg.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: T.text, letterSpacing: "-0.01em" }}>{type}</span>
                      <span style={{ backgroundColor: cfg.badge, color: cfg.color, borderRadius: 20, fontSize: 11, fontWeight: 700, padding: "1px 8px" }}>
                        {items.length}
                      </span>
                      <div style={{ flex: 1, height: 1, backgroundColor: T.border }} />
                      <div style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Plus size={12} color={T.textSubtle} />
                      </div>
                    </div>
                    {items.map(item => (
                      <KanbanCard key={item.id} item={item} onCopy={handleCopy} copied={copiedId === item.id} />
                    ))}
                  </div>
                );
              })}
            </div>
            {results.some(i => i.questions_clarification?.length > 0) && (
              <div style={{ marginTop: 20, background: T.card, borderRadius: T.radiusLg, padding: 20, border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <HelpCircle size={14} color={T.primary} />
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: T.text }}>Questions à poser au stakeholder</span>
                  <span style={{ fontSize: 11.5, color: T.primary, backgroundColor: T.primaryLight, borderRadius: 20, padding: "2px 9px", fontWeight: 700 }}>
                    {results.reduce((acc, i) => acc + (i.questions_clarification?.length || 0), 0)}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
                  {results.flatMap((item, i) =>
                    (item.questions_clarification || []).map((q, j) => (
                      <div key={`${i}-${j}`} style={{ display: "flex", gap: 9, backgroundColor: "#F8F8FE", borderRadius: T.radiusSm, padding: "9px 12px", border: `1px solid ${T.primaryLight}` }}>
                        <span style={{ color: T.primary, fontSize: 12, flexShrink: 0, fontWeight: 700, marginTop: 1 }}>{i + 1}.{j + 1}</span>
                        <span style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.5 }}>{q}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* ─── PAGE: HISTORIQUE ───────────────────────────────────────── */
function PageHistorique() {
  const [selected, setSelected] = useState(null);

  const projectColor = (p) => {
    if (p === "Kantara") return { bg: "#EEF2FF", color: "#4338CA" };
    if (p === "Nexio") return { bg: "#F0FDF4", color: "#15803D" };
    return { bg: "#FFF4ED", color: "#C2410C" };
  };

  return (
    <>
      <div style={{ backgroundColor: T.sidebar, borderBottom: `1px solid ${T.border}`, padding: "14px 28px", flexShrink: 0 }}>
        <div style={{ fontSize: 11.5, color: T.textSubtle, marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
          <span>FeedbackPO</span><ChevronRight size={11} /><span style={{ color: T.textMuted }}>Historique</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: 0, letterSpacing: "-0.025em", display: "flex", alignItems: "center", gap: 9 }}>
            Historique des analyses
            <span style={{ fontSize: 12.5, fontWeight: 600, color: T.textMuted, backgroundColor: "#F3F4F6", borderRadius: 20, padding: "2px 11px" }}>
              {MOCK_HISTORY.length} sessions
            </span>
          </h1>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, animation: "fadeIn 0.2s ease" }}>
          {MOCK_HISTORY.map(h => {
            const pc = projectColor(h.projet);
            const isOpen = selected === h.id;
            return (
              <div key={h.id} style={{
                backgroundColor: T.card, borderRadius: T.radiusLg, padding: "18px 20px",
                border: `1px solid ${isOpen ? T.primaryMid : T.border}`,
                boxShadow: isOpen ? T.shadowMd : T.shadow,
                cursor: "pointer", transition: "all 0.15s",
              }}
                onClick={() => setSelected(isOpen ? null : h.id)}
                onMouseEnter={e => { if (!isOpen) e.currentTarget.style.boxShadow = T.shadowMd; }}
                onMouseLeave={e => { if (!isOpen) e.currentTarget.style.boxShadow = T.shadow; }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 9px", borderRadius: 6, backgroundColor: pc.bg, color: pc.color }}>
                      {h.projet}
                    </span>
                    <span style={{ fontSize: 11.5, color: T.textSubtle, display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={11} /> {h.date}
                    </span>
                  </div>
                  <ChevronDown size={15} color={T.textSubtle} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }} />
                </div>

                {/* Excerpt */}
                <p style={{ fontSize: 13, color: T.text, lineHeight: 1.55, margin: "0 0 12px", fontStyle: "italic" }}>
                  "{h.apercu}"
                </p>

                {/* Stats row */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, backgroundColor: T.primaryLight, borderRadius: 6, padding: "3px 9px" }}>
                    <Layers size={11} color={T.primary} />
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: T.primary }}>{h.items} items</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, backgroundColor: "#F3F4F6", borderRadius: 6, padding: "3px 9px" }}>
                    <Timer size={11} color={T.textMuted} />
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: T.textMuted }}>{h.framework}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, backgroundColor: T.successLight, borderRadius: 6, padding: "3px 9px" }}>
                    <Zap size={11} color={T.success} />
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: T.success }}>{h.duree}</span>
                  </div>
                </div>

                {/* Tags */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {h.tags.map(tag => (
                    <span key={tag} style={{ fontSize: 11, color: T.textSubtle, backgroundColor: "#F5F5FA", borderRadius: 4, padding: "1px 7px", border: `1px solid ${T.border}` }}>
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Expanded: type breakdown */}
                {isOpen && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textSubtle, letterSpacing: "0.05em", marginBottom: 8 }}>ITEMS GÉNÉRÉS</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {h.types.map((t, i) => <TypeBadge key={i} type={t} />)}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button style={{
                        flex: 1, padding: "8px", backgroundColor: T.primaryLight, color: T.primary,
                        border: `1px solid ${T.primaryMid}44`, borderRadius: T.radiusSm,
                        fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      }}>
                        <Eye size={13} /> Voir les items
                      </button>
                      <button style={{
                        flex: 1, padding: "8px", backgroundColor: "#F9FAFB", color: T.textMuted,
                        border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
                        fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      }}>
                        <Download size={13} /> Exporter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ─── PAGE: RAPPORT ──────────────────────────────────────────── */
function PageRapport() {
  const s = RAPPORT_STATS;
  const maxActivite = Math.max(...s.activite);
  const maxProjet = Math.max(...Object.values(s.parProjet));

  return (
    <>
      <div style={{ backgroundColor: T.sidebar, borderBottom: `1px solid ${T.border}`, padding: "14px 28px", flexShrink: 0 }}>
        <div style={{ fontSize: 11.5, color: T.textSubtle, marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
          <span>FeedbackPO</span><ChevronRight size={11} /><span style={{ color: T.textMuted }}>Rapport</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: 0, letterSpacing: "-0.025em" }}>
            Rapport d'activité
          </h1>
          <span style={{ fontSize: 12, color: T.textSubtle, backgroundColor: "#F3F4F6", borderRadius: 6, padding: "4px 10px", fontWeight: 500 }}>
            30 derniers jours
          </span>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "28px" }}>
        <div style={{ animation: "fadeIn 0.2s ease" }}>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
            <StatCard icon={FileText}   label="Feedbacks analysés" value={s.feedbacks}      sub="ce mois-ci"              color={T.primary}  bg={T.primaryLight}    />
            <StatCard icon={Layers}     label="Items générés"      value={s.items}           sub="Epics, Features, US"    color="#15803D"    bg="#F0FDF4"            />
            <StatCard icon={Repeat2}    label="Taux de réutilisation" value={`${s.reutilisation}%`} sub="sans retouche majeure" color="#C2410C" bg="#FFF4ED"        />
            <StatCard icon={Timer}      label="Heures économisées" value={`${s.tempsSave}h`} sub="estimation / semaine"   color="#A16207"    bg="#FEFCE8"            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

            {/* Activité 7 jours */}
            <div style={{ backgroundColor: T.card, borderRadius: T.radiusLg, padding: "20px", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>Activité — 7 derniers jours</div>
              <div style={{ fontSize: 12, color: T.textSubtle, marginBottom: 20 }}>Nombre d'items générés par jour</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 100 }}>
                {s.activite.map((v, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 10.5, color: T.textSubtle, fontWeight: 600 }}>{v}</span>
                    <div style={{
                      width: "100%", borderRadius: "4px 4px 0 0",
                      backgroundColor: i === 3 ? T.primary : T.primaryLight,
                      height: `${(v / maxActivite) * 80}px`, transition: "height 0.3s ease",
                    }} />
                    <span style={{ fontSize: 10, color: T.textSubtle }}>{s.jours[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Répartition par type */}
            <div style={{ backgroundColor: T.card, borderRadius: T.radiusLg, padding: "20px", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>Répartition par type</div>
              <div style={{ fontSize: 12, color: T.textSubtle, marginBottom: 18 }}>Sur {s.items} items générés</div>
              {Object.entries(s.parType).map(([type, count]) => {
                const cfg = TYPE_CFG[type];
                const pct = Math.round((count / s.items) * 100);
                return (
                  <div key={type} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: cfg.dot }} />
                        <span style={{ fontSize: 12.5, color: T.text, fontWeight: 500 }}>{type}</span>
                      </div>
                      <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 600 }}>{count} <span style={{ color: T.textSubtle, fontWeight: 400 }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: 6, backgroundColor: T.borderSubtle, borderRadius: 99 }}>
                      <div style={{ height: "100%", width: `${pct}%`, backgroundColor: cfg.dot, borderRadius: 99, opacity: 0.8 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* Priorités MoSCoW */}
            <div style={{ backgroundColor: T.card, borderRadius: T.radiusLg, padding: "20px", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>Distribution MoSCoW</div>
              <div style={{ fontSize: 12, color: T.textSubtle, marginBottom: 18 }}>Priorité des items générés</div>
              {Object.entries(s.parPrio).map(([label, count]) => {
                const pc = PRIO_CFG[label] || { bg: "#F9FAFB", color: "#6B7280" };
                const total = Object.values(s.parPrio).reduce((a, b) => a + b, 0);
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, padding: "2px 9px", borderRadius: 5, backgroundColor: pc.bg, color: pc.color, minWidth: 96, textAlign: "center" }}>
                      {label}
                    </span>
                    <div style={{ flex: 1, height: 6, backgroundColor: T.borderSubtle, borderRadius: 99 }}>
                      <div style={{ height: "100%", width: `${pct}%`, backgroundColor: pc.color, borderRadius: 99, opacity: 0.5 }} />
                    </div>
                    <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 600, minWidth: 28, textAlign: "right" }}>{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Par projet */}
            <div style={{ backgroundColor: T.card, borderRadius: T.radiusLg, padding: "20px", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>Items par projet</div>
              <div style={{ fontSize: 12, color: T.textSubtle, marginBottom: 18 }}>Répartition sur vos 3 produits</div>
              {Object.entries(s.parProjet).map(([projet, count]) => {
                const pct = Math.round((count / maxProjet) * 100);
                const colors = [T.primary, "#15803D", "#C2410C"];
                const bgs    = [T.primaryLight, "#F0FDF4", "#FFF4ED"];
                const idx    = Object.keys(s.parProjet).indexOf(projet);
                return (
                  <div key={projet} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 12.5, color: T.text, fontWeight: 600 }}>{projet}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: colors[idx], backgroundColor: bgs[idx], borderRadius: 20, padding: "1px 9px" }}>
                        {count} items
                      </span>
                    </div>
                    <div style={{ height: 8, backgroundColor: T.borderSubtle, borderRadius: 99 }}>
                      <div style={{ height: "100%", width: `${pct}%`, backgroundColor: colors[idx], borderRadius: 99, opacity: 0.7 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── PAGE: PARAMÈTRES ───────────────────────────────────────── */
function PageParametres() {
  const [apiKey, setApiKey]       = useState("sk-ant-api03-••••••••••••••••••••••••••••••••••••••••••••••••••••••••••");
  const [showKey, setShowKey]     = useState(false);
  const [model, setModel]         = useState("claude-sonnet-4-6");
  const [defFramework, setDefFramework] = useState("MoSCoW");
  const [defType, setDefType]     = useState("auto");
  const [persona, setPersona]     = useState("PO en mission B2B SaaS, gérant 3 produits simultanément pour des PME françaises.");
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSummary, setNotifSummary] = useState(false);
  const [saved, setSaved]         = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const Toggle = ({ value, onChange }) => (
    <div onClick={() => onChange(!value)} style={{
      width: 38, height: 22, borderRadius: 99,
      backgroundColor: value ? T.primary : "#D1D5DB",
      cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", top: 3, left: value ? 19 : 3,
        width: 16, height: 16, borderRadius: "50%", backgroundColor: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,.2)", transition: "left 0.2s",
      }} />
    </div>
  );

  const Section = ({ icon: Icon, title, children }) => (
    <div style={{ backgroundColor: T.card, borderRadius: T.radiusLg, border: `1px solid ${T.border}`, boxShadow: T.shadow, marginBottom: 16, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.borderSubtle}`, display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={14} color={T.primary} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: "-0.01em" }}>{title}</span>
      </div>
      <div style={{ padding: "18px 20px" }}>{children}</div>
    </div>
  );

  const Field = ({ label, sub, children }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: T.text, marginBottom: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: T.textSubtle }}>{sub}</div>}
      </div>
      {children}
    </div>
  );

  const SelectPill = ({ options, value, onChange }) => (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)} style={{
          padding: "5px 12px", borderRadius: 7, fontSize: 12.5, fontWeight: 500,
          cursor: "pointer", fontFamily: "inherit", transition: T.transition,
          backgroundColor: value === o.v ? T.primary : "#F3F4F6",
          color: value === o.v ? "#fff" : T.textMuted,
          border: `1px solid ${value === o.v ? T.primary : T.border}`,
        }}>
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div style={{ backgroundColor: T.sidebar, borderBottom: `1px solid ${T.border}`, padding: "14px 28px", flexShrink: 0 }}>
        <div style={{ fontSize: 11.5, color: T.textSubtle, marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
          <span>FeedbackPO</span><ChevronRight size={11} /><span style={{ color: T.textMuted }}>Paramètres</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: 0, letterSpacing: "-0.025em" }}>Paramètres</h1>
          <button onClick={handleSave} style={{
            display: "flex", alignItems: "center", gap: 6,
            backgroundColor: saved ? T.success : T.primary, color: "#fff",
            border: "none", borderRadius: T.radiusSm, padding: "7px 16px",
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            boxShadow: T.shadowPrimary, transition: "background 0.2s",
          }}>
            {saved ? <><CheckCheck size={13} /> Sauvegardé</> : <>Sauvegarder les modifications</>}
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "28px", maxWidth: 700, animation: "fadeIn 0.2s ease" }}>

        <Section icon={Key} title="API & Modèle">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: T.textSubtle, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>Clé API Anthropic</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                style={{
                  flex: 1, padding: "9px 12px", border: `1.5px solid ${T.border}`,
                  borderRadius: T.radiusSm, fontSize: 13, fontFamily: "monospace",
                  backgroundColor: "#FAFAFA", color: T.text, outline: "none",
                }}
              />
              <button onClick={() => setShowKey(!showKey)} style={{
                padding: "9px 14px", backgroundColor: "#F3F4F6", color: T.textMuted,
                border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
                fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <Eye size={14} /> {showKey ? "Masquer" : "Afficher"}
              </button>
            </div>
          </div>
          <Field label="Modèle Claude" sub="Recommandé : Sonnet 4.6 pour le meilleur rapport qualité/coût">
            <SelectPill
              value={model}
              onChange={setModel}
              options={[
                { v: "claude-haiku-4-5-20251001", label: "Haiku" },
                { v: "claude-sonnet-4-6",         label: "Sonnet" },
                { v: "claude-opus-4-8",           label: "Opus"   },
              ]}
            />
          </Field>
        </Section>

        <Section icon={Sliders} title="Préférences par défaut">
          <Field label="Framework de priorisation" sub="Utilisé automatiquement si vous ne changez pas la sélection">
            <SelectPill
              value={defFramework}
              onChange={setDefFramework}
              options={[
                { v: "MoSCoW",        label: "MoSCoW"  },
                { v: "RICE",          label: "RICE"    },
                { v: "Valeur-Effort", label: "V/E"     },
              ]}
            />
          </Field>
          <Field label="Type de sortie par défaut" sub="Auto-detect est recommandé pour les feedbacks mixtes">
            <SelectPill
              value={defType}
              onChange={setDefType}
              options={[
                { v: "auto",       label: "Auto"  },
                { v: "Epic",       label: "Epic"  },
                { v: "Feature",    label: "Feature" },
                { v: "User Story", label: "US"    },
              ]}
            />
          </Field>
          <div>
            <div style={{ fontSize: 12, color: T.textSubtle, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>Contexte persona</div>
            <div style={{ fontSize: 12, color: T.textSubtle, marginBottom: 8 }}>
              Décrit votre profil PO pour des User Stories plus précises
            </div>
            <textarea
              value={persona}
              onChange={e => setPersona(e.target.value)}
              rows={3}
              style={{
                width: "100%", padding: "10px 12px", border: `1.5px solid ${T.border}`,
                borderRadius: T.radiusSm, fontSize: 13, fontFamily: "inherit",
                backgroundColor: "#FAFAFA", color: T.text, lineHeight: 1.6,
                resize: "vertical", outline: "none", boxSizing: "border-box",
              }}
              onFocus={e => { e.target.style.borderColor = T.primary; }}
              onBlur={e  => { e.target.style.borderColor = T.border; }}
            />
          </div>
        </Section>

        <Section icon={Bell} title="Notifications">
          <Field label="Rapport hebdomadaire par email" sub={`Envoyé chaque lundi à ernestinemtb@gmail.com`}>
            <Toggle value={notifEmail} onChange={setNotifEmail} />
          </Field>
          <Field label="Résumé quotidien" sub="Récapitulatif des items générés dans la journée" style={{ marginBottom: 0 }}>
            <Toggle value={notifSummary} onChange={setNotifSummary} />
          </Field>
        </Section>

        <Section icon={Users} title="Projets actifs">
          {["Kantara", "Nexio", "Pathline"].map((p, i) => {
            const colors = [T.primary, "#15803D", "#C2410C"];
            const bgs    = [T.primaryLight, "#F0FDF4", "#FFF4ED"];
            const counts = [28, 21, 18];
            return (
              <div key={p} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 2 ? `1px solid ${T.borderSubtle}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: colors[i] }} />
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: T.text }}>{p}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: colors[i], backgroundColor: bgs[i], borderRadius: 20, padding: "2px 9px" }}>
                    {counts[i]} items
                  </span>
                  <button style={{ fontSize: 12, color: T.textSubtle, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    Configurer →
                  </button>
                </div>
              </div>
            );
          })}
        </Section>
      </div>
    </>
  );
}

/* ─── MAIN APP ───────────────────────────────────────────────── */
export default function App() {
  const [activeNav, setActiveNav] = useState("analyser");

  const NAV = [
    { id: "analyser",   label: "Analyser",  Icon: Sparkles  },
    { id: "historique", label: "Historique", Icon: Clock     },
    { id: "rapport",    label: "Rapport",    Icon: BarChart2 },
    { id: "settings",   label: "Paramètres", Icon: Settings2 },
  ];

  const PAGES = {
    analyser:   <PageAnalyser />,
    historique: <PageHistorique />,
    rapport:    <PageRapport />,
    settings:   <PageParametres />,
  };

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      backgroundColor: T.bg,
      fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin    { from { transform: rotate(0deg)     } to { transform: rotate(360deg)   } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
        button:active { transform: scale(0.97) !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 99px; }
        * { box-sizing: border-box; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 240, flexShrink: 0,
        backgroundColor: T.sidebar, borderRight: `1px solid ${T.border}`,
        display: "flex", flexDirection: "column", padding: "20px 10px",
        overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 10px", marginBottom: 32 }}>
          <div style={{
            width: 32, height: 32,
            background: `linear-gradient(135deg, ${T.primary} 0%, #8B5CF6 100%)`,
            borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 2px 8px rgba(92,95,212,.3)`, flexShrink: 0,
          }}>
            <Zap size={15} color="#fff" fill="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: T.text, letterSpacing: "-0.02em" }}>FeedbackPO</div>
            <div style={{ fontSize: 10.5, color: T.textSubtle, fontWeight: 500 }}>Feedback → Backlog</div>
          </div>
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, color: "#CBD5E1", letterSpacing: ".08em", textTransform: "uppercase", padding: "0 10px", marginBottom: 4 }}>
          Navigation
        </div>

        {NAV.map(({ id, label, Icon }) => (
          <div
            key={id}
            onClick={() => setActiveNav(id)}
            style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "8px 10px", borderRadius: T.radiusSm, marginBottom: 2,
              cursor: "pointer",
              backgroundColor: activeNav === id ? T.primaryLight : "transparent",
              color: activeNav === id ? T.primary : T.textMuted,
              transition: T.transition,
              fontWeight: activeNav === id ? 600 : 400,
            }}
            onMouseEnter={e => { if (activeNav !== id) e.currentTarget.style.backgroundColor = "#F5F5FA"; }}
            onMouseLeave={e => { if (activeNav !== id) e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <Icon size={15} strokeWidth={activeNav === id ? 2.2 : 1.8} />
            <span style={{ fontSize: 13.5 }}>{label}</span>
            {id === "historique" && (
              <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: activeNav === id ? T.primary : T.textSubtle, backgroundColor: activeNav === id ? T.primaryMid + "44" : "#F3F4F6", borderRadius: 20, padding: "0px 7px" }}>
                {MOCK_HISTORY.length}
              </span>
            )}
          </div>
        ))}

        <div style={{ flex: 1 }} />

        <div style={{ backgroundColor: T.primaryLight, borderRadius: T.radius, padding: 14, border: `1px solid ${T.primaryMid}22` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
            <BookOpen size={12} color={T.primary} />
            <span style={{ fontSize: 11, fontWeight: 700, color: T.primary }}>Conseil PO</span>
          </div>
          <p style={{ fontSize: 11.5, color: "#4338CA", lineHeight: 1.6, margin: 0 }}>
            Plus le feedback est contextualisé (qui, quand, impact business), meilleures seront les User Stories générées.
          </p>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {PAGES[activeNav]}
      </div>
    </div>
  );
}
