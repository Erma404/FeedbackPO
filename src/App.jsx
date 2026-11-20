import { useState, useRef, useEffect } from "react";
import { T, alpha } from "./ds/tokens.js";
import { useIsMobile } from "./ds/useIsMobile.js";
import { callClaude } from "./lib/claude.js";
import Shell from "./shell/Shell.jsx";
import AnalyserView from "./pages/AnalyserView.jsx";
import { Button, Card, Eyebrow, Pill, Ring, Segmented, PageHeader, Toggle } from "./ds/primitives.jsx";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import pptxgen from "pptxgenjs";
import {
  Zap, Settings2, Download, Loader2, CheckCheck,
  AlertCircle, Sparkles, ListChecks, HelpCircle, BookOpen,
  ArrowRight, RefreshCw, ChevronRight, BarChart2, Plus, ChevronDown,
  Timer, Repeat2, FileText, Key, Bell, Sliders,
  Layers, Target, X, Check,
  GripVertical, AlertTriangle, Users, Link, Upload,
  Layout, Pencil, Copy, Bug, Lightbulb, Trash2,
} from "lucide-react";

/* ─── TOKENS : src/ds/tokens.css (source de vérité) ───────────── */

const TYPE_CFG = {
  Epic:         { bg: "#FFF4ED", color: "#C2410C", dot: "#F97316", badge: "#FED7AA" },
  Feature:      { bg: "#F0FDF4", color: "#15803D", dot: "#22C55E", badge: "#BBF7D0" },
  "User Story": { bg: "#EEEEFF", color: "#4338CA", dot: "#6366F1", badge: "#C7C8F5" },
  Bug:          { bg: "#FEF2F2", color: "#DC2626", dot: "#EF4444", badge: "#FECACA" },
  Spike:        { bg: "#F5F3FF", color: "#7C3AED", dot: "#8B5CF6", badge: "#DDD6FE" },
};

const EXECUTABLE_TYPES = ["User Story", "Bug", "Spike"];
const HIERARCHY_TYPES  = ["Epic", "Feature"];

const STATUS_CFG = {
  "a-clarifier":    { label: "À clarifier",    color: "#C2410C", bg: "#FFF4ED", border: "#FED7AA", dot: "#F97316" },
  "en-affinage":    { label: "En affinage",    color: "#A16207", bg: "#FEFCE8", border: "#FDE68A", dot: "#EAB308" },
  "pret-pour-dev":  { label: "Sprint en cours",color: "#15803D", bg: "#F0FDF4", border: "#BBF7D0", dot: "#22C55E" },
  "prochain-sprint":{ label: "Prochain sprint",color: "#6D28D9", bg: "#F5F3FF", border: "#DDD6FE", dot: "#8B5CF6" },
  "exporte":        { label: "Sprint précédent",color: "#4338CA", bg: "#EEEEFF", border: "#C7C8F5", dot: "#6366F1" },
};

const COMMENT_TYPES = {
  question: { label: "Question stakeholder", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  decision: { label: "Décision produit",     color: "#15803D", bg: "#F0FDF4", border: "#BBF7D0" },
  note:     { label: "Note pour les devs",   color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" },
  risque:   { label: "Risque identifié",     color: "#C2410C", bg: "#FFF4ED", border: "#FED7AA" },
};

const SP_SCALE = [
  { v: 1, hint: "~2h" }, { v: 2, hint: "~4h" }, { v: 3, hint: "~1j" },
  { v: 5, hint: "~2j" }, { v: 8, hint: "~3-4j" }, { v: 13, hint: "~1sem" },
  { v: 21, hint: "À découper" },
];

const PRIO_CFG = {
  "Must Have":   { bg: "#FEF2F2", color: "#DC2626" },
  "Should Have": { bg: "#FFF7ED", color: "#C2410C" },
  "Could Have":  { bg: "#FEFCE8", color: "#A16207" },
  "Won't Have":  { bg: "#F9FAFB", color: "#6B7280" },
};
const MOSCOW_TO_P = {
  "Must Have":   "P1",
  "Should Have": "P2",
  "Could Have":  "P3",
  "Won't Have":  "P4",
};

const DISCOVERY_QUESTIONS = [
  { Icon: Target,        label: "Problème",    q: "Quel problème concret cela résout-il aujourd'hui ? Qu'est-ce qui se passe sans cette fonctionnalité ?" },
  { Icon: Users,         label: "Reach",       q: "Qui est impacté, combien d'utilisateurs, à quelle fréquence ?" },
  { Icon: AlertTriangle, label: "Inaction",    q: "Que se passe-t-il si on ne livre pas ? Quel est le coût de l'inaction ?" },
  { Icon: BarChart2,     label: "Succès",      q: "Comment mesurerez-vous le succès ? Quelle métrique s'améliore et de combien ?" },
  { Icon: HelpCircle,    label: "Contraintes", q: "Y a-t-il des contraintes non négociables ? (légales, techniques, deadline)" },
];

const TECHNICAL_QUESTIONS = [
  { Icon: Layers,        label: "Dépendances",  q: "Quelles dépendances avec les systèmes ou services existants ?" },
  { Icon: AlertTriangle, label: "Risques",      q: "Quels risques de performance, sécurité ou scalabilité ?" },
  { Icon: RefreshCw,     label: "Dette tech",   q: "Quelle dette technique ce ticket touche-t-il ou génère-t-il ?" },
  { Icon: Lightbulb,     label: "Spike",        q: "Une investigation (Spike) est-elle nécessaire avant de chiffrer ?" },
  { Icon: FileText,      label: "Migration",    q: "Faut-il prévoir une migration de données ou un versioning d'API ?" },
];

/* ─── EXPORT ─────────────────────────────────────────────────── */
const downloadFile = (content, filename, mime) => {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const exportAsMarkdown = (backlog) => {
  const date  = new Date().toLocaleDateString("fr-FR");
  let md = `# Backlog FeedbackPO — ${date}\n\n`;
  const epics = backlog.filter(i => i.type === "Epic");
  const standalone = backlog.filter(i => EXECUTABLE_TYPES.includes(i.type) && !backlog.some(e => e.type === "Epic" && backlog.filter(f => f.type === "Feature" && f.parentId === e.id).some(f => f.id === i.parentId)));

  const fmtItem = (item, depth = 0) => {
    const hd  = "#".repeat(Math.min(depth + 2, 6));
    const ref = `#${toRef(item.id)}`;
    const p   = MOSCOW_TO_P[item.priorite?.valeur] ? `${MOSCOW_TO_P[item.priorite.valeur]} · ${item.priorite.valeur}` : "";
    const st  = STATUS_CFG[item.status]?.label ?? item.status;
    const sp  = item.story_points ? ` | ${item.story_points} SP` : "";
    let s = `${hd} [${item.type}] ${ref} — ${item.titre}\n`;
    s += `> ${[p, st, sp.trim()].filter(Boolean).join(" | ")}\n\n`;
    if (item.valeur_metier) s += `**Valeur métier** : ${item.valeur_metier}\n\n`;
    if (item.contexte)      s += `**Contexte** : ${item.contexte}\n\n`;
    if (item.criteres_acceptation?.length) {
      s += `**Critères d'acceptation** :\n`;
      item.criteres_acceptation.forEach(ca => { s += `- [ ] ${ca}\n`; });
      s += "\n";
    }
    if (item.questions_clarification?.length) {
      s += `**Questions à clarifier** :\n`;
      item.questions_clarification.forEach(q => { s += `- ${q}\n`; });
      s += "\n";
    }
    return s;
  };

  epics.forEach(epic => {
    md += fmtItem(epic, 0);
    backlog.filter(f => f.type === "Feature" && f.parentId === epic.id).forEach(feat => {
      md += fmtItem(feat, 1);
      backlog.filter(i => EXECUTABLE_TYPES.includes(i.type) && i.parentId === feat.id).forEach(i => { md += fmtItem(i, 2); });
    });
  });
  standalone.forEach(i => { md += fmtItem(i, 0); });
  return md;
};

/* ─── SPRINT PERSISTENCE ─────────────────────────────────────── */
const SPRINT_KEY = "feedbackpo_sprint";
const loadSprint = () => {
  try { return JSON.parse(localStorage.getItem(SPRINT_KEY) || "null") || { name: "Sprint 1", capacity: 40 }; }
  catch { return { name: "Sprint 1", capacity: 40 }; }
};
const saveSprint = (s) => { try { localStorage.setItem(SPRINT_KEY, JSON.stringify(s)); } catch {} };

/* ─── BACKLOG PERSISTENCE ────────────────────────────────────── */
const BACKLOG_KEY = "feedbackpo_backlog";
const loadBacklog = () => {
  try { const raw = localStorage.getItem(BACKLOG_KEY); return raw === null ? MOCK_KANBAN : JSON.parse(raw); }
  catch { return MOCK_KANBAN; }
};
const saveBacklog = (backlog) => { try { localStorage.setItem(BACKLOG_KEY, JSON.stringify(backlog)); } catch {} };

const exportAsCSV = (backlog) => {
  const headers = ["Ref","Type","Titre","Priorité","P","Statut","SP","Module","Valeur métier","Doublons","Tags"];
  const rows = backlog.map(i => [
    `#${toRef(i.id)}`, i.type,
    `"${(i.titre || "").replace(/"/g, '""')}"`,
    i.priorite?.valeur || "",
    MOSCOW_TO_P[i.priorite?.valeur] || "",
    STATUS_CFG[i.status]?.label || i.status,
    i.story_points || "",
    i.module_suggere || "",
    `"${(i.valeur_metier || "").replace(/"/g, '""')}"`,
    i.potentiel_doublon ? `#${toRef(i.potentiel_doublon.id)}` : "",
    (i.tags || []).join("|"),
  ]);
  return [headers, ...rows].map(r => r.join(";")).join("\n");
};

/* ─── UTILS ─────────────────────────────────────────────────── */
const shortTitle = (titre) => {
  if (!titre) return "Sans titre";
  const m = titre.match(/je veux (.+?) afin/i);
  const t = m ? m[1] : titre;
  return t.length > 42 ? t.slice(0, 42) + "…" : t;
};
const toRef = (id) => {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return String(h % 1000000).padStart(6, "0");
};
const spHint     = (sp) => SP_SCALE.find(s => s.v === sp)?.hint || "";
const makeId     = ()   => Math.random().toString(36).slice(2, 9);
const defaultStatus = (item) => item.ambigu ? "a-clarifier" : "en-affinage";

const getKanbanItems = (backlog, filter) => {
  const exec = backlog.filter(i => EXECUTABLE_TYPES.includes(i.type));
  if (!filter) return exec;
  if (filter.type === "epic") {
    const featIds = backlog.filter(i => i.type === "Feature" && i.parentId === filter.id).map(i => i.id);
    return exec.filter(i => [filter.id, ...featIds].includes(i.parentId));
  }
  if (filter.type === "feature") {
    return exec.filter(i => i.parentId === filter.id);
  }
  return exec;
};

/* ─── RESPONSIVE HOOK ───────────────────────────────────────── */
/* ─── MOCK DATA ─────────────────────────────────────────────── */
const MOCK_KANBAN = [
  {
    id: "d1", type: "Epic", parentId: null, status: "pret-pour-dev", ordre: 0,
    titre: "En tant que responsable commercial, je veux centraliser l'export des données de vente afin d'éliminer les ressaisies manuelles",
    contexte: "L'équipe perd 2h/jour à copier des données entre l'app et Excel. Blocage critique pour l'adoption (Marc, 50 licences).",
    valeur_metier: "Économise 2h/jour × 12 commerciaux = 24h/sem. Réduit le risque de churn sur un compte à 50 licences.",
    criteres_acceptation: [
      "Un export déclenché sur > 10 000 lignes affiche une barre de progression — l'utilisateur peut continuer à naviguer dans l'app sans blocage",
      "L'export respecte les droits d'accès : un commercial ne peut exporter que les données de ses propres comptes, même en manipulant l'URL",
      "Chaque fichier exporté contient dans ses métadonnées : date de génération, filtres actifs au moment de l'export, et identifiant utilisateur",
      "Le lien de téléchargement expire automatiquement après 24h — une tentative d'accès après expiration retourne un message explicite (pas une 404)",
      "En cas d'échec serveur pendant la génération, un message d'erreur actionnable est affiché ('Réessayer' ou 'Notifier par email quand prêt')",
    ],
    story_points: null, priorite: { framework: "MoSCoW", valeur: "Must Have", justification: "Bloque l'adoption d'un compte stratégique." },
    module_suggere: "Reporting & Export", questions_clarification: ["Quels champs spécifiques doivent figurer dans l'export ?"], ambigu: false,
    prototypes: [], commentaires: [{ id: "c1", type: "decision", texte: "Validé en comité produit le 12/06.", date: "Il y a 4 jours" }],
  },
  {
    id: "d2", type: "Feature", parentId: "d1", status: "pret-pour-dev", ordre: 0,
    titre: "En tant qu'utilisateur, je veux déclencher un export en un clic depuis le dashboard afin de gagner du temps sur mon reporting",
    contexte: "Aucune option d'export directe. Les utilisateurs passent par des workarounds.",
    valeur_metier: "Supprime ~30min/jour de manipulation manuelle par utilisateur actif.",
    criteres_acceptation: [
      "Le bouton 'Exporter' est visible dès qu'au moins 1 ligne est présente dans la vue — il est masqué (pas désactivé) si le dashboard est vide",
      "L'export respecte exactement les filtres actifs au moment du clic (période, équipe, statut) — un badge sur le bouton indique le nombre de filtres appliqués",
      "Temps de génération : < 3s pour ≤ 5 000 lignes, < 10s pour ≤ 50 000 lignes — au-delà, envoi automatique par email avec lien de téléchargement",
      "Le nom de fichier suit le pattern `[Projet]_export_[YYYY-MM-DD]_[HH-mm].[format]` — jamais de nom générique type 'export(1).csv'",
      "Si 2 exports sont déclenchés simultanément par le même utilisateur, le second est mis en file d'attente avec un message 'Export en cours, vous serez notifié'",
    ],
    story_points: null, priorite: { framework: "MoSCoW", valeur: "Must Have", justification: "Fonctionnalité de base manquante." },
    module_suggere: "Dashboard Principal", questions_clarification: ["L'export doit-il tenir compte des filtres actifs ?"], ambigu: false,
    prototypes: [], commentaires: [],
  },
  {
    id: "d3", type: "Feature", parentId: "d1", status: "en-affinage", ordre: 0,
    titre: "En tant que manager, je veux recevoir un rapport hebdomadaire automatique par email afin de suivre les KPIs sans me connecter",
    contexte: "Les managers ne se connectent pas régulièrement. Ils veulent un résumé chaque lundi.",
    valeur_metier: "Augmente l'engagement décisionnel des managers — réduit le cycle de feedback de 1 semaine.",
    criteres_acceptation: [
      "L'email est envoyé chaque lundi entre 7h45 et 8h15 dans la timezone du destinataire (pas UTC) — tolérance de ±15min documentée",
      "Le rapport contient : 1 KPI principal avec variation N-1 en couleur (vert ≥0%, rouge <0%), les 3 alertes les plus critiques classées par sévérité, et 1 action recommandée",
      "Si aucune donnée n'est disponible pour la semaine (ex: congés, 0 activité), l'email n'est pas envoyé — un log 'envoi ignoré + raison' est conservé côté serveur",
      "Le lien 'Se désabonner' désactive les envois en 1 clic sans connexion requise et déclenche un email de confirmation de désabonnement dans les 5 minutes",
      "Le rendu email est validé et sans casse sur : Gmail Web, Outlook 2019+, Apple Mail macOS, Gmail iOS, et Mail Android (Samsung)",
    ],
    story_points: null, priorite: { framework: "MoSCoW", valeur: "Should Have", justification: "Améliore l'engagement des décideurs." },
    module_suggere: "Notifications & Rapports", questions_clarification: ["Les KPIs sont-ils personnalisables par manager ?"], ambigu: false,
    prototypes: [], commentaires: [{ id: "c2", type: "question", texte: "Le rapport doit-il inclure les données des sous-équipes ?", date: "Hier" }],
  },
  {
    id: "d4", type: "User Story", parentId: "d3", status: "a-clarifier", ordre: 0,
    titre: "En tant qu'utilisateur mobile, je veux consulter mes KPIs depuis mon téléphone afin de suivre l'activité en déplacement",
    contexte: "Les commerciaux terrain n'ont pas accès aux dashboards en mobilité.",
    valeur_metier: "Réduit le délai de prise de décision terrain de ~24h à quelques minutes.",
    criteres_acceptation: [
      "Sur mobile (375px–428px), les 5 KPIs s'affichent en grille 2 colonnes sans scroll horizontal — valeur, tendance et delta lisibles sans zoom",
      "En connexion dégradée (3G simulée via DevTools), les données en cache sont affichées avec un badge 'Actualisé il y a Xmin' — aucun écran blanc ni spinner infini",
      "Un swipe vers le bas déclenche le rafraîchissement des données (pull-to-refresh) avec feedback visuel de chargement",
      "L'interface est lisible sans zoom sur iPhone SE (375px) avec la taille de texte système réglée sur 'Très grand' (Dynamic Type)",
      "Le layout est utilisable en mode paysage (landscape) sans chevauchement ni troncature de données sur iPhone 14 et Samsung Galaxy S22",
    ],
    story_points: null, priorite: { framework: "MoSCoW", valeur: "Could Have", justification: "Confort d'usage, non bloquant pour V1." },
    module_suggere: "Application Mobile / PWA", questions_clarification: ["App native ou PWA ?", "Quels sont les 5 KPIs prioritaires ?"],
    ambigu: true, prototypes: [], commentaires: [{ id: "c3", type: "risque", texte: "Complexité technique élevée si app native — évaluer PWA d'abord.", date: "Il y a 2 jours" }],
  },
  {
    id: "d5", type: "User Story", parentId: "d2", status: "en-affinage", ordre: 1,
    titre: "En tant qu'administrateur, je veux configurer les colonnes d'export par profil afin d'adapter le format aux besoins de chaque équipe",
    contexte: "Finance, sales et ops ont des besoins différents. Un export unique ne convient pas.",
    valeur_metier: "Réduit les aller-retours entre les équipes et le support de ~3 tickets/sem.",
    criteres_acceptation: [
      "Un admin peut sélectionner, réordonner (drag & drop) et désélectionner les colonnes disponibles pour chaque profil — l'ordre choisi est reflété dans le fichier exporté",
      "Un template nommé est sauvegardé immédiatement après confirmation et apparaît dans la liste sans rechargement de page (pas de spinner global)",
      "Les 3 templates prédéfinis (Finance, Sales, Ops) sont en lecture seule — l'admin peut les dupliquer pour créer une variante, mais toute tentative de modification directe est bloquée avec un message explicite",
      "Si une colonne référencée dans un template est supprimée du système, ce template affiche un warning 'Colonne introuvable : [nom]' sans bloquer l'export des autres colonnes",
      "Le nom du template utilisé apparaît dans les métadonnées du fichier exporté, permettant à l'équipe support de tracer l'origine d'un export en cas de litige",
    ],
    story_points: 3, priorite: { framework: "MoSCoW", valeur: "Could Have", justification: "Valeur ajoutée après validation de l'export basique." },
    module_suggere: "Administration & Paramètres", questions_clarification: ["Y a-t-il des colonnes sensibles à masquer ?"],
    ambigu: false, prototypes: [], commentaires: [],
  },
  {
    id: "d6", type: "Bug", parentId: "d2", status: "a-clarifier", ordre: 2,
    titre: "L'export CSV génère des caractères corrompus pour les champs contenant des accents (UTF-8 non respecté)",
    contexte: "Remonté par 3 clients lors de la beta. Les prénoms français (é, è, à) s'affichent en caractères étranges dans Excel.",
    valeur_metier: "Bloque l'adoption de la feature export pour les équipes françaises — ~60% de la base.",
    criteres_acceptation: [
      "Le fichier CSV inclut un BOM UTF-8 (octets EF BB BF) en en-tête — vérifiable via éditeur hexadécimal ou outil de validation en ligne",
      "Les 26 caractères accentués français (é, è, ê, ë, à, â, ù, û, ç, œ, æ…) s'affichent sans corruption à l'ouverture directe dans Excel (double-clic) sans étape d'import manuel",
      "Testé et validé sans corruption sur : macOS Excel 365, Windows Excel 2016, Windows Excel 2019, LibreOffice Calc, et Google Sheets (import direct)",
      "Un fichier de test de régression contenant les 26 caractères accentués est ajouté au pipeline CI — le test échoue si le BOM est absent ou si un caractère est corrompu",
      "La correction ne casse pas les exports de données numériques : les décimales (virgule vs point selon locale) et les dates restent dans le format attendu par chaque client",
    ],
    story_points: 2, priorite: { framework: "MoSCoW", valeur: "Must Have", justification: "Bloque l'utilisation de la feature." },
    module_suggere: "Dashboard Principal", questions_clarification: ["Faut-il gérer d'autres encodages (ISO-8859-1) pour compatibilité legacy ?"],
    ambigu: false, prototypes: [], commentaires: [],
  },
  {
    id: "d7", type: "Spike", parentId: "d3", status: "en-affinage", ordre: 1,
    titre: "[SPIKE] Explorer les options d'envoi d'emails transactionnels : SendGrid vs Mailgun vs SES",
    contexte: "Avant d'implémenter les rapports hebdomadaires automatiques, l'équipe doit choisir l'outil d'envoi email et valider les coûts.",
    valeur_metier: "Réduit le risque technique et permet d'estimer correctement la feature rapport hebdomadaire.",
    criteres_acceptation: [
      "Le benchmark compare les 3 options sur 5 critères pondérés : coût pour 10k/100k emails/mois, taux de déliverabilité (données publiques ou tests), qualité du SDK Node.js, support DKIM/SPF automatisé, et délai de mise en place estimé",
      "Un PoC fonctionnel est livré avec l'option retenue : envoi d'un email HTML réel sur une adresse de test, avec logs de traçabilité (message-id, timestamp, statut de livraison)",
      "Le document de décision inclut un tableau comparatif lisible par un non-technique, le choix retenu avec justification en 3 phrases, et l'estimation de coût mensuel pour 3 volumétries (1k / 10k / 100k emails)",
      "L'estimation story points de la Feature 'Rapport hebdomadaire' (d3) est mise à jour dans le backlog suite aux conclusions — l'écart avec l'estimation initiale est commenté",
      "La décision est présentée en review technique avant démarrage de l'implémentation — le compte rendu est archivé (Notion / Confluence) et le lien est ajouté en commentaire de cette carte",
    ],
    story_points: 5, priorite: { framework: "MoSCoW", valeur: "Must Have", justification: "Prérequis pour l'implémentation." },
    module_suggere: "Infrastructure & Notifications", questions_clarification: ["Quelle est l'enveloppe budgétaire pour les emails ?"],
    ambigu: false, prototypes: [], commentaires: [],
  },
];

const RAPPORT_STATS = {
  feedbacks: 23, items: 67, reutilisation: 71, tempsSave: 4.2,
  parType: { Epic: 8, Feature: 19, "User Story": 28, Bug: 7, Spike: 5 },
  parPrio: { "Must Have": 19, "Should Have": 28, "Could Have": 14, "Won't Have": 6 },
  parProjet: { "Kantara": 28, "Nexio": 21, "Pathline": 18 },
  activite: [3, 5, 2, 7, 4, 6, 3],
  jours: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
};

/* ─── SHARED COMPONENTS ──────────────────────────────────────── */
function TypeBadge({ type }) {
  const c = TYPE_CFG[type] || TYPE_CFG["User Story"];
  const IconEl = type === "Bug" ? Bug : type === "Spike" ? Lightbulb : null;
  return (
    <span className="ds-pill">
      {IconEl ? <IconEl size={13} color={c.dot} /> : <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot }} />}
      {type}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_CFG[status] || STATUS_CFG["en-affinage"];
  return <span className="ds-pill"><span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot }} />{s.label}</span>;
}

function SPBadge({ sp, onClick }) {
  const Tag = onClick ? "button" : "span";
  if (!sp) return <Tag className="ds-pill" data-tone="warning" onClick={onClick}><AlertTriangle size={13} /> Non estimé</Tag>;
  return <Tag className="ds-pill" data-tone="primary" onClick={onClick}><Zap size={13} /> {sp} SP · {spHint(sp)}</Tag>;
}

function Avatar({ initials = "EM", size = 24 }) {
  return (
    <span title="Ernestine Matjabo" style={{ width: size, height: size, borderRadius: "50%", background: "var(--ds-grad-brand)", color: "var(--ds-nav-deep)", fontSize: Math.max(10, size * 0.4), fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2px solid #fff", boxShadow: "0 0 0 1px var(--ds-border)" }}>
      {initials}
    </span>
  );
}

function InlineEdit({ value, onChange, multiline = false, placeholder = "Modifier…", style = {} }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const ref = useRef();
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  const save = () => { setEditing(false); if (draft !== value) onChange(draft); };
  const base = { fontSize: "inherit", fontFamily: "inherit", fontWeight: "inherit", letterSpacing: "inherit", color: "inherit", lineHeight: "inherit", background: "transparent", border: "none", outline: "none", width: "100%", resize: "none", padding: 0, margin: 0, ...style };
  if (editing) {
    const El = multiline ? "textarea" : "input";
    return <El ref={ref} value={draft} onChange={e => setDraft(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === "Escape") { setDraft(value); setEditing(false); } if (!multiline && e.key === "Enter") save(); }} style={{ ...base, border: "1px solid var(--ds-primary)", borderRadius: 12, padding: "6px 10px", margin: "-7px -11px", width: "calc(100% + 22px)", background: "#fff", boxShadow: "0 0 0 4px rgba(124,92,224,.14)", minHeight: multiline ? 72 : "auto" }} rows={multiline ? 3 : undefined} />;
  }
  return (
    <span onClick={() => { setDraft(value); setEditing(true); }} title="Cliquer pour modifier" style={{ cursor: "text", display: "block", ...style }}>
      {value || <span style={{ color: "var(--ds-text-muted)" }}>{placeholder}</span>}
    </span>
  );
}

function ACEditor({ criteres, onChange }) {
  const [refining, setRefining] = useState(null);
  const [preview, setPreview]   = useState(null);

  const refineAC = async (ac, idx) => {
    setRefining(idx);
    try {
      const res = await callClaude(JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 200, messages: [{ role: "user", content: `Reformule ce critère d'acceptation pour le rendre plus testable (verbe d'action + condition + résultat mesurable). Réponds UNIQUEMENT avec le critère reformulé.\n\nCritère : "${ac}"` }] }));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setPreview({ idx, error: data?.error?.message || "L'affinage a échoué. Réessaie plus tard." });
      else setPreview({ idx, refined: data.content?.[0]?.text?.trim() });
    } catch { } finally { setRefining(null); }
  };

  const update = (idx, val) => { const n = [...criteres]; n[idx] = val; onChange(n); };
  const remove = (idx)      => onChange(criteres.filter((_, i) => i !== idx));
  const add    = ()         => onChange([...criteres, ""]);

  return (
    <div>
      {criteres.map((ac, idx) => (
        <div key={idx} className="ds-ac">
          <Check size={16} color="var(--ds-success)" style={{ flexShrink: 0, marginTop: 3 }} />
          <InlineEdit value={ac} onChange={v => update(idx, v)} multiline style={{ flex: 1, fontSize: 14.5, color: "var(--ds-text)", lineHeight: 1.55 }} placeholder="Saisir un critère…" />
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            {refining === idx
              ? <span className="ds-mini"><Loader2 size={16} color="var(--ds-primary)" style={{ animation: "spin 1s linear infinite" }} /></span>
              : <button className="ds-mini" onClick={() => refineAC(ac, idx)} title="Affiner avec Claude" aria-label="Affiner avec Claude"><Sparkles size={16} /></button>}
            <button className="ds-mini" onClick={() => remove(idx)} aria-label="Retirer le critère"><X size={16} /></button>
          </div>
        </div>
      ))}
      {preview?.error && (
        <div className="ds-block" data-tone="warning" role="alert" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
          <AlertCircle size={17} color="var(--ds-warning-text)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 14, color: "var(--ds-warning-text)", lineHeight: 1.5 }}>{preview.error}</span>
          <Button variant="ghost" style={{ height: 34 }} onClick={() => setPreview(null)}>Fermer</Button>
        </div>
      )}
      {preview && !preview.error && (
        <div className="ds-block" data-tone="primary" style={{ marginBottom: 10 }}>
          <div className="ds-block__t" style={{ color: "var(--ds-primary-strong)" }}>Reformulation Claude</div>
          <div style={{ fontSize: 14.5, color: "var(--ds-text)", lineHeight: 1.55, marginBottom: 12 }}>{preview.refined}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button style={{ height: 38 }} onClick={() => { update(preview.idx, preview.refined); setPreview(null); }}><Check size={15} /> Accepter</Button>
            <Button variant="secondary" style={{ height: 38 }} onClick={() => setPreview(null)}>Ignorer</Button>
          </div>
        </div>
      )}
      <Button variant="ghost" onClick={add} style={{ paddingLeft: 4 }}><Plus size={16} /> Ajouter un critère</Button>
    </div>
  );
}

function SPPicker({ value, onChange, onClose }) {
  return (
    <div className="ds-menu" style={{ right: "auto", left: 0, padding: 12, display: "flex", flexWrap: "wrap", gap: 6, width: 280 }}>
      {SP_SCALE.map(({ v, hint }) => (
        <button key={v} onClick={() => { onChange(v); onClose(); }} style={{ width: "auto", height: 38, padding: "0 12px", borderRadius: 999, fontWeight: 600, background: value === v ? "var(--ds-primary)" : "var(--ds-primary-soft)", color: value === v ? "#fff" : "var(--ds-primary-strong)" }}>
          {v} <span style={{ fontSize: 12, fontWeight: 400, opacity: .8 }}>{hint}</span>
        </button>
      ))}
      {value && <button onClick={() => { onChange(null); onClose(); }} style={{ justifyContent: "center", color: "var(--ds-danger-text)", background: "var(--ds-danger-bg)" }}>Effacer l'estimation</button>}
    </div>
  );
}

/* ─── COMMENT THREAD ─────────────────────────────────────────── */
function CommentThread({ commentaires, onChange }) {
  const [draft, setDraft] = useState("");
  const [type, setType]   = useState("note");
  const add = () => {
    if (!draft.trim()) return;
    onChange([...commentaires, { id: makeId(), type, texte: draft.trim(), date: "À l'instant" }]);
    setDraft("");
  };
  return (
    <div>
      <div style={{ display: "grid", gap: 14, marginBottom: commentaires.length ? 16 : 0 }}>
        {commentaires.map(c => {
          const ct = COMMENT_TYPES[c.type] || COMMENT_TYPES.note;
          return (
            <div key={c.id} style={{ display: "flex", gap: 12 }}>
              <div style={{ width: 3, background: ct.color, borderRadius: 99, flexShrink: 0, opacity: .55 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: ct.color }}>{ct.label}</span>
                  <span style={{ fontSize: 12.5, color: "var(--ds-text-muted)" }}>{c.date}</span>
                </div>
                <p style={{ fontSize: 14.5, color: "var(--ds-text)", lineHeight: 1.55, margin: 0, wordBreak: "break-word" }}>{c.texte}</p>
              </div>
            </div>
          );
        })}
      </div>
      <select className="ds-select" value={type} onChange={e => setType(e.target.value)} aria-label="Type de commentaire" style={{ marginBottom: 10 }}>
        {Object.entries(COMMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="ds-input" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Ajouter un commentaire…" style={{ flex: 1, minWidth: 0 }} />
        <Button onClick={add} disabled={!draft.trim()} aria-label="Envoyer" style={{ padding: "0 18px" }}><ArrowRight size={17} /></Button>
      </div>
    </div>
  );
}

/* ─── PROTOTYPE PANEL ────────────────────────────────────────── */
function PrototypePanel({ prototypes, onChange }) {
  const fileRef = useRef();
  const [urlInput, setUrlInput] = useState("");
  const [showUrl, setShowUrl]   = useState(false);
  const addUrl = () => {
    if (!urlInput.trim()) return;
    onChange([...prototypes, { id: makeId(), src: urlInput.trim(), type: "url", caption: "" }]);
    setUrlInput(""); setShowUrl(false);
  };
  const addFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onChange([...prototypes, { id: makeId(), src: ev.target.result, type: "image", caption: file.name.split(".")[0] }]);
    reader.readAsDataURL(file);
  };
  const updateCaption = (id, caption) => onChange(prototypes.map(p => p.id === id ? { ...p, caption } : p));
  const remove        = (id)          => onChange(prototypes.filter(p => p.id !== id));
  const mini = { position: "absolute", top: 6, width: 26, height: 26, borderRadius: 9, border: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(27,21,53,.6)" };
  return (
    <div>
      {prototypes.length > 0 && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          {prototypes.map(p => (
            <div key={p.id} style={{ position: "relative", width: 132 }}>
              {p.type === "image"
                ? <img src={p.src} alt={p.caption} style={{ width: 132, height: 92, objectFit: "cover", borderRadius: 16, border: "1px solid var(--ds-border)" }} />
                : <div style={{ width: 132, height: 92, borderRadius: 16, background: "var(--ds-primary-soft)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: "var(--ds-primary-strong)" }}><Link size={22} /><span style={{ fontSize: 13, fontWeight: 500 }}>Lien</span></div>}
              <button onClick={() => navigator.clipboard.writeText(p.src)} title="Copier" aria-label="Copier" style={{ ...mini, right: 6 }}><Copy size={13} color="#fff" /></button>
              <button onClick={() => remove(p.id)} aria-label="Retirer" style={{ ...mini, left: 6, background: "rgba(217,54,54,.8)" }}><X size={13} color="#fff" /></button>
              <input value={p.caption} onChange={e => updateCaption(p.id, e.target.value)} placeholder="Légende…" style={{ width: "100%", fontSize: 13, border: "none", outline: "none", background: "transparent", color: "var(--ds-text-secondary)", marginTop: 6, fontFamily: "inherit" }} />
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button variant="secondary" style={{ height: 40 }} onClick={() => fileRef.current?.click()}><Upload size={15} /> Image</Button>
        <Button variant="secondary" style={{ height: 40 }} onClick={() => setShowUrl(!showUrl)}><Link size={15} /> URL ou Figma</Button>
        <input ref={fileRef} type="file" accept="image/*" onChange={addFile} style={{ display: "none" }} />
      </div>
      {showUrl && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input className="ds-input" value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addUrl()} placeholder="https://figma.com/… ou lien image" style={{ flex: 1, minWidth: 0 }} />
          <Button onClick={addUrl}>Ajouter</Button>
        </div>
      )}
    </div>
  );
}

/* ─── KANBAN CARD ────────────────────────────────────────────── */
const PRIO_TONE_BL = { "Must Have": "danger", "Should Have": "warning" };

function KanbanCard({ item, allItems, onDelete, highlighted, onOpenDetail, onSelectNode, isDragging = false, dragListeners, dragAttributes }) {
  const [confirmDelete, setConfirm] = useState(false);
  const needsDiscovery = item.ambigu || item.status === "a-clarifier";
  const parent = item.parentId ? allItems.find(i => i.id === item.parentId) : null;

  const handleParentClick = (e) => {
    e.stopPropagation();
    if (parent && HIERARCHY_TYPES.includes(parent.type)) onSelectNode?.({ id: parent.id, type: parent.type.toLowerCase() });
  };

  return (
    <article id={`card-${item.id}`} className="ds-ticket" data-highlight={highlighted || undefined} data-dragging={isDragging || undefined} onClick={() => onOpenDetail?.(item)}>
      {dragListeners && <div className="ds-grip" {...dragListeners} {...dragAttributes} onClick={e => e.stopPropagation()} aria-label="Déplacer le ticket"><GripVertical size={16} style={{ transform: "rotate(90deg)" }} /></div>}
      <div className="ds-ticket__body" style={dragListeners ? { paddingTop: 8 } : undefined}>
        {item.potentiel_doublon && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "var(--ds-warning-text)" }}>
            <AlertTriangle size={15} style={{ flexShrink: 0 }} /> Doublon potentiel
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <TypeBadge type={item.type} />
          {item.priorite?.valeur && <Pill tone={PRIO_TONE_BL[item.priorite.valeur]}>{MOSCOW_TO_P[item.priorite.valeur] ?? item.priorite.valeur}</Pill>}
          {needsDiscovery && <span title="À clarifier avec le stakeholder" style={{ display: "flex", color: "var(--ds-warning)" }}><HelpCircle size={17} /></span>}
        </div>

        <div className="ds-ticket__title">{item.titre}</div>

        {parent && (
          <button className="ds-linkpill" onClick={handleParentClick} title={HIERARCHY_TYPES.includes(parent.type) ? "Filtrer par cette Feature/Epic" : undefined} style={{ alignSelf: "flex-start", cursor: HIERARCHY_TYPES.includes(parent.type) ? "pointer" : "default" }}>
            ↑ {parent.type} <span className="ds-ref">#{toRef(parent.id)}</span>
          </button>
        )}

        {item.tags?.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {item.tags.slice(0, 3).map(tag => <span key={tag} className="ds-tag">{tag}</span>)}
            {item.tags.length > 3 && <span style={{ fontSize: 12.5, color: "var(--ds-text-muted)", alignSelf: "center" }}>+{item.tags.length - 3}</span>}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 12, borderTop: "1px solid var(--ds-border)" }}>
          <SPBadge sp={item.story_points} />
          <span className="ds-ref">#{toRef(item.id)}</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }} onClick={e => e.stopPropagation()}>
            {confirmDelete ? (
              <>
                <span style={{ fontSize: 13, color: "var(--ds-danger-text)", fontWeight: 500 }}>Supprimer ?</span>
                <button className="ds-pill" data-tone="danger" onClick={() => onDelete?.(item.id)}>Oui</button>
                <button className="ds-pill" onClick={() => setConfirm(false)}>Non</button>
              </>
            ) : (
              <>
                <Avatar />
                <button className="ds-mini" onClick={() => setConfirm(true)} title="Supprimer ce ticket" aria-label="Supprimer ce ticket"><Trash2 size={16} /></button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function SortableCard({ item, allItems, onDelete, highlighted, onOpenDetail, onSelectNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 999 : undefined, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      <KanbanCard item={item} allItems={allItems} onDelete={onDelete} highlighted={highlighted} onOpenDetail={onOpenDetail} onSelectNode={onSelectNode} isDragging={isDragging} dragListeners={listeners} dragAttributes={attributes} />
    </div>
  );
}

function Section({ title, children, right }) {
  return (
    <section style={{ marginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Eyebrow>{title}</Eyebrow>{right}
      </div>
      {children}
    </section>
  );
}
function QRow({ Icon, label, q, color }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
      <Icon size={15} color={color} style={{ flexShrink: 0, marginTop: 4 }} />
      <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ds-text)" }}><b style={{ fontWeight: 600 }}>{label}</b> · {q}</div>
    </div>
  );
}

/* ─── TICKET DETAIL PANEL ────────────────────────────────────── */
function TicketDetailPanel({ item, allItems, onUpdate, onDelete, onClose, onNavigate, onSelectNode }) {
  const [local, setLocal]             = useState(item);
  const [saved, setSaved]             = useState(false);
  const [acOpen, setAcOpen]           = useState(true);
  const [showSP, setShowSP]           = useState(false);
  const [confirmDelete, setConfirm]   = useState(false);
  const [clarifying, setClarifying]   = useState(false);
  const [clarifyNote, setClarifyNote] = useState("");
  const saveTimer = useRef();

  useEffect(() => { setLocal(item); }, [item.id]);

  const update = (patch) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onUpdate(next);
    clearTimeout(saveTimer.current);
    setSaved(false);
    saveTimer.current = setTimeout(() => { setSaved(true); setTimeout(() => setSaved(false), 1500); }, 500);
  };

  const handleClarify = () => {
    if (!clarifyNote.trim()) return;
    const pendingQs = local.questions_clarification || [];
    const texte = pendingQs.length
      ? `${clarifyNote.trim()}\n\nQuestions traitées : ${pendingQs.join(" · ")}`
      : clarifyNote.trim();
    update({
      status: "en-affinage",
      ambigu: false,
      questions_clarification: [],
      commentaires: [...(local.commentaires || []), { id: makeId(), type: "decision", texte, date: "À l'instant" }],
    });
    setClarifying(false);
    setClarifyNote("");
  };

  const needsDiscovery = local.ambigu || local.status === "a-clarifier";
  const parent   = local.parentId ? allItems.find(i => i.id === local.parentId) : null;
  const children = allItems.filter(i => i.parentId === local.id && EXECUTABLE_TYPES.includes(i.type));

  const navigateTo = (targetId) => {
    onClose();
    onNavigate?.(targetId);
    setTimeout(() => document.getElementById(`card-${targetId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  };

  const handleParentClick = () => {
    if (parent && HIERARCHY_TYPES.includes(parent.type)) { onClose(); onSelectNode?.({ id: parent.id, type: parent.type.toLowerCase() }); }
    else if (parent) navigateTo(parent.id);
  };

  return (
    <div className="ds-drawer-bg" onClick={onClose}>
      <aside className="ds-drawer" style={{ width: 620 }} role="dialog" aria-label={local.titre} onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <TypeBadge type={local.type} />
            <StatusBadge status={local.status} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {saved && <span style={{ fontSize: 13, color: "var(--ds-success-text)", fontWeight: 500 }}>Enregistré</span>}
            <button className="ds-iconbtn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <span className="ds-ref">#{toRef(local.id)}</span>
          <Avatar size={26} />
          {parent && <button className="ds-linkpill" onClick={handleParentClick} title={HIERARCHY_TYPES.includes(parent.type) ? "Filtrer par cette Feature/Epic" : "Aller au parent"}>↑ {parent.type} <span className="ds-ref">#{toRef(parent.id)}</span></button>}
          {children.map(c => <button key={c.id} className="ds-linkpill" onClick={() => navigateTo(c.id)}>↓ {c.type} <span className="ds-ref">#{toRef(c.id)}</span></button>)}
        </div>

        {local.potentiel_doublon && (
          <div className="ds-block" data-tone="warning" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "12px 16px" }}>
            <AlertTriangle size={17} color="var(--ds-warning-text)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: "var(--ds-warning-text)", flex: 1, lineHeight: 1.45 }}>Doublon {local.potentiel_doublon.niveau} · « {local.potentiel_doublon.titre} »</span>
            <Button variant="ghost" style={{ height: 34, color: "var(--ds-warning-text)" }} onClick={() => navigateTo(local.potentiel_doublon.id)}>Voir</Button>
          </div>
        )}

        <InlineEdit value={local.titre} onChange={v => update({ titre: v })} multiline style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1.25, color: "var(--ds-text)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
          <div style={{ position: "relative" }}>
            <SPBadge sp={local.story_points} onClick={() => setShowSP(!showSP)} />
            {showSP && <SPPicker value={local.story_points} onChange={v => update({ story_points: v })} onClose={() => setShowSP(false)} />}
          </div>
          {local.priorite?.valeur && <Pill tone={PRIO_TONE_BL[local.priorite.valeur]}>{local.priorite.valeur}</Pill>}
          {(local.tags || []).map(tag => <span key={tag} className="ds-tag">{tag}</span>)}
          {local.module_suggere && <span style={{ fontSize: 13.5, color: "var(--ds-text-muted)" }}>· {local.module_suggere}</span>}
        </div>

        {needsDiscovery && (
          <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
            <div className="ds-block" data-tone="warning">
              <div className="ds-block__t" style={{ color: "var(--ds-warning-text)" }}>Questions de cadrage</div>
              {local.questions_clarification?.map((q, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 14, lineHeight: 1.55, color: "var(--ds-text)" }}>
                  <HelpCircle size={15} color="var(--ds-warning-text)" style={{ flexShrink: 0, marginTop: 4 }} />{q}
                </div>
              ))}
              {local.questions_clarification?.length > 0 && <div style={{ height: 1, background: "rgba(143,82,6,.18)", margin: "6px 0 12px" }} />}
              {DISCOVERY_QUESTIONS.map(({ Icon, label, q }, i) => <QRow key={i} Icon={Icon} label={label} q={q} color="var(--ds-warning-text)" />)}
            </div>
            <div className="ds-block" data-tone="primary">
              <div className="ds-block__t" style={{ color: "var(--ds-primary-strong)" }}>À évaluer avec l'équipe tech</div>
              {TECHNICAL_QUESTIONS.map(({ Icon, label, q }, i) => <QRow key={i} Icon={Icon} label={label} q={q} color="var(--ds-primary-strong)" />)}
            </div>
            {clarifying ? (
              <div className="ds-block" data-tone="success">
                <div className="ds-block__t" style={{ color: "var(--ds-success-text)" }}>Résumé de la clarification (daily)</div>
                <textarea className="ds-input" autoFocus value={clarifyNote} onChange={e => setClarifyNote(e.target.value)} style={{ background: "#fff", marginBottom: 12 }}
                  placeholder="Ce qui a été décidé avec l'équipe : réponses aux questions, choix technique, périmètre retenu…" />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Button onClick={handleClarify} disabled={!clarifyNote.trim()} style={{ flex: 1, minWidth: 220 }}>Confirmer et passer en affinage</Button>
                  <Button variant="secondary" onClick={() => { setClarifying(false); setClarifyNote(""); }}>Annuler</Button>
                </div>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => setClarifying(true)} style={{ color: "var(--ds-success-text)" }}><CheckCheck size={17} /> Marquer comme clarifié</Button>
            )}
          </div>
        )}

        {!needsDiscovery && local.questions_clarification?.length > 0 && (
          <Section title="Questions à clarifier">
            {local.questions_clarification.map((q, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 14.5, lineHeight: 1.55 }}><HelpCircle size={16} color="var(--ds-primary)" style={{ flexShrink: 0, marginTop: 3 }} />{q}</div>
            ))}
          </Section>
        )}

        {local.rice && (
          <div className="ds-block" data-tone="success" style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24, padding: "14px 18px", flexWrap: "wrap" }}>
            <Zap size={17} color="var(--ds-success-text)" />
            <b style={{ fontSize: 15, color: "var(--ds-success-text)" }}>RICE {local.rice.score}</b>
            <span style={{ fontSize: 13.5, color: "var(--ds-success-text)" }}>
              Reach {local.rice.reach >= 1000 ? `${(local.rice.reach / 1000).toFixed(0)}k` : local.rice.reach} · Impact ×{local.rice.impact} · Confiance {Math.round(local.rice.confidence * 100)}% · Effort {local.rice.effort} sem.
            </span>
          </div>
        )}

        <Section title="Valeur métier">
          <div className="ds-block" data-tone="success" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Target size={18} color="var(--ds-success-text)" style={{ flexShrink: 0, marginTop: 3 }} />
            <InlineEdit value={local.valeur_metier} onChange={v => update({ valeur_metier: v })} multiline placeholder="Valeur métier attendue…" style={{ fontSize: 15, color: "var(--ds-success-text)", lineHeight: 1.55, flex: 1 }} />
          </div>
        </Section>

        <Section title="Contexte">
          <InlineEdit value={local.contexte} onChange={v => update({ contexte: v })} multiline style={{ fontSize: 15, color: "var(--ds-text-secondary)", lineHeight: 1.6 }} placeholder="Décrire le problème observé…" />
        </Section>

        <Section title={`Critères d'acceptation · ${local.criteres_acceptation?.length || 0}`}
          right={<button className="ds-mini" onClick={() => setAcOpen(!acOpen)} aria-label={acOpen ? "Replier" : "Déplier"}><ChevronDown size={18} style={{ transform: acOpen ? "rotate(180deg)" : "none", transition: "transform var(--dur-fast)" }} /></button>}>
          {acOpen && <ACEditor criteres={local.criteres_acceptation || []} onChange={v => update({ criteres_acceptation: v })} />}
        </Section>

        <Section title="Prototypes et visuels"><PrototypePanel prototypes={local.prototypes || []} onChange={v => update({ prototypes: v })} /></Section>
        <Section title="Commentaires"><CommentThread commentaires={local.commentaires || []} onChange={v => update({ commentaires: v })} /></Section>

        {local.ambigu && (
          <div className="ds-block" data-tone="warning" style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 24 }}>
            <AlertCircle size={17} color="var(--ds-warning-text)" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 14, color: "var(--ds-warning-text)", lineHeight: 1.5 }}>Besoin à préciser. À valider avec le stakeholder avant d'intégrer au backlog.</span>
          </div>
        )}

        <div style={{ borderTop: "1px solid var(--ds-border)", marginTop: 32, paddingTop: 18 }}>
          {confirmDelete ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, color: "var(--ds-danger-text)", flex: 1, minWidth: 160 }}>Supprimer ce ticket ?</span>
              <Button variant="secondary" style={{ height: 38 }} onClick={() => setConfirm(false)}>Annuler</Button>
              <Button style={{ height: 38, background: "var(--ds-danger)", boxShadow: "none" }} onClick={() => { onDelete?.(local.id); onClose(); }}>Supprimer</Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirm(true)} style={{ color: "var(--ds-danger-text)", paddingLeft: 0 }}><Trash2 size={16} /> Supprimer ce ticket</Button>
          )}
        </div>
      </aside>
    </div>
  );
}

const COLUMNS = ["a-clarifier", "en-affinage", "pret-pour-dev", "prochain-sprint", "exporte"];

/* ─── SPRINT CAPACITY BAR ────────────────────────────────────── */
function SprintCapacityBar({ sprint, usedSP, onEdit, onClose }) {
  const pct       = sprint.capacity > 0 ? Math.min(100, Math.round((usedSP / sprint.capacity) * 100)) : 0;
  const remaining = sprint.capacity - usedSP;
  const isFull    = remaining <= 0;
  const isNear    = !isFull && remaining <= sprint.capacity * 0.15;
  const tone      = isFull ? "danger" : isNear ? "warning" : undefined;

  return (
    <Card style={{ padding: "22px 26px", marginBottom: 20, display: "grid", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <Eyebrow>Sprint en cours</Eyebrow>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
            <span style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.025em", color: "var(--ds-text)" }}>{sprint.name}</span>
            <span style={{ fontSize: 15, color: "var(--ds-text-secondary)" }}><b style={{ fontSize: 22, fontWeight: 500, color: "var(--ds-text)", letterSpacing: "-0.02em" }}>{usedSP}</b> / {sprint.capacity} SP</span>
            {isFull ? <Pill tone="danger" dot>Sprint plein</Pill> : <Pill tone={tone || "success"} dot>{remaining} SP disponibles</Pill>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button variant="secondary" onClick={onEdit}><Settings2 size={16} /> Réglages</Button>
          <Button onClick={onClose}><CheckCheck size={16} /> Clôturer le sprint</Button>
        </div>
      </div>
      <div className="ds-progress" data-tone={tone} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Capacité du sprint"><span style={{ width: `${pct}%` }} /></div>
    </Card>
  );
}

/* ─── SPRINT SETTINGS PANEL ──────────────────────────────────── */
function SprintSettingsPanel({ sprint, onSave, onClose }) {
  const [name, setName]         = useState(sprint.name);
  const [capacity, setCapacity] = useState(sprint.capacity);
  return (
    <div className="ds-modal-bg" onClick={onClose}>
      <div className="ds-modal" role="dialog" aria-label="Réglages du sprint" onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", marginBottom: 22 }}>Réglages du sprint</h3>
        <label className="ds-label" htmlFor="sp-name">Nom du sprint</label>
        <input id="sp-name" className="ds-input" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 18 }} />
        <label className="ds-label" htmlFor="sp-cap">Capacité en story points</label>
        <input id="sp-cap" className="ds-input" type="number" min="1" max="999" value={capacity} onChange={e => setCapacity(Math.max(1, Number(e.target.value)))} />
        <div style={{ fontSize: 13.5, color: "var(--ds-text-secondary)", margin: "8px 0 24px" }}>Typiquement 30 à 50 SP pour une équipe de 4 à 6 devs.</div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button style={{ flex: 1 }} onClick={() => { onSave({ name: name.trim() || sprint.name, capacity }); onClose(); }}>Enregistrer</Button>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ statusKey, items, allItems, onDelete, highlightedId, onOpenDetail, onSelectNode }) {
  const cfg = STATUS_CFG[statusKey];
  const { setNodeRef, isOver } = useDroppable({ id: statusKey });
  return (
    <section className="ds-col" aria-label={cfg.label}>
      <div className="ds-col__head">
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
        <b>{cfg.label}</b>
        <Pill>{items.length}</Pill>
      </div>
      <div ref={setNodeRef} className="ds-col__drop" data-empty={items.length === 0 || undefined} data-over={isOver || undefined}>
        {items.length === 0 && "Dépose un ticket ici"}
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(item => <SortableCard key={item.id} item={item} allItems={allItems} onDelete={onDelete} highlighted={highlightedId === item.id} onOpenDetail={onOpenDetail} onSelectNode={onSelectNode} />)}
        </SortableContext>
      </div>
    </section>
  );
}

function KanbanBoard({ items, allItems, onItemsChange, onDeleteItem, highlightedId, onNavigate, onSelectNode, filter, onClearFilter }) {
  const [activeId, setActiveId]             = useState(null);
  const [pendingMove, setPendingMove]       = useState(null);
  const [showExport, setShowExport]         = useState(false);
  const [sprint, setSprint]                 = useState(loadSprint);
  const [showSprintSettings, setShowSprint] = useState(false);
  const [detailItem, setDetailItem]         = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const findContainer = (id) => COLUMNS.includes(id) ? id : items.find(i => i.id === id)?.status;
  const sprintUsedSP = items.filter(i => i.status === "pret-pour-dev" && i.story_points).reduce((s, i) => s + i.story_points, 0);

  const onDragStart = ({ active }) => setActiveId(active.id);

  const onDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over) return;
    const overContainer = findContainer(over.id);
    const activeItem    = items.find(i => i.id === active.id);
    if (!activeItem || !overContainer) return;

    if (overContainer === "pret-pour-dev" && activeItem.status !== "pret-pour-dev") {
      const missing = [];
      if (!activeItem.criteres_acceptation?.length) missing.push("critères d'acceptation");
      if (!activeItem.story_points) missing.push("story points");
      if (missing.length) { setPendingMove({ item: activeItem, targetStatus: overContainer, missing }); return; }

      const itemSP  = activeItem.story_points || 0;
      const newUsed = sprintUsedSP + itemSP;
      if (sprint.capacity > 0 && newUsed > sprint.capacity) {
        setPendingMove({ item: activeItem, targetStatus: "prochain-sprint", missing: [], sprintFull: true, overflow: newUsed - sprint.capacity });
        return;
      }
    }
    applyMove(activeItem, overContainer, active.id, over.id);
  };

  const applyMove = (activeItem, targetStatus, activeId, overId) => {
    const colItems  = items.filter(i => i.status === targetStatus);
    const overIndex = colItems.findIndex(i => i.id === overId);
    let next = items.map(i => i.id === activeItem.id ? { ...i, status: targetStatus } : i);
    if (activeItem.status === targetStatus && overIndex !== -1) {
      const activeIndex  = colItems.findIndex(i => i.id === activeId);
      const reordered    = arrayMove(colItems, activeIndex, overIndex);
      const reorderedIds = reordered.map(i => i.id);
      next = next.map(i => colItems.some(c => c.id === i.id) ? { ...i, ordre: reorderedIds.indexOf(i.id) } : i);
    }
    onItemsChange(next);
  };

  const closeSprint = () => {
    const updated = items.map(i => {
      if (i.status === "pret-pour-dev")   return { ...i, status: "exporte" };
      if (i.status === "prochain-sprint") return { ...i, status: "pret-pour-dev" };
      return i;
    });
    onItemsChange(updated);
    const match  = sprint.name.match(/(\d+)$/);
    const newNum = match ? parseInt(match[1]) + 1 : 2;
    const newName = sprint.name.replace(/\d+$/, String(newNum));
    const next = { ...sprint, name: newName };
    setSprint(next);
    saveSprint(next);
  };

  const updateSprint = (next) => { setSprint(next); saveSprint(next); };
  const updateItem = (updated) => onItemsChange(items.map(i => i.id === updated.id ? updated : i));
  const deleteItem = (id) => onDeleteItem?.(id);

  const totalSP    = items.filter(i => i.story_points).reduce((s, i) => s + i.story_points, 0);
  const activeItem = activeId ? items.find(i => i.id === activeId) : null;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {filter && <button className="ds-pill" data-tone="primary" onClick={onClearFilter} title="Retirer le filtre" style={{ height: 32, paddingRight: 8 }}>{filter.label} <X size={14} /></button>}
          {totalSP > 0 && <Pill tone="primary"><Zap size={13} /> {totalSP} SP au total</Pill>}
          <Pill>{items.length} ticket{items.length > 1 ? "s" : ""}</Pill>
        </div>
        <div style={{ position: "relative" }}>
          <Button variant="secondary" onClick={() => setShowExport(!showExport)}><Download size={16} /> Exporter</Button>
          {showExport && (
            <div className="ds-menu">
              <button onClick={() => { downloadFile(exportAsMarkdown(allItems), `backlog-${today}.md`, "text/markdown"); setShowExport(false); }}><FileText size={16} color="var(--ds-primary)" /> Markdown (.md)</button>
              <button onClick={() => { downloadFile(exportAsCSV(allItems), `backlog-${today}.csv`, "text/csv;charset=utf-8;"); setShowExport(false); }}><Download size={16} color="var(--ds-primary)" /> CSV (.csv)</button>
            </div>
          )}
        </div>
      </div>

      <SprintCapacityBar sprint={sprint} usedSP={sprintUsedSP} onEdit={() => setShowSprint(true)} onClose={closeSprint} />

      {pendingMove && (
        <div className="ds-block" data-tone={pendingMove.sprintFull ? "primary" : "warning"} role="alert" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
          {pendingMove.sprintFull ? <Layers size={20} color="var(--ds-primary-strong)" /> : <AlertTriangle size={20} color="var(--ds-warning-text)" />}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: pendingMove.sprintFull ? "var(--ds-primary-strong)" : "var(--ds-warning-text)" }}>
              {pendingMove.sprintFull ? `Sprint plein, dépassement de ${pendingMove.overflow} SP` : `Il manque : ${pendingMove.missing.join(" et ")}`}
            </div>
            <div style={{ fontSize: 14, color: "var(--ds-text-secondary)", marginTop: 2 }}>{pendingMove.sprintFull ? "Ajouter au prochain sprint à la place ?" : "Marquer comme prêt quand même ?"}</div>
          </div>
          <Button style={{ height: 40 }} onClick={() => { applyMove(pendingMove.item, pendingMove.targetStatus, pendingMove.item.id, pendingMove.item.id); setPendingMove(null); }}>
            {pendingMove.sprintFull ? "Prochain sprint" : "Confirmer"}
          </Button>
          <Button variant="secondary" style={{ height: 40 }} onClick={() => setPendingMove(null)}>Annuler</Button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(300px, 1fr))", gap: 16, alignItems: "start", overflowX: "auto", paddingBottom: 12 }}>
          {COLUMNS.map(col => {
            const colItems = items.filter(i => i.status === col).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
            return <KanbanColumn key={col} statusKey={col} items={colItems} allItems={allItems} onDelete={deleteItem} highlightedId={highlightedId} onOpenDetail={setDetailItem} onSelectNode={onSelectNode} />;
          })}
        </div>
        <DragOverlay>{activeItem && <KanbanCard item={activeItem} allItems={allItems} isDragging />}</DragOverlay>
      </DndContext>

      {showSprintSettings && <SprintSettingsPanel sprint={sprint} onSave={updateSprint} onClose={() => setShowSprint(false)} />}

      {detailItem && (
        <TicketDetailPanel
          item={detailItem}
          allItems={allItems}
          onUpdate={(updated) => { updateItem(updated); setDetailItem(updated); }}
          onDelete={(id) => { deleteItem(id); setDetailItem(null); }}
          onClose={() => setDetailItem(null)}
          onNavigate={onNavigate}
          onSelectNode={onSelectNode}
        />
      )}
    </div>
  );
}

/* ─── ADD CHILD FORM ─────────────────────────────────────────── */
function AddChildForm({ parentId, onAdd, onCancel }) {
  const [type, setType]     = useState("Bug");
  const [titre, setTitre]   = useState("");
  const [contexte, setCtx]  = useState("");
  const ref = useRef();
  useEffect(() => ref.current?.focus(), []);

  const submit = () => {
    if (!titre.trim()) return;
    onAdd({
      id: makeId(), type, parentId,
      titre: titre.trim(), contexte: contexte.trim(),
      valeur_metier: "", status: "a-clarifier", ordre: 99,
      story_points: null, priorite: { framework: "MoSCoW", valeur: "Could Have", justification: "" },
      module_suggere: "", criteres_acceptation: [], questions_clarification: [],
      ambigu: true, prototypes: [], commentaires: [],
    });
  };

  return (
    <div className="ds-block" style={{ margin: "6px 0 10px", padding: 14, background: "#fff", border: "1px solid var(--ds-border)" }}>
      <Segmented label="Type" options={["Bug", "Spike"]} value={type} onChange={setType} />
      <input ref={ref} className="ds-input" value={titre} onChange={e => setTitre(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder={type === "Bug" ? "Décrire le bug…" : "[SPIKE] Explorer…"} style={{ margin: "12px 0 8px" }} />
      <input className="ds-input" value={contexte} onChange={e => setCtx(e.target.value)} placeholder="Contexte (optionnel)…" style={{ marginBottom: 12 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <Button style={{ flex: 1, height: 40 }} onClick={submit} disabled={!titre.trim()}>Ajouter</Button>
        <Button variant="secondary" style={{ height: 40 }} onClick={onCancel}>Annuler</Button>
      </div>
    </div>
  );
}

/* ─── DETAIL MODAL (Epic/Feature editing) ────────────────────── */
function DetailModal({ item, onUpdate, onClose }) {
  const [local, setLocal] = useState(item);
  const save = (patch) => { const next = { ...local, ...patch }; setLocal(next); onUpdate(next); };

  return (
    <div className="ds-drawer-bg" onClick={onClose}>
      <aside className="ds-drawer" role="dialog" aria-label={local.titre} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <TypeBadge type={item.type} />
          <button className="ds-iconbtn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <InlineEdit value={local.titre} onChange={v => save({ titre: v })} multiline style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1.25 }} />

        <section style={{ marginTop: 28 }}>
          <Eyebrow style={{ marginBottom: 12 }}>Valeur métier</Eyebrow>
          <div className="ds-block" data-tone="success" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Target size={18} color="var(--ds-success-text)" style={{ flexShrink: 0, marginTop: 3 }} />
            <InlineEdit value={local.valeur_metier} onChange={v => save({ valeur_metier: v })} multiline placeholder="Bénéfice attendu, chiffré si possible…" style={{ fontSize: 15, color: "var(--ds-success-text)", lineHeight: 1.55, flex: 1 }} />
          </div>
        </section>
        <section style={{ marginTop: 28 }}>
          <Eyebrow style={{ marginBottom: 12 }}>Contexte (problème observé)</Eyebrow>
          <InlineEdit value={local.contexte} onChange={v => save({ contexte: v })} multiline placeholder="Décrire le problème observé…" style={{ fontSize: 15, color: "var(--ds-text-secondary)", lineHeight: 1.6 }} />
        </section>
        <section style={{ marginTop: 28 }}>
          <Eyebrow style={{ marginBottom: 12 }}>Critères d'acceptation</Eyebrow>
          <ACEditor criteres={local.criteres_acceptation || []} onChange={v => save({ criteres_acceptation: v })} />
        </section>
        {local.questions_clarification?.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <Eyebrow style={{ marginBottom: 12 }}>Questions à clarifier</Eyebrow>
            {local.questions_clarification.map((q, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 14.5, lineHeight: 1.55 }}><HelpCircle size={16} color="var(--ds-primary)" style={{ flexShrink: 0, marginTop: 3 }} />{q}</div>
            ))}
          </section>
        )}
      </aside>
    </div>
  );
}

/* ─── HIERARCHY TREE ─────────────────────────────────────────── */
function HierarchyTree({ backlog, activeFilter, onSelectFilter, onUpdateItem, onAddItem, drawer = false }) {
  const [expanded,  setExpanded]  = useState({ d1: true });
  const [addingTo,  setAddingTo]  = useState(null);
  const [detailItem,setDetailItem]= useState(null);

  const epics    = backlog.filter(i => i.type === "Epic");
  const toggle   = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));
  const isActive = (id) => activeFilter?.id === id;
  const handleAdd = (item) => { onAddItem(item); setAddingTo(null); };

  const execCount = (nodeId, nodeType) => {
    if (nodeType === "Epic") {
      const featIds = backlog.filter(i => i.type === "Feature" && i.parentId === nodeId).map(i => i.id);
      return backlog.filter(i => EXECUTABLE_TYPES.includes(i.type) && (i.parentId === nodeId || featIds.includes(i.parentId))).length;
    }
    return backlog.filter(i => EXECUTABLE_TYPES.includes(i.type) && i.parentId === nodeId).length;
  };

  return (
    <>
      <aside className={`ds-tree ${drawer ? "ds-tree--drawer" : ""}`} aria-label="Hiérarchie du backlog">
        <Eyebrow style={{ padding: "2px 12px 12px" }}>Hiérarchie</Eyebrow>

        <button className="ds-treeitem" aria-current={!activeFilter} onClick={() => onSelectFilter(null)} style={{ flex: "none", width: "100%" }}>
          <Layers size={17} />
          <span className="ds-treeitem__t">Tout afficher</span>
          <span className="ds-count ds-count--soft">{backlog.filter(i => EXECUTABLE_TYPES.includes(i.type)).length}</span>
        </button>

        <div style={{ height: 1, background: "var(--ds-border)", margin: "10px 6px" }} />

        {epics.map(epic => {
          const features   = backlog.filter(i => i.type === "Feature" && i.parentId === epic.id);
          const isExpanded = expanded[epic.id];
          return (
            <div key={epic.id} style={{ marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <button className="ds-mini" onClick={() => toggle(epic.id)} aria-label={isExpanded ? "Replier" : "Déplier"} aria-expanded={!!isExpanded}>
                  <ChevronRight size={16} style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform var(--dur-fast)" }} />
                </button>
                <button className="ds-treeitem" aria-current={isActive(epic.id)} title={epic.titre} onClick={() => onSelectFilter({ id: epic.id, type: "epic", label: `Epic · ${shortTitle(epic.titre)}` })}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: TYPE_CFG.Epic.dot, flexShrink: 0 }} />
                  <span className="ds-treeitem__t" style={{ fontWeight: 600 }}>{shortTitle(epic.titre)}</span>
                  <span className="ds-count ds-count--soft">{execCount(epic.id, "Epic")}</span>
                </button>
                <button className="ds-mini" onClick={() => setDetailItem(epic)} title="Modifier l'Epic" aria-label="Modifier l'Epic"><Pencil size={14} /></button>
              </div>

              {isExpanded && (
                <div style={{ marginLeft: 34, marginTop: 2, display: "grid", gap: 2 }}>
                  {features.map(feat => (
                    <div key={feat.id}>
                      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <button className="ds-treeitem" aria-current={isActive(feat.id)} title={feat.titre} onClick={() => onSelectFilter({ id: feat.id, type: "feature", label: `Feature · ${shortTitle(feat.titre)}` })}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: TYPE_CFG.Feature.dot, flexShrink: 0 }} />
                          <span className="ds-treeitem__t">{shortTitle(feat.titre)}</span>
                          <span className="ds-count ds-count--soft">{execCount(feat.id, "Feature")}</span>
                        </button>
                        <button className="ds-mini" onClick={() => setDetailItem(feat)} title="Modifier la Feature" aria-label="Modifier la Feature"><Pencil size={14} /></button>
                        <button className="ds-mini" onClick={() => setAddingTo(addingTo === feat.id ? null : feat.id)} title="Ajouter un Bug ou un Spike" aria-label="Ajouter un Bug ou un Spike" style={addingTo === feat.id ? { background: "var(--ds-primary-soft)", color: "var(--ds-primary-strong)" } : undefined}><Plus size={16} /></button>
                      </div>
                      {addingTo === feat.id && <AddChildForm parentId={feat.id} onAdd={handleAdd} onCancel={() => setAddingTo(null)} />}
                    </div>
                  ))}
                  {features.length === 0 && <span style={{ fontSize: 13.5, color: "var(--ds-text-muted)", padding: "6px 12px" }}>Aucune Feature</span>}
                </div>
              )}
            </div>
          );
        })}

        {epics.length === 0 && <div style={{ textAlign: "center", padding: 20, fontSize: 14, color: "var(--ds-text-secondary)" }}>Lance une analyse pour voir la hiérarchie.</div>}
      </aside>

      {detailItem && <DetailModal item={detailItem} onUpdate={(updated) => { onUpdateItem(updated); setDetailItem(updated); }} onClose={() => setDetailItem(null)} />}
    </>
  );
}

/* ─── DEMO BANNER ────────────────────────────────────────────── */
function DemoBanner() {
  return (
    <div className="ds-block" data-tone="warning" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "14px 18px" }}>
      <AlertCircle size={18} color="var(--ds-warning-text)" style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 14.5, color: "var(--ds-warning-text)", lineHeight: 1.5 }}><b style={{ fontWeight: 600 }}>Données de démonstration.</b> Analyse de vrais feedbacks pour voir tes statistiques.</span>
    </div>
  );
}

/* ─── THÈMES : source du feedback (traçabilité par origine) ──── */
const SOURCE_CFG = {
  "App Store":  { color: "#0369A1", bg: "#F0F9FF", border: "#BAE6FD" },
  "Play Store": { color: "#15803D", bg: "#F0FDF4", border: "#BBF7D0" },
  "Sales":      { color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  "Support":    { color: "#C2410C", bg: "#FFF4ED", border: "#FED7AA" },
  "Autre":      { color: "#6B7280", bg: "#F3F4F6", border: "#E5E7EB" },
};
const FEEDBACK_SOURCES = Object.keys(SOURCE_CFG);

/* ─── THÈMES : pipeline d'analyse avant passage au backlog ──── */
const THEME_PIPELINE = ["nouveau-signal", "en-consolidation", "valide", "pousse-backlog"];

const THEME_STATUS_CFG = {
  "nouveau-signal":   { label: "Nouveau signal",     color: "#C2410C", bg: "#FFF4ED", border: "#FED7AA", dot: "#F97316" },
  "en-consolidation": { label: "En consolidation",    color: "#A16207", bg: "#FEFCE8", border: "#FDE68A", dot: "#EAB308" },
  "valide":           { label: "Validé (prêt)",       color: "#15803D", bg: "#F0FDF4", border: "#BBF7D0", dot: "#22C55E" },
  "pousse-backlog":   { label: "Poussé au backlog",   color: "#4338CA", bg: "#EEEEFF", border: "#C7C8F5", dot: "#6366F1" },
};

const THEME_CLUSTER_PROMPT = `Tu es un expert Product Owner senior. Tu analyses un feedback brut isolé et tu le rattaches à une thématique (pain point récurrent).
IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans texte avant/après, sans backticks markdown.

Ta mission :
1. Extraire le pain point en 1 phrase courte et actionnable (ce que l'utilisateur ne peut pas faire, ou ce qui lui coûte du temps ou de l'argent).
2. Comparer ce pain point aux thèmes existants fournis en contexte (s'il y en a).
3. Décider : rattachement à un thème existant (similarité sémantique haute) OU création d'un nouveau thème.

Format JSON exact:
{
  "pain_point": "Description courte du problème observé, 1 phrase",
  "theme_match": {
    "id": "id-du-theme-existant-ou-null",
    "titre_theme": "Titre court du thème (nouveau ou existant), 6 mots max",
    "est_nouveau": true,
    "confiance": "haute" | "moyenne" | "faible"
  },
  "tags": ["tag1", "tag2"]
}

Règles :
- "theme_match.id" : id exact d'un thème existant fourni en contexte si rattachement, sinon null.
- "theme_match.est_nouveau" : true si aucun thème existant n'atteint une similarité au moins moyenne.
- "theme_match.titre_theme" : si rattachement à un thème existant, reprendre son titre à l'identique.
- "tags" : 1 à 4 tags parmi la liste : UX, Performance, Mobile, Sécurité, API, Onboarding, Reporting, Notification, Export, Authentification, Paiement, Data, Accessibilité, Recherche, Intégration, Dashboard, Admin, Offline
- Ne jamais rattacher à un thème dont le statut fourni est "pousse-backlog" (déjà traité) — proposer un nouveau thème dans ce cas.`;

const THEME_TO_BACKLOG_PROMPT = `Tu es un expert Product Owner senior. Tu synthétises un ensemble de feedbacks regroupés sous un même thème en UN backlog structuré et cohérent.
IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans texte avant/après, sans backticks markdown.

Contexte : plusieurs feedbacks distincts pointent vers le même pain point. Ta mission est de produire UNE seule synthèse hiérarchique — pas un item par feedback.

Hiérarchie : Epic → Feature → User Story / Bug / Spike.
- Génère exactement 1 item racine (Epic ou Feature selon l'ampleur du thème).
- IMPÉRATIF : la racine doit avoir AU MOINS 1 enfant de type User Story, Bug ou Spike (exécutable), et jusqu'à 4 maximum — même pour un thème avec un seul feedback ou un pain point simple. Ne jamais renvoyer un item racine seul sans enfant exécutable : un ticket qu'on ne peut pas exécuter n'a aucune valeur.
- Feature : parentId = id de l'Epic parent (si un Epic est généré).
- User Story, Bug, Spike : parentId = id de la Feature parente, ou directement de la racine si aucune Feature intermédiaire n'est générée.
- Racine : parentId = null.
- Bug : un défaut constaté ou comportement inattendu.
- Spike : investigation time-boxée (préfixe "[SPIKE]" dans le titre).

Format JSON exact:
{
  "items": [{
    "id": "item-1",
    "type": "Epic | Feature | User Story | Bug | Spike",
    "parentId": null,
    "titre": "titre de l'item",
    "contexte": "Synthèse du pain point observé à travers les feedbacks, en 1-2 phrases",
    "valeur_metier": "Bénéfice attendu, chiffré si possible",
    "criteres_acceptation": ["CA1","CA2"],
    "story_points": null,
    "priorite": { "framework":"MoSCoW","valeur":"Must Have","justification":"..." },
    "rice": null,
    "tags": [],
    "module_suggere": "...",
    "questions_clarification": ["Q1 ?"],
    "potentiel_doublon": null,
    "ambigu": false
  }]
}

Règles générales:
- Consolide, ne duplique pas : un même pain point mentionné 5 fois donne 1 item, pas 5.
- valeur_metier : quantifier en tenant compte du nombre de feedbacks reçus (ex: "remonté par 4 utilisateurs, économise...")
- story_points : laisser null
- 2-4 critères d'acceptation minimum, formulés pour couvrir l'ensemble des cas remontés

Tags fonctionnels (champ "tags") :
- Toujours renseigner 2 à 5 tags parmi : UX, Performance, Mobile, Sécurité, API, Onboarding, Reporting, Notification, Export, Authentification, Paiement, Data, Accessibilité, Recherche, Intégration, Dashboard, Admin, Offline

Scoring RICE (si framework="RICE") :
- rice.reach     : nb d'utilisateurs touchés sur 3 mois (entier) — utiliser le nombre de feedbacks distincts comme signal de reach
- rice.impact    : 1=minimal, 2=moyen, 3=fort, 5=massif
- rice.confidence: certitude estimée entre 0.1 et 1.0
- rice.effort    : effort en semaines-développeur (nombre décimal)
- rice.score     : arrondi(reach × impact × confidence / effort)
- Si framework≠RICE : laisser rice: null

Détection de doublons (si backlog existant fourni) :
- Comparer chaque item généré aux items existants fournis après les feedbacks
- Si similitude sémantique haute ou moyenne : potentiel_doublon: { "id": "id-existant", "titre": "titre court ≤50 chars", "niveau": "haute" | "moyenne" }
- Si aucun doublon : potentiel_doublon: null`;

/* ─── THÈMES : mock data ─────────────────────────────────────── */
const MOCK_INBOX = [
  { id: "fb1", date: "2026-07-20T09:12:00.000Z", texte: "Un commercial m'a dit qu'il avait raté la réponse d'un prospect chaud pendant 2 jours parce qu'il n'a aucune notification sur son téléphone quand un client répond.", apercu: "Un commercial m'a dit qu'il avait raté la réponse d'un prospect chaud pendant 2 jours parce qu'il n'a aucune notification…", painPoint: "Aucune alerte mobile quand un client répond — risque de perdre des opportunités chaudes.", tags: ["Mobile", "Notification"], themeId: "th1", source: "Sales" },
  { id: "fb2", date: "2026-07-18T14:30:00.000Z", texte: "Le support remonte encore 3 tickets cette semaine sur des contrats introuvables dans les archives.", apercu: "Le support remonte encore 3 tickets cette semaine sur des contrats introuvables dans les archives.", painPoint: "Contrats archivés introuvables via la recherche actuelle.", tags: ["Recherche"], themeId: "th2", source: "Support" },
  { id: "fb3", date: "2026-07-19T11:05:00.000Z", texte: "Une cliente a mis 20 minutes au téléphone à essayer de retrouver un contrat de 2023 avec notre support.", apercu: "Une cliente a mis 20 minutes au téléphone à essayer de retrouver un contrat de 2023 avec notre support.", painPoint: "Recherche d'archives trop lente, mauvaise expérience client.", tags: ["Recherche", "Data"], themeId: "th2", source: "Support" },
  { id: "fb4", date: "2026-07-10T08:40:00.000Z", texte: "Les commerciaux terrain n'ont pas accès aux dashboards en mobilité, ils doivent attendre d'être au bureau pour voir leurs chiffres.", apercu: "Les commerciaux terrain n'ont pas accès aux dashboards en mobilité, ils doivent attendre d'être au bureau pour voir…", painPoint: "Aucune consultation des KPIs en mobilité pour les équipes terrain.", tags: ["Mobile", "Dashboard"], themeId: "th3", source: "Sales" },
  { id: "fb5", date: "2026-07-12T16:20:00.000Z", texte: "Un manager régional a demandé si on pouvait au moins consulter le CA du mois depuis son téléphone entre deux rendez-vous.", apercu: "Un manager régional a demandé si on pouvait au moins consulter le CA du mois depuis son téléphone entre deux…", painPoint: "Besoin de consulter les indicateurs clés en déplacement.", tags: ["Mobile", "Dashboard"], themeId: "th3", source: "Sales" },
  { id: "fb6", date: "2026-07-15T10:00:00.000Z", texte: "Retour de 2 commerciaux en une semaine : ils utilisent des captures d'écran envoyées par email pour voir leurs chiffres en clientèle, faute de mieux.", apercu: "Retour de 2 commerciaux en une semaine : ils utilisent des captures d'écran envoyées par email pour voir leurs…", painPoint: "Workaround manuel (captures d'écran) pour consulter les KPIs hors bureau.", tags: ["Mobile", "Reporting"], themeId: "th3", source: "Sales" },
  { id: "fb7", date: "2026-07-05T13:15:00.000Z", texte: "Marc m'a dit en réunion que son équipe perd 2h par jour à ressaisir les données de ventes dans Excel.", apercu: "Marc m'a dit en réunion que son équipe perd 2h par jour à ressaisir les données de ventes dans Excel.", painPoint: "Ressaisie manuelle des données de vente dans Excel, 2h/jour perdues.", tags: ["Export", "Reporting"], themeId: "th4", source: "Sales" },
  { id: "fb8", date: "2026-07-06T09:50:00.000Z", texte: "Un second client a demandé si on pouvait exporter directement depuis le dashboard sans repasser par le support.", apercu: "Un second client a demandé si on pouvait exporter directement depuis le dashboard sans repasser par le support.", painPoint: "Pas d'export self-service, dépendance au support.", tags: ["Export"], themeId: "th4", source: "Support" },
];

const MOCK_THEMES = [
  { id: "th1", titre: "Notifications manquantes sur mobile", description: "Les commerciaux ne reçoivent aucune alerte quand un client important répond — ils l'apprennent trop tard.", status: "nouveau-signal", ordre: 0, feedbackIds: ["fb1"], tags: ["Mobile", "Notification"], createdAt: "2026-07-20T09:12:00.000Z", updatedAt: "2026-07-20T09:12:00.000Z", backlogItemIds: [], pushedAt: null },
  { id: "th2", titre: "Recherche de contrats archivés trop lente", description: "Le support reçoit des tickets récurrents : les contrats de plus d'un an sont quasi introuvables dans la recherche actuelle.", status: "en-consolidation", ordre: 0, feedbackIds: ["fb2", "fb3"], tags: ["Recherche", "Data"], createdAt: "2026-07-18T14:30:00.000Z", updatedAt: "2026-07-19T11:05:00.000Z", backlogItemIds: [], pushedAt: null },
  { id: "th3", titre: "Suivi des KPIs en mobilité pour le terrain", description: "Trois retours distincts confirment que les commerciaux terrain veulent consulter leurs chiffres sans revenir au bureau.", status: "valide", ordre: 0, feedbackIds: ["fb4", "fb5", "fb6"], tags: ["Mobile", "Dashboard", "Reporting"], createdAt: "2026-07-10T08:40:00.000Z", updatedAt: "2026-07-15T10:00:00.000Z", backlogItemIds: [], pushedAt: null },
  { id: "th4", titre: "Export des données de vente vers Excel", description: "Ressaisie manuelle chronophage et absence d'export self-service, remontées par plusieurs comptes.", status: "pousse-backlog", ordre: 0, feedbackIds: ["fb7", "fb8"], tags: ["Export", "Reporting"], createdAt: "2026-07-05T13:15:00.000Z", updatedAt: "2026-07-06T09:50:00.000Z", backlogItemIds: ["d1", "d2"], pushedAt: "2026-07-06T09:50:00.000Z" },
];

/* ─── THÈMES : persistance (pattern BACKLOG_KEY) ─────────────── */
const INBOX_KEY = "feedbackpo_inbox";
const loadInbox = () => {
  try { const raw = localStorage.getItem(INBOX_KEY); return raw === null ? MOCK_INBOX : JSON.parse(raw); }
  catch { return MOCK_INBOX; }
};
const saveInbox = (inbox) => { try { localStorage.setItem(INBOX_KEY, JSON.stringify(inbox)); } catch {} };

const THEMES_KEY = "feedbackpo_themes";
const loadThemes = () => {
  try { const raw = localStorage.getItem(THEMES_KEY); return raw === null ? MOCK_THEMES : JSON.parse(raw); }
  catch { return MOCK_THEMES; }
};
const saveThemes = (themes) => { try { localStorage.setItem(THEMES_KEY, JSON.stringify(themes)); } catch {} };

/* ─── THÈMES : IA + utils ─────────────────────────────────────── */
const defaultThemeStatus = (currentStatus, feedbackCount) =>
  currentStatus === "nouveau-signal" && feedbackCount > 1 ? "en-consolidation" : currentStatus;

/* Estimation rapide (heuristique, avant appel IA) pour aider à trier d'un coup d'œil.
   Le score définitif est recalculé par l'IA au moment du push vers le backlog. */
const estimateThemePriority = (feedbackCount, framework) => {
  if (framework === "RICE") {
    const reach = feedbackCount * 15;
    const score = Math.round((reach * 2 * 0.7) / 2);
    return { framework: "RICE", label: `RICE ~${score}`, sub: `reach ~${reach}` };
  }
  const valeur = feedbackCount >= 3 ? "Must Have" : feedbackCount === 2 ? "Should Have" : "Could Have";
  return { framework: "MoSCoW", label: valeur, p: MOSCOW_TO_P[valeur] };
};

/* Impact business estimé pour un thème pas encore poussé — donne toujours une lecture
   business (volume de signal), en complément du pain point factuel. */
const estimateBusinessImpact = (feedbackCount) => {
  if (feedbackCount >= 3) return `Signal fort : ${feedbackCount} retours distincts — risque d'insatisfaction ou de perte d'efficacité récurrente si non traité.`;
  if (feedbackCount === 2) return `Signal confirmé : ${feedbackCount} retours indépendants — tendance à surveiller avant qu'elle ne s'aggrave.`;
  return `Signal isolé : 1 retour à date — à consolider avant priorisation ferme.`;
};

async function clusterFeedback(feedbackText, openThemes) {
  const ctx = openThemes.length
    ? `\n\n--- THÈMES EXISTANTS (${openThemes.length}) ---\n` +
      openThemes.map(t => `[${t.id}] ${t.titre} — ${t.description}`).join("\n")
    : "";
  const res = await callClaude(JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 400, system: THEME_CLUSTER_PROMPT, messages: [{ role: "user", content: `Feedback:\n${feedbackText}${ctx}` }] }));
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403 || res.status === 500 || res.status === 502) throw new Error(err?.error?.message || "Service IA indisponible côté serveur.");
    if (res.status === 429 || res.status === 503) throw new Error(err?.error?.message || "Limite d'usage atteinte. Réessaie plus tard.");
    throw new Error(`Erreur ${res.status} : ${err?.error?.message || "Réessayez."}`);
  }
  const data = await res.json();
  const txt  = (data.content?.[0]?.text || "").replace(/```json\n?|```\n?/g, "").trim();
  return JSON.parse(txt);
}

async function pushThemeToBacklog({ theme, feedbackEntries, backlog, framework = "MoSCoW" }) {
  const feedbackBlock = feedbackEntries.map((f, i) => `Feedback ${i + 1} : ${f.texte}`).join("\n\n");
  const existingCtx = backlog.length > 0
    ? `\n\n--- BACKLOG EXISTANT (${backlog.length} items — détecte les doublons) ---\n` +
      backlog.slice(0, 30).map(i => `[${i.id}] [${i.type}] ${i.titre}`).join("\n")
    : "";
  const res = await callClaude(JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4096, system: THEME_TO_BACKLOG_PROMPT, messages: [{ role: "user", content: `Framework: ${framework}\nThème : "${theme.titre}"\n\nFeedbacks regroupés (${feedbackEntries.length}) :\n${feedbackBlock}${existingCtx}` }] }));
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403 || res.status === 500 || res.status === 502) throw new Error(err?.error?.message || "Service IA indisponible côté serveur.");
    if (res.status === 429 || res.status === 503) throw new Error(err?.error?.message || "Limite d'usage atteinte. Réessaie plus tard.");
    throw new Error(`Erreur ${res.status} : ${err?.error?.message || "Réessayez."}`);
  }
  const data   = await res.json();
  const txt    = (data.content?.[0]?.text || "").replace(/```json\n?|```\n?/g, "").trim();
  const parsed = JSON.parse(txt).items || [];

  /* L'IA réutilise toujours les mêmes ids génériques ("item-1"...) d'un push à l'autre —
     on les remappe vers des ids uniques pour éviter toute collision avec un push précédent. */
  const idMap = {};
  parsed.forEach(item => { idMap[item.id] = makeId(); });
  const remapped = parsed.map(item => ({
    ...item,
    id: idMap[item.id],
    parentId: item.parentId ? (idMap[item.parentId] ?? null) : null,
  }));

  return remapped.map(item => ({
    ...item, status: defaultStatus(item), ordre: 0,
    prototypes: [], commentaires: [], valeur_metier: item.valeur_metier || "",
    tags: item.tags || [], rice: item.rice || null,
    potentiel_doublon: item.potentiel_doublon || null,
  }));
}

/* ─── THÈMES : rapport partageable (export direction) ────────── */
const hexColor = (c) => c.replace("#", "");

async function exportThemesReportPPTX(themes, feedbackInbox, backlog) {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Ernestine Matjabo";
  pres.title = "Rapport Feedback → Backlog";

  const date          = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const pushedCount    = themes.filter(t => t.status === "pousse-backlog").length;
  const conversionRate = themes.length ? Math.round((pushedCount / themes.length) * 100) : 0;
  const sorted         = themes.slice().sort((a, b) => b.feedbackIds.length - a.feedbackIds.length);

  /* Slide 1 — Titre */
  const cover = pres.addSlide();
  cover.background = { color: hexColor(T.primary) };
  cover.addText("FEEDBACKPO", { x: 0.6, y: 0.5, w: 9, h: 0.4, fontSize: 13, bold: true, color: "FFFFFF", charSpacing: 3 });
  cover.addText("Rapport Feedback → Backlog", { x: 0.6, y: 2.0, w: 9, h: 1.2, fontSize: 34, bold: true, color: "FFFFFF" });
  cover.addText(date, { x: 0.6, y: 3.1, w: 9, h: 0.5, fontSize: 14, color: "E0E0FF" });

  /* Slide 2 — Synthèse (stats + barres) */
  const synth = pres.addSlide();
  synth.addText("Synthèse", { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, bold: true, color: hexColor(T.text) });

  const stats = [
    { label: "Feedbacks reçus",     value: String(feedbackInbox.length), color: hexColor(T.primary) },
    { label: "Thèmes identifiés",   value: String(themes.length),        color: "7C3AED" },
    { label: "Taux de conversion",  value: `${conversionRate}%`,          color: hexColor(T.success) },
    { label: "Poussés au backlog",  value: String(pushedCount),          color: hexColor(T.orange) },
  ];
  stats.forEach((s, i) => {
    const x = 0.5 + i * 2.35;
    synth.addShape(pres.ShapeType.roundRect, { x, y: 1.1, w: 2.1, h: 1.3, fill: { color: "F6F6FB" }, line: { color: "E8E8F0", width: 1 }, rectRadius: 0.08 });
    synth.addText(s.value, { x, y: 1.25, w: 2.1, h: 0.6, align: "center", fontSize: 28, bold: true, color: s.color });
    synth.addText(s.label, { x, y: 1.85, w: 2.1, h: 0.4, align: "center", fontSize: 10, color: hexColor(T.textMuted) });
  });

  if (themes.length) {
    const barData = [{
      name: "Feedbacks",
      labels: sorted.map(t => t.titre.length > 26 ? t.titre.slice(0, 26) + "…" : t.titre),
      values: sorted.map(t => t.feedbackIds.length),
    }];
    synth.addChart(pres.ChartType.bar, barData, {
      x: 0.5, y: 2.8, w: 9, h: 2.5, barDir: "col", chartColors: [hexColor(T.primary)],
      showTitle: true, title: "Feedbacks par thème", titleFontSize: 12,
      showLegend: false, catAxisLabelFontSize: 8, valAxisLabelFontSize: 9,
      showValue: true, dataLabelFontSize: 9,
    });
  }

  /* Slide 3 — Répartition par statut (camembert) */
  if (themes.length) {
    const pie = pres.addSlide();
    pie.addText("Répartition des thèmes par statut", { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, bold: true, color: hexColor(T.text) });
    const pieData = [{
      name: "Statuts",
      labels: THEME_PIPELINE.map(s => THEME_STATUS_CFG[s].label),
      values: THEME_PIPELINE.map(s => themes.filter(t => t.status === s).length),
    }];
    pie.addChart(pres.ChartType.pie, pieData, {
      x: 1.7, y: 1.2, w: 6.6, h: 4.1,
      chartColors: THEME_PIPELINE.map(s => hexColor(THEME_STATUS_CFG[s].dot)),
      showLegend: true, legendPos: "r", legendFontSize: 11,
      showValue: true, dataLabelFontSize: 11, dataLabelColor: "FFFFFF",
    });
  }

  /* Slide — Roadmap produit (Now / Next / Later) */
  const roadmapItems = backlog.filter(i => HIERARCHY_TYPES.includes(i.type));
  if (roadmapItems.length) {
    const roadmap = pres.addSlide();
    roadmap.addText("Roadmap produit", { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, bold: true, color: hexColor(T.text) });

    const ROADMAP_BUCKETS = [
      { label: "NOW",   sub: "Sprint en cours",               statuses: ["pret-pour-dev"],                          color: T.success },
      { label: "NEXT",  sub: "Prochain sprint / en affinage",  statuses: ["prochain-sprint", "en-affinage"],         color: T.primary },
      { label: "LATER", sub: "À clarifier",                    statuses: ["a-clarifier"],                            color: "#EA580C" },
    ];

    ROADMAP_BUCKETS.forEach((bucket, i) => {
      const x = 0.5 + i * 3.05;
      const items = roadmapItems.filter(it => bucket.statuses.includes(it.status));
      roadmap.addShape(pres.ShapeType.roundRect, { x, y: 1.1, w: 2.85, h: 4.2, fill: { color: "F6F6FB" }, line: { color: hexColor(bucket.color), width: 1.5 }, rectRadius: 0.03 });
      roadmap.addText(bucket.label, { x: x + 0.15, y: 1.25, w: 2.55, h: 0.35, fontSize: 15, bold: true, color: hexColor(bucket.color) });
      roadmap.addText(bucket.sub, { x: x + 0.15, y: 1.55, w: 2.55, h: 0.3, fontSize: 9.5, color: hexColor(T.textSubtle) });
      const listText = items.length
        ? items.map(it => ({ text: `[${it.type}] ${shortTitle(it.titre)}`, options: { bullet: true, breakLine: true } }))
        : [{ text: "Rien pour l'instant" }];
      roadmap.addText(listText, { x: x + 0.15, y: 1.95, w: 2.55, h: 3.2, fontSize: 10.5, color: hexColor(T.text), valign: "top" });
    });
  }

  /* Slide — Sprint Review (ce qui a été livré / est prêt à démontrer) */
  const sprint       = loadSprint();
  const sprintItems  = backlog.filter(i => i.status === "pret-pour-dev" && EXECUTABLE_TYPES.includes(i.type));
  if (sprintItems.length) {
    const review = pres.addSlide();
    review.addText(`Sprint Review — ${sprint.name}`, { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, bold: true, color: hexColor(T.text) });
    const usedSP  = sprintItems.filter(i => i.story_points).reduce((s, i) => s + i.story_points, 0);
    const visible = sprintItems.slice(0, 6);
    const extra   = sprintItems.length - visible.length;
    review.addText(`${sprintItems.length} ticket${sprintItems.length > 1 ? "s" : ""} prêt${sprintItems.length > 1 ? "s" : ""} à démontrer — ${usedSP} / ${sprint.capacity} SP`, { x: 0.5, y: 0.95, w: 9, h: 0.35, fontSize: 12.5, color: hexColor(T.textMuted) });

    let y = 1.5;
    visible.forEach(item => {
      const tcfg   = TYPE_CFG[item.type] || TYPE_CFG["User Story"];
      const rowH   = item.valeur_metier ? 0.85 : 0.55;
      review.addShape(pres.ShapeType.roundRect, { x: 0.5, y, w: 9, h: rowH, fill: { color: "FAFAFD" }, line: { color: "E8E8F0", width: 1 }, rectRadius: 0.03 });
      const titleRuns = [
        { text: `[${item.type}]  `, options: { bold: true, color: hexColor(tcfg.color) } },
        { text: shortTitle(item.titre), options: { bold: true, color: hexColor(T.text) } },
      ];
      if (item.story_points) titleRuns.push({ text: `   ⚡ ${item.story_points} SP`, options: { color: hexColor(T.primary) } });
      review.addText(titleRuns, { x: 0.65, y: y + 0.08, w: 8.7, h: 0.3, fontSize: 12 });
      if (item.valeur_metier) {
        review.addText(item.valeur_metier, { x: 0.65, y: y + 0.4, w: 8.7, h: 0.4, fontSize: 10.5, italic: true, color: hexColor(T.textMuted) });
      }
      y += rowH + 0.12;
    });
    if (extra > 0) {
      review.addText(`+ ${extra} autre${extra > 1 ? "s" : ""} ticket${extra > 1 ? "s" : ""} dans ce sprint`, { x: 0.5, y, w: 9, h: 0.3, fontSize: 10.5, italic: true, color: hexColor(T.textSubtle) });
    }
  }

  /* Slides suivantes — 1 par thème */
  sorted.forEach(theme => {
    const cfg     = THEME_STATUS_CFG[theme.status] || THEME_STATUS_CFG["nouveau-signal"];
    const members = feedbackInbox.filter(f => theme.feedbackIds.includes(f.id));
    const slide   = pres.addSlide();

    slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.12, fill: { color: hexColor(cfg.dot) } });
    slide.addText(theme.titre, { x: 0.5, y: 0.4, w: 9, h: 0.7, fontSize: 22, bold: true, color: hexColor(T.text) });

    slide.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 1.1, w: 2.3, h: 0.35, fill: { color: hexColor(cfg.bg) }, line: { color: hexColor(cfg.border), width: 1 }, rectRadius: 0.5 });
    slide.addText(cfg.label, { x: 0.5, y: 1.1, w: 2.3, h: 0.35, align: "center", valign: "middle", fontSize: 11, bold: true, color: hexColor(cfg.color) });

    slide.addText([
      { text: "Pain point : ", options: { bold: true } },
      { text: theme.description || "—" },
    ], { x: 0.5, y: 1.65, w: 9, h: 0.7, fontSize: 13, color: hexColor(T.textMuted) });

    if (theme.tags?.length) {
      slide.addText(theme.tags.join("   ·   "), { x: 0.5, y: 2.3, w: 9, h: 0.35, fontSize: 10.5, bold: true, color: hexColor(T.primary) });
    }

    const pushedItems = theme.status === "pousse-backlog" && theme.backlogItemIds?.length
      ? backlog.filter(i => theme.backlogItemIds.includes(i.id))
      : [];
    const withValue = pushedItems.filter(i => i.valeur_metier);
    const impactText = withValue.length
      ? withValue.map(i => i.valeur_metier).join("  ·  ")
      : estimateBusinessImpact(members.length);

    /* Impact business — toujours visible, mis en avant visuellement */
    let y = 2.8;
    slide.addText("IMPACT BUSINESS", { x: 0.5, y, w: 9, h: 0.3, fontSize: 11, bold: true, charSpacing: 1, color: hexColor(T.success) });
    y += 0.35;
    const boxH = impactText.length > 110 ? 1.05 : 0.75;
    slide.addShape(pres.ShapeType.roundRect, { x: 0.5, y, w: 9, h: boxH, fill: { color: hexColor(T.successLight) }, line: { color: hexColor(T.successBorder), width: 1 }, rectRadius: 0.04 });
    slide.addText(impactText, { x: 0.7, y, w: 8.6, h: boxH, valign: "middle", fontSize: 12.5, bold: !withValue.length ? false : true, color: "14532D" });
    y += boxH + 0.25;

    if (pushedItems.length) {
      const linkUrl = `${window.location.origin}${window.location.pathname}?item=${theme.backlogItemIds[0]}`;
      slide.addText([
        { text: `🎫 ${pushedItems.length} ticket${pushedItems.length > 1 ? "s" : ""} généré${pushedItems.length > 1 ? "s" : ""}   `, options: { color: hexColor(T.text) } },
        { text: "→ Voir dans le backlog", options: { hyperlink: { url: linkUrl }, color: hexColor(T.primary), bold: true, underline: true } },
      ], { x: 0.5, y, w: 9, h: 0.35, fontSize: 12 });
    } else {
      const est = estimateThemePriority(members.length, "MoSCoW");
      slide.addText([
        { text: "Priorité estimée : ", options: { bold: true } },
        { text: `${est.p} · ${est.label} (précisée lors du passage au backlog)` },
      ], { x: 0.5, y, w: 9, h: 0.35, fontSize: 11.5, color: hexColor(T.textMuted) });
    }

    slide.addText(`${members.length} feedback${members.length > 1 ? "s" : ""} consolidé${members.length > 1 ? "s" : ""}`, { x: 0.5, y: 5.15, w: 9, h: 0.3, fontSize: 9.5, italic: true, color: hexColor(T.textSubtle) });
  });

  await pres.writeFile({ fileName: `rapport-themes-${new Date().toISOString().slice(0, 10)}.pptx` });
}

/* ─── THÈMES : carte + drag ──────────────────────────────────── */
const THEME_TONE = { "nouveau-signal": "warning", "en-consolidation": undefined, "valide": "success", "pousse-backlog": "primary" };
const PRIO_TONE  = { "Must Have": "danger", "Should Have": "warning" };

function ThemeCard({ theme, feedbackItems, framework = "MoSCoW", onOpenDetail, onPush, pushing, onGoToBacklogItem, isDragging = false, dragListeners, dragAttributes }) {
  const cfg = THEME_STATUS_CFG[theme.status] || THEME_STATUS_CFG["nouveau-signal"];
  const quotes = feedbackItems.slice(0, 2);
  const extra = feedbackItems.length - quotes.length;
  const estimate = theme.status === "pousse-backlog" ? null : estimateThemePriority(feedbackItems.length, framework);
  const sources = [...new Set(feedbackItems.map(f => f.source || "Autre"))];
  const pushed = theme.status === "pousse-backlog";

  return (
    <article className="ds-themecard" data-dragging={isDragging || undefined} onClick={() => onOpenDetail?.(theme)}>
      {dragListeners && <div className="ds-grip" {...dragListeners} {...dragAttributes} onClick={e => e.stopPropagation()} aria-label="Déplacer le thème"><GripVertical size={16} style={{ transform: "rotate(90deg)" }} /></div>}
      <div className="ds-themecard__body" style={dragListeners ? { paddingTop: 10 } : undefined}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <Pill tone={THEME_TONE[theme.status]} dot>{cfg.label}</Pill>
          {estimate && (
            <span title="Estimation avant passage au backlog, recalculée par l'IA au moment du push">
              <Pill tone={estimate.framework === "MoSCoW" ? PRIO_TONE[estimate.label] : "primary"}>
                {estimate.p ? `${estimate.p} · ${estimate.label}` : estimate.label}
              </Pill>
            </span>
          )}
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <h3>{theme.titre}</h3>
          <p>{theme.description}</p>
        </div>

        {quotes.length > 0 && (
          <div style={{ display: "grid", gap: 10 }}>
            {quotes.map(fb => <div key={fb.id} className="ds-quote">{fb.apercu}</div>)}
            {extra > 0 && <span style={{ fontSize: 13, color: "var(--ds-text-muted)" }}>+{extra} autre{extra > 1 ? "s" : ""}</span>}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Pill><Users size={13} /> {feedbackItems.length} feedback{feedbackItems.length > 1 ? "s" : ""}</Pill>
          {(theme.tags || []).slice(0, 3).map(tag => <span key={tag} className="ds-tag">{tag}</span>)}
        </div>
        {sources.length > 0 && <div style={{ fontSize: 13, color: "var(--ds-text-muted)" }}>Source{sources.length > 1 ? "s" : ""} · {sources.join(", ")}</div>}

        <div style={{ marginTop: "auto", paddingTop: 4 }} onClick={e => e.stopPropagation()}>
          {pushed ? (
            theme.backlogItemIds?.length > 0 && <Button variant="secondary" style={{ width: "100%" }} onClick={() => onGoToBacklogItem?.(theme.backlogItemIds[0])}>Voir dans le Backlog <ArrowRight size={16} /></Button>
          ) : (
            <Button style={{ width: "100%" }} onClick={() => onPush?.(theme)} disabled={pushing}>
              {pushing ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Génération…</> : <><ArrowRight size={16} /> Pousser vers le backlog</>}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function SortableThemeCard({ theme, feedbackItems, framework, onOpenDetail, onPush, pushing, onGoToBacklogItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: theme.id, disabled: theme.status === "pousse-backlog" });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 999 : undefined, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      <ThemeCard theme={theme} feedbackItems={feedbackItems} framework={framework} onOpenDetail={onOpenDetail} onPush={onPush} pushing={pushing} onGoToBacklogItem={onGoToBacklogItem} dragListeners={theme.status === "pousse-backlog" ? undefined : listeners} dragAttributes={attributes} />
    </div>
  );
}

/* ─── THÈMES : Kanban de maturation ───────────────────────────── */
function ThemeKanbanColumn({ statusKey, themes, feedbackInbox, framework, onOpenDetail, onPush, pushingId, onGoToBacklogItem }) {
  const cfg = THEME_STATUS_CFG[statusKey];
  const droppable = statusKey !== "pousse-backlog";
  const { setNodeRef, isOver } = useDroppable({ id: statusKey, disabled: !droppable });
  return (
    <section className="ds-col" aria-label={cfg.label}>
      <div className="ds-col__head">
        <b>{cfg.label}</b>
        <Pill tone={THEME_TONE[statusKey]}>{themes.length}</Pill>
      </div>
      <div ref={setNodeRef} className="ds-col__drop" data-empty={themes.length === 0 || undefined} data-over={isOver || undefined}>
        {themes.length === 0 && (droppable ? "Dépose un thème ici" : "Aucun thème poussé")}
        <SortableContext items={themes.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {themes.map(theme => (
            <SortableThemeCard key={theme.id} theme={theme} feedbackItems={feedbackInbox.filter(f => theme.feedbackIds.includes(f.id))} framework={framework} onOpenDetail={onOpenDetail} onPush={onPush} pushing={pushingId === theme.id} onGoToBacklogItem={onGoToBacklogItem} />
          ))}
        </SortableContext>
      </div>
    </section>
  );
}

function ThemeKanbanBoard({ themes, feedbackInbox, framework, onThemesChange, onOpenDetail, onPush, pushingId, onGoToBacklogItem }) {
  const [activeId, setActiveId] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const findContainer = (id) => THEME_PIPELINE.includes(id) ? id : themes.find(t => t.id === id)?.status;
  const onDragStart = ({ active }) => setActiveId(active.id);

  const onDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over) return;
    const overContainer = findContainer(over.id);
    const activeTheme   = themes.find(t => t.id === active.id);
    if (!activeTheme || !overContainer) return;
    if (overContainer === "pousse-backlog" || activeTheme.status === "pousse-backlog") return;

    const colThemes  = themes.filter(t => t.status === overContainer);
    const overIndex  = colThemes.findIndex(t => t.id === over.id);
    let next = themes.map(t => t.id === activeTheme.id ? { ...t, status: overContainer, updatedAt: new Date().toISOString() } : t);
    if (activeTheme.status === overContainer && overIndex !== -1) {
      const activeIndex  = colThemes.findIndex(t => t.id === active.id);
      const reordered    = arrayMove(colThemes, activeIndex, overIndex);
      const reorderedIds = reordered.map(t => t.id);
      next = next.map(t => colThemes.some(c => c.id === t.id) ? { ...t, ordre: reorderedIds.indexOf(t.id) } : t);
    }
    onThemesChange(next);
  };

  const activeTheme = activeId ? themes.find(t => t.id === activeId) : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(300px, 1fr))", gap: 16, alignItems: "start", overflowX: "auto", paddingBottom: 12 }}>
        {THEME_PIPELINE.map(col => {
          const colThemes = themes.filter(t => t.status === col).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
          return <ThemeKanbanColumn key={col} statusKey={col} themes={colThemes} feedbackInbox={feedbackInbox} framework={framework} onOpenDetail={onOpenDetail} onPush={onPush} pushingId={pushingId} onGoToBacklogItem={onGoToBacklogItem} />;
        })}
      </div>
      <DragOverlay>{activeTheme && <ThemeCard theme={activeTheme} feedbackItems={feedbackInbox.filter(f => activeTheme.feedbackIds.includes(f.id))} framework={framework} isDragging />}</DragOverlay>
    </DndContext>
  );
}

/* ─── THÈMES : vue cartes + tuiles de statut ──────────────────── */
function ThemeGroupedView({ themes, feedbackInbox, framework, onOpenDetail, onPush, pushingId, onGoToBacklogItem }) {
  const isMobile = useIsMobile(900);
  const [filter, setFilter]       = useState(null);
  const [sourceFilter, setSource] = useState(null);

  const themeSources = (theme) => [...new Set(feedbackInbox.filter(f => theme.feedbackIds.includes(f.id)).map(f => f.source || "Autre"))];
  const filtered = themes
    .filter(t => !filter || t.status === filter)
    .filter(t => !sourceFilter || themeSources(t).includes(sourceFilter));
  const sourceOptions = FEEDBACK_SOURCES.map(s => [s, themes.filter(t => themeSources(t).includes(s)).length]).filter(([, n]) => n > 0);

  return (
    <div>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))" }}>
        {THEME_PIPELINE.map(status => {
          const cfg = THEME_STATUS_CFG[status];
          const count = themes.filter(t => t.status === status).length;
          return (
            <button key={status} className="ds-stat" aria-pressed={filter === status} onClick={() => setFilter(filter === status ? null : status)}>
              <span className="ds-stat__n">{count}</span>
              <span className="ds-stat__l"><span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot }} />{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {sourceOptions.length > 1 && (
        <div style={{ margin: "22px 0 4px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Eyebrow>Source</Eyebrow>
          <div className="ds-seg" role="group" aria-label="Filtrer par source">
            <button aria-pressed={!sourceFilter} onClick={() => setSource(null)}>Toutes</button>
            {sourceOptions.map(([s, n]) => <button key={s} aria-pressed={sourceFilter === s} onClick={() => setSource(sourceFilter === s ? null : s)}>{s} · {n}</button>)}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "repeat(auto-fill, minmax(330px, 1fr))", gap: 20, marginTop: 20, alignItems: "stretch" }}>
        {filtered.map(theme => (
          <ThemeCard key={theme.id} theme={theme} feedbackItems={feedbackInbox.filter(f => theme.feedbackIds.includes(f.id))} framework={framework} onOpenDetail={onOpenDetail} onPush={onPush} pushing={pushingId === theme.id} onGoToBacklogItem={onGoToBacklogItem} />
        ))}
      </div>
      {filtered.length === 0 && (
        <Card style={{ textAlign: "center", marginTop: 20, padding: 40 }}>
          <div className="ds-card__title">Aucun thème pour ce filtre</div>
          <div className="ds-card__sub">Retire un filtre pour revoir tous les thèmes.</div>
        </Card>
      )}
    </div>
  );
}

/* ─── THÈMES : tiroir de détail ───────────────────────────────── */
function ThemeDetailPanel({ theme, feedbackItems, onUpdate, onUpdateFeedback, onDelete, onPush, pushing, onGoToBacklogItem, onClose }) {
  const [confirmDelete, setConfirm] = useState(false);
  const cfg = THEME_STATUS_CFG[theme.status] || THEME_STATUS_CFG["nouveau-signal"];
  const sources = [...new Set(feedbackItems.map(f => f.source || "Autre"))];

  return (
    <div className="ds-drawer-bg" onClick={onClose}>
      <aside className="ds-drawer" role="dialog" aria-label={theme.titre} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <Pill tone={THEME_TONE[theme.status]} dot>{cfg.label}</Pill>
          <button className="ds-iconbtn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        <InlineEdit value={theme.titre} onChange={titre => onUpdate({ ...theme, titre })} style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1.2, color: "var(--ds-text)", marginBottom: 12 }} />
        <InlineEdit value={theme.description} onChange={description => onUpdate({ ...theme, description })} multiline placeholder="Décrire le pain point…" style={{ fontSize: 15, color: "var(--ds-text-secondary)", lineHeight: 1.6, marginBottom: 18 }} />

        {(theme.tags?.length > 0 || sources.length > 0) && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 26 }}>
            {(theme.tags || []).map(tag => <span key={tag} className="ds-tag">{tag}</span>)}
            {sources.map(s => <Pill key={s}>{s}</Pill>)}
          </div>
        )}

        <Eyebrow style={{ marginBottom: 12 }}>{feedbackItems.length} feedback{feedbackItems.length > 1 ? "s" : ""} regroupé{feedbackItems.length > 1 ? "s" : ""}</Eyebrow>
        <div style={{ display: "grid", gap: 12, marginBottom: 26 }}>
          {feedbackItems.map(fb => (
            <div key={fb.id} style={{ background: "var(--ds-surface-muted)", borderRadius: 20, padding: "16px 18px" }}>
              <select className="ds-select" value={fb.source || "Autre"} onChange={e => onUpdateFeedback?.(fb.id, { source: e.target.value })} aria-label="Source de ce feedback" style={{ marginBottom: 10 }}>
                {FEEDBACK_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div style={{ fontSize: 14.5, color: "var(--ds-text)", lineHeight: 1.6 }}>{fb.texte}</div>
              {fb.painPoint && <div style={{ fontSize: 13.5, color: "var(--ds-primary-strong)", fontWeight: 500, marginTop: 10 }}>Pain point · {fb.painPoint}</div>}
            </div>
          ))}
        </div>

        {theme.status !== "pousse-backlog" && (
          <Button size="lg" style={{ width: "100%", marginBottom: 12 }} onClick={() => onPush(theme)} disabled={pushing}>
            {pushing ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Génération du ticket…</> : <><ArrowRight size={18} /> Pousser vers le backlog</>}
          </Button>
        )}
        {theme.status === "pousse-backlog" && theme.backlogItemIds?.length > 0 && (
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            {theme.backlogItemIds.map(id => <Button key={id} variant="secondary" onClick={() => onGoToBacklogItem(id)}>Voir #{toRef(id)} dans le Backlog <ArrowRight size={16} /></Button>)}
          </div>
        )}

        <div style={{ borderTop: "1px solid var(--ds-border)", marginTop: 20, paddingTop: 18 }}>
          {confirmDelete ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, color: "var(--ds-danger-text)", flex: 1, minWidth: 200 }}>Supprimer ce thème ? Les feedbacks resteront dans l'inbox, non rattachés.</span>
              <Button variant="secondary" onClick={() => setConfirm(false)} style={{ height: 38 }}>Annuler</Button>
              <Button onClick={() => onDelete(theme.id)} style={{ height: 38, background: "var(--ds-danger)", boxShadow: "none" }}>Supprimer</Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirm(true)} style={{ color: "var(--ds-danger-text)", paddingLeft: 0 }}><Trash2 size={16} /> Supprimer ce thème</Button>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ─── PAGE: THÈMES ────────────────────────────────────────────── */
function PageThemes({ themes, feedbackInbox, backlog, onSetThemes, onSetInbox, onSetBacklog, onGoToBacklogItem, onNavigate }) {
  const isMobile = useIsMobile(900);
  const [view, setView]           = useState("Cartes");
  const [detailId, setDetailId]   = useState(null);
  const [pushingId, setPushingId] = useState(null);
  const [pushError, setPushError] = useState("");
  const [framework, setFramework] = useState("MoSCoW");
  const [exportingReport, setExportingReport] = useState(false);

  const handleExportReport = async () => {
    setExportingReport(true);
    try { await exportThemesReportPPTX(themes, feedbackInbox, backlog); }
    catch (e) { setPushError(e.message || "Erreur lors de la génération du rapport."); }
    finally { setExportingReport(false); }
  };

  const detailTheme = detailId ? themes.find(t => t.id === detailId) : null;
  const handleUpdate = (updated) => onSetThemes(themes.map(t => t.id === updated.id ? updated : t));
  const handleUpdateFeedback = (fbId, patch) => onSetInbox(feedbackInbox.map(f => f.id === fbId ? { ...f, ...patch } : f));

  const handleDelete = (id) => {
    onSetInbox(feedbackInbox.map(fb => fb.themeId === id ? { ...fb, themeId: null } : fb));
    onSetThemes(themes.filter(t => t.id !== id));
    setDetailId(null);
  };

  const handlePush = async (theme) => {
    setPushingId(theme.id); setPushError("");
    try {
      const feedbackEntries = feedbackInbox.filter(f => theme.feedbackIds.includes(f.id));
      const items    = await pushThemeToBacklog({ theme, feedbackEntries, backlog, framework });
      const rootIds  = items.filter(i => !i.parentId).map(i => i.id);
      onSetBacklog([...backlog, ...items]);
      onSetThemes(themes.map(t => t.id === theme.id
        ? { ...t, status: "pousse-backlog", backlogItemIds: rootIds.length ? rootIds : items.map(i => i.id), pushedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        : t));
    } catch (e) { setPushError(e.message || "Erreur inattendue."); }
    finally { setPushingId(null); }
  };

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: `${isMobile ? 24 : 40}px ${isMobile ? 20 : 40}px 56px` }}>
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 28 }}>
          <div>
            <Eyebrow>{themes.length} thème{themes.length > 1 ? "s" : ""} · {feedbackInbox.length} feedback{feedbackInbox.length > 1 ? "s" : ""}</Eyebrow>
            <h1 style={{ fontSize: isMobile ? 30 : 40, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--ds-text)", margin: "6px 0 8px" }}>Thèmes</h1>
            <p style={{ fontSize: 15.5, color: "var(--ds-text-secondary)", maxWidth: 520, lineHeight: 1.5 }}>Tous les feedbacks reçus, regroupés par pain point.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Segmented label="Framework de priorisation" options={["MoSCoW", "RICE"]} value={framework} onChange={setFramework} />
            <Segmented label="Vue" options={["Cartes", "Kanban"]} value={view} onChange={setView} />
            <Button variant="secondary" onClick={handleExportReport} disabled={themes.length === 0 || exportingReport} title="Générer un PowerPoint partageable avec la direction (synthèse + graphiques)">
              {exportingReport ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={16} />}
              {exportingReport ? "Génération…" : "Exporter en PowerPoint"}
            </Button>
          </div>
        </header>

        {pushError && (
          <div role="alert" style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, padding: "12px 16px", borderRadius: 14, background: "var(--ds-danger-bg)", color: "var(--ds-danger-text)", fontSize: 14 }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} /> {pushError}
          </div>
        )}

        {themes.length === 0 ? (
          <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "56px 24px", gap: 8 }}>
            <span style={{ width: 64, height: 64, borderRadius: 20, background: "var(--ds-primary-soft)", color: "var(--ds-primary-strong)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}><BookOpen size={28} /></span>
            <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em" }}>Aucun thème pour l'instant</div>
            <p className="ds-card__sub" style={{ maxWidth: 420 }}>Analyse un premier feedback : il crée ta première thématique, que tu pourras ensuite pousser au backlog.</p>
            <Button size="lg" onClick={() => onNavigate?.("analyser")} style={{ marginTop: 12 }}><Sparkles size={18} /> Analyser un feedback</Button>
          </Card>
        ) : view === "Cartes" ? (
          <ThemeGroupedView themes={themes} feedbackInbox={feedbackInbox} framework={framework} onOpenDetail={t => setDetailId(t.id)} onPush={handlePush} pushingId={pushingId} onGoToBacklogItem={onGoToBacklogItem} />
        ) : (
          <ThemeKanbanBoard themes={themes} feedbackInbox={feedbackInbox} framework={framework} onThemesChange={onSetThemes} onOpenDetail={t => setDetailId(t.id)} onPush={handlePush} pushingId={pushingId} onGoToBacklogItem={onGoToBacklogItem} />
        )}

        {detailTheme && (
          <ThemeDetailPanel
            theme={detailTheme}
            feedbackItems={feedbackInbox.filter(f => detailTheme.feedbackIds.includes(f.id))}
            onUpdate={handleUpdate} onUpdateFeedback={handleUpdateFeedback} onDelete={handleDelete}
            onPush={handlePush} pushing={pushingId === detailTheme.id} onGoToBacklogItem={onGoToBacklogItem}
            onClose={() => setDetailId(null)} />
        )}
      </div>
    </div>
  );
}

/* ─── PAGE: ANALYSER ─────────────────────────────────────────── */
function PageAnalyser({ themes, feedbackInbox, backlog, onSetThemes, onSetInbox, onComplete, onLoadDemo, onNavigate }) {
  const [feedback, setFeedback] = useState("");
  const [source, setSource]     = useState(FEEDBACK_SOURCES[0]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const charCount = feedback.length;

  const handleAnalyze = async () => {
    if (!feedback.trim() || loading) return;
    setLoading(true); setError("");
    try {
      const openThemes = themes.filter(t => t.status !== "pousse-backlog");
      const result = await clusterFeedback(feedback, openThemes);
      const now  = new Date().toISOString();
      const fbId = makeId();
      let themeId = result.theme_match?.est_nouveau ? null : result.theme_match?.id;
      let nextThemes;

      if (themeId && themes.some(t => t.id === themeId)) {
        nextThemes = themes.map(t => t.id === themeId
          ? {
              ...t,
              feedbackIds: [...t.feedbackIds, fbId],
              tags: [...new Set([...(t.tags || []), ...(result.tags || [])])],
              status: defaultThemeStatus(t.status, t.feedbackIds.length + 1),
              updatedAt: now,
            }
          : t);
      } else {
        themeId = makeId();
        nextThemes = [...themes, {
          id: themeId,
          titre: result.theme_match?.titre_theme || "Nouveau thème",
          description: result.pain_point || "",
          status: "nouveau-signal",
          ordre: 0,
          feedbackIds: [fbId],
          tags: result.tags || [],
          createdAt: now, updatedAt: now,
          backlogItemIds: [], pushedAt: null,
        }];
      }

      const newEntry = {
        id: fbId, date: now,
        texte: feedback,
        apercu: feedback.slice(0, 160) + (feedback.length > 160 ? "…" : ""),
        painPoint: result.pain_point || "",
        tags: result.tags || [],
        themeId,
        source,
      };

      onSetThemes(nextThemes);
      onSetInbox([newEntry, ...feedbackInbox]);
      setFeedback("");
      onComplete();
    } catch (e) { setError(e.message || "Erreur inattendue."); }
    finally { setLoading(false); }
  };

  return (
    <AnalyserView
      feedback={feedback} setFeedback={setFeedback} source={source} setSource={setSource} sources={FEEDBACK_SOURCES}
      loading={loading} error={error} onAnalyze={handleAnalyze}
      themes={themes} inbox={feedbackInbox} backlog={backlog} statusCfg={THEME_STATUS_CFG}
      onNavigate={onNavigate} onLoadDemo={onLoadDemo} />
  );
}

/* ─── PAGE: BOARD GLOBAL ─────────────────────────────────────── */
function PageGlobalBoard({ backlog, onSetBacklog, initialHighlight, onHighlightConsumed, onNavigate }) {
  const isMobile = useIsMobile(900);
  const [highlightedId, setHighId] = useState(null);
  const [activeFilter, setFilter]  = useState(null);
  const [treeOpen, setTreeOpen]    = useState(false);

  const handleUpdate       = (updated) => onSetBacklog(backlog.map(i => i.id === updated.id ? updated : i));
  const handleAddItem      = (item)    => onSetBacklog([...backlog, item]);
  const handleDeleteItem   = (id)      => onSetBacklog(backlog.filter(i => i.id !== id));
  const handleKanbanChange = (updatedKanban) => onSetBacklog(backlog.map(b => updatedKanban.find(k => k.id === b.id) || b));
  const handleNavigate     = (id)      => { setHighId(id); setTimeout(() => setHighId(null), 2000); };

  useEffect(() => {
    if (!initialHighlight) return;
    const target = backlog.find(i => i.id === initialHighlight);
    if (target && HIERARCHY_TYPES.includes(target.type)) {
      setFilter({ id: target.id, type: target.type.toLowerCase(), label: `${target.type} · ${shortTitle(target.titre)}` });
    } else {
      handleNavigate(initialHighlight);
      setTimeout(() => document.getElementById(`card-${initialHighlight}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    }
    onHighlightConsumed?.();
  }, [initialHighlight]);

  const items = getKanbanItems(backlog, activeFilter);

  if (items.length === 0) {
    return (
      <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "56px 40px", gap: 8, maxWidth: 520 }}>
          <span style={{ width: 64, height: 64, borderRadius: 20, background: "var(--ds-primary-soft)", color: "var(--ds-primary-strong)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}><Layers size={28} /></span>
          {backlog.length === 0 ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em" }}>Ton backlog est vide</div>
              <p className="ds-card__sub">Pousse un thème vers le backlog pour générer tes premiers Epics, Features et User Stories.</p>
              <Button size="lg" onClick={() => onNavigate?.("themes")} style={{ marginTop: 12 }}>Aller aux Thèmes <ArrowRight size={18} /></Button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em" }}>{activeFilter?.label || "Ce filtre"} n'a pas encore de ticket</div>
              <p className="ds-card__sub">La racine existe, mais aucune User Story, aucun Bug ni Spike n'est rattaché.</p>
              <Button size="lg" variant="secondary" onClick={() => setFilter(null)} style={{ marginTop: 12 }}><X size={16} /> Voir tout le backlog ({backlog.length})</Button>
            </>
          )}
        </Card>
      </div>
    );
  }

  const executable = backlog.filter(i => EXECUTABLE_TYPES.includes(i.type)).length;

  return (
    <>
      {isMobile && treeOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex" }} onClick={() => setTreeOpen(false)}>
          <div style={{ width: "86%", maxWidth: 340, height: "100%", background: "#fff", boxShadow: "4px 0 24px rgba(27,21,53,.22)", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <HierarchyTree drawer backlog={backlog} activeFilter={activeFilter} onSelectFilter={f => { setFilter(f); setTreeOpen(false); }} onUpdateItem={handleUpdate} onAddItem={handleAddItem} />
          </div>
          <div style={{ flex: 1, background: "rgba(27,21,53,.4)" }} />
        </div>
      )}

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {!isMobile && <HierarchyTree backlog={backlog} activeFilter={activeFilter} onSelectFilter={setFilter} onUpdateItem={handleUpdate} onAddItem={handleAddItem} />}
        <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
          <div style={{ padding: isMobile ? "24px 20px 48px" : "40px 40px 56px 32px" }}>
            <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
              <div>
                <Eyebrow>{executable} ticket{executable > 1 ? "s" : ""} exécutable{executable > 1 ? "s" : ""}</Eyebrow>
                <h1 style={{ fontSize: isMobile ? 30 : 40, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--ds-text)", margin: "6px 0 8px" }}>Backlog</h1>
                <p style={{ fontSize: 15.5, color: "var(--ds-text-secondary)", maxWidth: 520, lineHeight: 1.5 }}>Tes tickets par état de maturité, du cadrage au sprint.</p>
              </div>
              {isMobile && <Button variant="secondary" onClick={() => setTreeOpen(true)}><Layers size={16} /> Hiérarchie</Button>}
            </header>
            <KanbanBoard items={items} allItems={backlog} onItemsChange={handleKanbanChange} onDeleteItem={handleDeleteItem} highlightedId={highlightedId} onNavigate={handleNavigate} onSelectNode={setFilter} filter={activeFilter} onClearFilter={() => setFilter(null)} />
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── PAGE: RAPPORT ──────────────────────────────────────────── */
function PageRapport() {
  const isMobile = useIsMobile(900);
  const s = RAPPORT_STATS;
  const maxActivite = Math.max(...s.activite);
  const maxProjet   = Math.max(...Object.values(s.parProjet));
  const totalPrio   = Object.values(s.parPrio).reduce((a, b) => a + b, 0);
  const grid = (min) => ({ display: "grid", gap: 20, gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))` });
  const Bar = ({ pct, color }) => <div className="ds-progress" style={{ height: 10 }}><span style={{ width: `${pct}%`, background: color || undefined }} /></div>;

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: `${isMobile ? 24 : 40}px ${isMobile ? 20 : 40}px 56px` }}>
        <PageHeader mobile={isMobile} eyebrow="30 derniers jours" title="Rapport d'activité" sub="Ce que FeedbackPO a produit pour toi, et le temps que ça te rend." />
        <DemoBanner />

        <section className="ds-hero" style={{ padding: isMobile ? 22 : 32 }} aria-label="Synthèse">
          <div style={{ fontSize: 12.5, fontWeight: 500, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.72)" }}>Synthèse du mois</div>
          <h2 style={{ fontSize: isMobile ? 26 : 40, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.15, margin: "14px 0 24px", maxWidth: 760 }}>
            <span style={{ opacity: .72 }}>{s.feedbacks} feedbacks analysés.</span> {s.items} items générés.
          </h2>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
            {[[FileText, s.feedbacks, "Feedbacks analysés", "ce mois-ci"], [Layers, s.items, "Items générés", "Epics, Features, US, Bugs, Spikes"], [Timer, `${s.tempsSave} h`, "Heures économisées", "estimation par semaine"]].map(([Icon, v, l, sub]) => (
              <div key={l} className="ds-glass" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4, padding: "18px 20px" }}>
                <span className="ds-glass__icon" style={{ marginBottom: 8 }}><Icon size={20} /></span>
                <span style={{ fontSize: 38, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1 }}>{v}</span>
                <span style={{ fontSize: 15, fontWeight: 600, marginTop: 6 }}>{l}</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,.72)" }}>{sub}</span>
              </div>
            ))}
          </div>
        </section>

        <div style={{ ...grid(isMobile ? 280 : 440), marginTop: 20 }}>
          <Card>
            <div className="ds-card__title">Activité</div>
            <div className="ds-card__sub">Feedbacks analysés sur les 7 derniers jours.</div>
            <div style={{ display: "flex", gap: isMobile ? 8 : 14, marginTop: 22, alignItems: "stretch", height: 190 }}>
              {s.activite.map((v, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ds-text)" }}>{v}</span>
                  <div className="ds-bartrack" data-peak={v === maxActivite || undefined} style={{ flex: 1 }}><span style={{ height: `${(v / maxActivite) * 100}%` }} /></div>
                  <span style={{ fontSize: 13, color: "var(--ds-text-secondary)" }}>{s.jours[i]}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ display: "flex", flexDirection: "column" }}>
            <div className="ds-card__title">Taux de réutilisation</div>
            <div className="ds-card__sub">Items repris sans retouche majeure.</div>
            <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap", margin: "auto 0", paddingTop: 20 }}>
              <Ring value={s.reutilisation} size={176} stroke={17} caption="sans retouche" />
              <dl style={{ flex: 1, minWidth: 160, display: "grid", gap: 14, margin: 0 }}>
                {[["Repris tels quels", Math.round(s.items * s.reutilisation / 100), "#5B3FC9"], ["Retouchés", s.items - Math.round(s.items * s.reutilisation / 100), "#D5CAF6"]].map(([l, n, c]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, color: "var(--ds-text-secondary)" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
                    <dt style={{ flex: 1 }}>{l}</dt><dd style={{ margin: 0, fontWeight: 600, color: "var(--ds-text)" }}>{n}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Card>
        </div>

        <div style={{ ...grid(260), marginTop: 20 }}>
          <Card>
            <div className="ds-card__title" style={{ marginBottom: 20 }}>Répartition par type</div>
            <div style={{ display: "grid", gap: 16 }}>
              {Object.entries(s.parType).map(([type, count]) => {
                const cfg = TYPE_CFG[type] || TYPE_CFG["User Story"];
                const pct = Math.round((count / s.items) * 100);
                return (
                  <div key={type}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14.5 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ds-text)" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot }} />{type}</span>
                      <span style={{ color: "var(--ds-text-secondary)" }}><b style={{ color: "var(--ds-text)", fontWeight: 600 }}>{count}</b> · {pct}%</span>
                    </div>
                    <Bar pct={pct} />
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="ds-card__title" style={{ marginBottom: 20 }}>Distribution MoSCoW</div>
            <div style={{ display: "grid", gap: 16 }}>
              {Object.entries(s.parPrio).map(([label, count]) => {
                const pct = Math.round((count / totalPrio) * 100);
                return (
                  <div key={label}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <Pill tone={PRIO_TONE_BL[label]}>{label}</Pill>
                      <span style={{ fontSize: 14.5, color: "var(--ds-text-secondary)" }}><b style={{ color: "var(--ds-text)", fontWeight: 600 }}>{count}</b> · {pct}%</span>
                    </div>
                    <Bar pct={pct} />
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="ds-card__title" style={{ marginBottom: 20 }}>Items par projet</div>
            <div style={{ display: "grid", gap: 16 }}>
              {Object.entries(s.parProjet).map(([projet, count]) => (
                <div key={projet}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 14.5 }}>
                    <span style={{ color: "var(--ds-text)", fontWeight: 500 }}>{projet}</span>
                    <Pill tone="primary">{count} items</Pill>
                  </div>
                  <Bar pct={Math.round((count / maxProjet) * 100)} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─── PAGE: PARAMÈTRES ───────────────────────────────────────── */
function SettingsCard({ icon: Icon, title, sub, children }) {
  return (
    <Card style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <span className="ds-iconsq"><Icon size={20} /></span>
        <div><div className="ds-card__title">{title}</div>{sub && <div className="ds-card__sub" style={{ marginTop: 2 }}>{sub}</div>}</div>
      </div>
      {children}
    </Card>
  );
}

function PageParametres() {
  const isMobile = useIsMobile(900);
  const [model, setModel]       = useState("Sonnet · recommandé");
  const [defFw, setDefFw]       = useState("MoSCoW");
  const [velocity, setVelocity] = useState(4);
  const [saved, setSaved]       = useState(false);
  const [notif, setNotif]       = useState(true);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const code = { background: "var(--ds-surface-muted)", padding: "2px 8px", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 13 };
  const projets = [["Kantara", 28], ["Nexio", 21], ["Pathline", 18]];

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: `${isMobile ? 24 : 40}px ${isMobile ? 20 : 40}px 56px` }}>
        <PageHeader mobile={isMobile} eyebrow="Configuration" title="Paramètres" sub="Le modèle, la vélocité et tes préférences d'analyse."
          right={<Button size="lg" onClick={save}>{saved ? <><CheckCheck size={18} /> Sauvegardé</> : "Sauvegarder"}</Button>} />

        <div style={{ display: "grid", gap: 20 }}>
          <SettingsCard icon={Key} title="Modèle Claude" sub="Plus le modèle est puissant, plus l'analyse est fine et lente.">
            <Segmented label="Modèle Claude" options={["Haiku", "Sonnet · recommandé", "Opus"]} value={model} onChange={setModel} />
            <p style={{ fontSize: 14, color: "var(--ds-text-secondary)", lineHeight: 1.6, marginTop: 16 }}>
              La clé API reste côté serveur (variable <code style={code}>ANTHROPIC_API_KEY</code> de Vercel, ou <code style={code}>.env</code> en local). Elle n'est jamais envoyée au navigateur.</p>
          </SettingsCard>

          <SettingsCard icon={Zap} title="Vélocité d'équipe" sub="Sert à convertir les Story Points en temps.">
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
              <span style={{ fontSize: 40, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1 }}>{velocity} h</span>
              <span style={{ fontSize: 15, color: "var(--ds-text-secondary)" }}>par Story Point · 1 jour ≈ {Math.round(8 / velocity)} SP</span>
            </div>
            <input className="ds-range" type="range" min={1} max={8} step={0.5} value={velocity} onChange={e => setVelocity(Number(e.target.value))} aria-label="Heures par Story Point" />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--ds-text-secondary)", marginTop: 10 }}>
              <span>1 h · rapide</span><span>4 h · standard</span><span>8 h · lent</span>
            </div>
          </SettingsCard>

          <SettingsCard icon={Sliders} title="Préférences">
            <div className="ds-row-set">
              <div><div style={{ fontSize: 15.5, fontWeight: 500 }}>Framework par défaut</div><div className="ds-card__sub" style={{ marginTop: 2 }}>Utilisé à chaque analyse</div></div>
              <Segmented label="Framework par défaut" options={["MoSCoW", "RICE", "Valeur-Effort"]} value={defFw} onChange={setDefFw} />
            </div>
            <div className="ds-row-set">
              <div><div style={{ fontSize: 15.5, fontWeight: 500 }}>Rapport hebdomadaire</div><div className="ds-card__sub" style={{ marginTop: 2 }}>Email chaque lundi à 8 h</div></div>
              <Toggle value={notif} onChange={setNotif} label="Rapport hebdomadaire" />
            </div>
          </SettingsCard>

          <SettingsCard icon={Users} title="Projets">
            {projets.map(([p, n]) => (
              <div key={p} className="ds-row-set" style={{ padding: "14px 0" }}>
                <span style={{ fontSize: 15.5, fontWeight: 500 }}>{p}</span>
                <Pill tone="primary">{n} items</Pill>
              </div>
            ))}
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}

/* ─── TIPS DU JOUR ───────────────────────────────────────────── */
const TIPS_DU_JOUR = [
  "Un bon critère d'acceptation se teste en moins de 5 minutes par quelqu'un hors de l'équipe.",
  "Avant toute User Story, demande-toi : quel workaround l'utilisateur fait-il aujourd'hui ?",
  "Le 'Must Have' ne devrait pas dépasser 60 % du scope d'une release — sinon tout est prioritaire.",
  "Un Spike produit une décision documentée, jamais du code livrable en production.",
  "La valeur métier se quantifie toujours : temps gagné, erreurs évitées, NPS amélioré.",
  "Le meilleur feedback vient des utilisateurs qui ont abandonné la feature, pas de ceux qui l'ont adoptée.",
  "Un Epic livré en un seul sprint est probablement une Feature mal nommée.",
  "Écrire la démo avant le développement est la meilleure façon de détecter les ambiguïtés.",
];

/* ─── APP HEADER ─────────────────────────────────────────────── */
const NAV_ITEMS = [
  { id: "analyser",   label: "Analyser",   Icon: Sparkles  },
  { id: "themes",     label: "Thèmes",     Icon: BookOpen  },
  { id: "board",      label: "Backlog",    Icon: Layout    },
  { id: "rapport",    label: "Rapport",    Icon: BarChart2 },
  { id: "settings",   label: "Paramètres", Icon: Settings2, config: true },
];

/* ─── APP ────────────────────────────────────────────────────── */
export default function App() {
  const [activeNav, setActiveNav]     = useState("analyser");
  const [backlog, setBacklogRaw]       = useState(loadBacklog);
  const [feedbackInbox, setInboxRaw]  = useState(loadInbox);
  const [themes, setThemesRaw]        = useState(loadThemes);
  const [pendingHighlight, setPendingHighlight] = useState(null);
  const [tip] = useState(() => TIPS_DU_JOUR[Math.floor(Math.random() * TIPS_DU_JOUR.length)]);

  const setBacklog        = (next) => { setBacklogRaw(next); saveBacklog(next); };
  const setFeedbackInbox  = (next) => { setInboxRaw(next); saveInbox(next); };
  const setThemes         = (next) => { setThemesRaw(next); saveThemes(next); };

  const goToThemes  = () => setActiveNav("themes");
  const loadDemoData = () => { setBacklog(MOCK_KANBAN); setThemes(MOCK_THEMES); setFeedbackInbox(MOCK_INBOX); setActiveNav("themes"); };
  const goToBacklogItem = (id) => { setPendingHighlight(id); setActiveNav("board"); };

  /* Deep-link depuis un lien externe (ex : rapport PowerPoint) — ?item=<id> */
  useEffect(() => {
    const itemId = new URLSearchParams(window.location.search).get("item");
    if (itemId) {
      goToBacklogItem(itemId);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const PAGES = {
    analyser:   <PageAnalyser themes={themes} feedbackInbox={feedbackInbox} backlog={backlog} onNavigate={setActiveNav} onSetThemes={setThemes} onSetInbox={setFeedbackInbox} onComplete={goToThemes} onLoadDemo={loadDemoData} />,
    themes:     <PageThemes themes={themes} feedbackInbox={feedbackInbox} backlog={backlog} onSetThemes={setThemes} onSetInbox={setFeedbackInbox} onSetBacklog={setBacklog} onGoToBacklogItem={goToBacklogItem} onNavigate={setActiveNav} />,
    board:      <PageGlobalBoard backlog={backlog} onSetBacklog={setBacklog} initialHighlight={pendingHighlight} onHighlightConsumed={() => setPendingHighlight(null)} onNavigate={setActiveNav} />,
    rapport:    <PageRapport />,
    settings:   <PageParametres />,
  };

  return (
    <>
      <style>{`
        @keyframes spin         { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeIn       { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeInUp     { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulseRing    { 0%,100%{box-shadow:0 0 0 0 rgba(92,95,212,.4)} 50%{box-shadow:0 0 0 6px rgba(92,95,212,0)} }
        @keyframes slideInRight { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes floatOrb     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        button:active { transform:scale(0.97) !important; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#D1D5DB; border-radius:99px; }
        * { box-sizing:border-box; }
        @media (prefers-reduced-motion:reduce) { *,*::before,*::after { animation-duration:0.01ms !important; transition-duration:0.01ms !important; } }
      `}</style>

      <Shell items={NAV_ITEMS} active={activeNav} onNavigate={setActiveNav} tip={tip}
        counts={{ board: backlog.filter(i => EXECUTABLE_TYPES.includes(i.type)).length, themes: themes.filter(t => t.status !== "pousse-backlog").length }}>
        {PAGES[activeNav]}
      </Shell>
    </>
  );
}
