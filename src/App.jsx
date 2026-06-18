import { useState, useRef, useEffect } from "react";
import logoSrc from "./assets/logo.png";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Zap, Clock, Settings2, Download, Loader2, CheckCheck,
  AlertCircle, Sparkles, ListChecks, HelpCircle, BookOpen,
  ArrowRight, RefreshCw, ChevronRight, BarChart2, Plus, ChevronDown,
  Timer, Repeat2, FileText, Eye, Key, Bell, Sliders, Calendar,
  Layers, Target, X, Check,
  GripVertical, AlertTriangle, Users, Link, Upload,
  Layout, Pencil, Copy, Bug, Lightbulb, Trash2,
} from "lucide-react";

/* ─── TOKENS ─────────────────────────────────────────────────── */
const T = {
  bg: "#F6F6FB", sidebar: "#FFFFFF", card: "#FFFFFF",
  border: "#E8E8F0", borderSubtle: "#F0F0F8",
  primary: "#5C5FD4", primaryHover: "#4649B8",
  primaryLight: "#EEEEFF", primaryMid: "#C7C8F5",
  text: "#111827", textMuted: "#6B7280", textSubtle: "#9CA3AF",
  success: "#16A34A", successLight: "#F0FDF4", successBorder: "#BBF7D0",
  warning: "#D97706", warningLight: "#FFFBEB", warningBorder: "#FDE68A",
  danger: "#DC2626", dangerLight: "#FEF2F2", dangerBorder: "#FECACA",
  orange: "#EA580C", orangeLight: "#FFF4ED", orangeBorder: "#FED7AA",
  radius: "12px", radiusSm: "8px", radiusLg: "16px",
  shadow: "0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)",
  shadowMd: "0 4px 12px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.05)",
  shadowLg: "0 8px 24px rgba(0,0,0,.10), 0 2px 6px rgba(0,0,0,.06)",
  shadowPrimary: "0 4px 14px rgba(92,95,212,.30)",
  transition: "all 0.15s ease",
  gradient: "linear-gradient(135deg, #5C5FD4 0%, #8B5CF6 100%)",
  gradientHero: "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 55%, #FDF4FF 100%)",
};

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
  "a-clarifier":   { label: "À clarifier",  color: "#C2410C", bg: "#FFF4ED", border: "#FED7AA", dot: "#F97316" },
  "en-affinage":   { label: "En affinage",  color: "#A16207", bg: "#FEFCE8", border: "#FDE68A", dot: "#EAB308" },
  "pret-pour-dev": { label: "Prêt pour dev",color: "#15803D", bg: "#F0FDF4", border: "#BBF7D0", dot: "#22C55E" },
  "exporte":       { label: "Exporté",       color: "#4338CA", bg: "#EEEEFF", border: "#C7C8F5", dot: "#6366F1" },
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

/* ─── SYSTEM PROMPT ─────────────────────────────────────────── */
const SYSTEM_PROMPT = `Tu es un expert Product Owner senior. Tu transformes des feedbacks bruts en éléments de backlog structurés.
IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans texte avant/après, sans backticks markdown.

Hiérarchie : Epic → Feature → User Story / Bug / Spike.
- Feature : parentId = id de l'Epic parent.
- User Story, Bug, Spike : parentId = id de la Feature parente.
- Epic : parentId = null.
- Bug : un défaut constaté ou comportement inattendu.
- Spike : investigation time-boxée (préfixe "[SPIKE]" dans le titre).

Format JSON exact:
{
  "items": [{
    "id": "item-1",
    "type": "Epic | Feature | User Story | Bug | Spike",
    "parentId": null,
    "titre": "titre de l'item",
    "contexte": "Problème observé en 1-2 phrases",
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
- Génère 1-4 items dans l'ordre Epic → Feature → US/Bug/Spike
- valeur_metier : toujours tenter de le quantifier (ex: "économise 2h/sem × 50 users")
- story_points : laisser null
- 2-4 critères d'acceptation minimum

Tags fonctionnels (champ "tags") :
- Toujours renseigner 2 à 5 tags parmi : UX, Performance, Mobile, Sécurité, API, Onboarding, Reporting, Notification, Export, Authentification, Paiement, Data, Accessibilité, Recherche, Intégration, Dashboard, Admin, Offline

Scoring RICE (si framework="RICE" — s'applique à User Story et Feature, pas Epic) :
- rice.reach     : nb d'utilisateurs touchés sur 3 mois (entier)
- rice.impact    : 1=minimal, 2=moyen, 3=fort, 5=massif
- rice.confidence: certitude estimée entre 0.1 et 1.0
- rice.effort    : effort en semaines-développeur (nombre décimal)
- rice.score     : arrondi(reach × impact × confidence / effort)
- Pour les Epics et si framework≠RICE : laisser rice: null

Détection de doublons (si backlog existant fourni) :
- Comparer chaque item généré aux items existants fournis après le feedback
- Si similitude sémantique haute ou moyenne : potentiel_doublon: { "id": "id-existant", "titre": "titre court ≤50 chars", "niveau": "haute" | "moyenne" }
- Si aucun doublon : potentiel_doublon: null`;

/* ─── UTILS ─────────────────────────────────────────────────── */
const shortTitle = (titre) => {
  if (!titre) return "Sans titre";
  const m = titre.match(/je veux (.+?) afin/i);
  const t = m ? m[1] : titre;
  return t.length > 42 ? t.slice(0, 42) + "…" : t;
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

const MOCK_HISTORY = [
  {
    id: "h1", date: "Aujourd'hui, 14h32", projet: "Kantara",
    apercu: "Marc m'a dit en réunion que son équipe perd 2h par jour à ressaisir les données de ventes dans Excel...",
    items: 7, framework: "MoSCoW", types: ["Epic", "Feature", "User Story", "Bug", "Spike"], duree: "8s",
    tags: ["export", "reporting", "adoption"], mockItems: MOCK_KANBAN,
  },
  {
    id: "h2", date: "Hier, 09h15", projet: "Nexio",
    apercu: "Retour de la démo client : les élus veulent pouvoir publier des actualités depuis leur mobile...",
    items: 3, framework: "RICE", types: ["Feature", "User Story"], duree: "6s",
    tags: ["mobile", "publication", "accessibilité"], mockItems: [],
  },
  {
    id: "h3", date: "13 juin, 16h50", projet: "Pathline",
    apercu: "L'équipe design a remonté que le flow d'onboarding est trop long — abandon à l'étape 3 sur 7...",
    items: 4, framework: "Valeur-Effort", types: ["Feature", "User Story", "Bug"], duree: "11s",
    tags: ["onboarding", "rétention", "UX"], mockItems: [],
  },
  {
    id: "h4", date: "12 juin, 11h20", projet: "Kantara",
    apercu: "Le support remonte 12 tickets cette semaine sur la recherche — contrats archivés introuvables...",
    items: 2, framework: "MoSCoW", types: ["Feature", "Bug"], duree: "5s",
    tags: ["recherche", "archives", "support"], mockItems: [],
  },
  {
    id: "h5", date: "10 juin, 15h05", projet: "Nexio",
    apercu: "CR de réunion DSI : ils veulent une API publique pour connecter leur GED existante...",
    items: 3, framework: "RICE", types: ["Epic", "Feature", "Spike"], duree: "9s",
    tags: ["API", "intégration", "DSI"], mockItems: [],
  },
  {
    id: "h6", date: "09 juin, 08h45", projet: "Pathline",
    apercu: "Note vocale Sales : les prospects demandent un mode hors-ligne pour les zones blanches...",
    items: 2, framework: "MoSCoW", types: ["Feature", "User Story"], duree: "7s",
    tags: ["offline", "mobile", "prospect"], mockItems: [],
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
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, backgroundColor: c.bg, color: c.color, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, border: `1px solid ${c.badge}` }}>
      {IconEl ? <IconEl size={10} /> : <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: c.dot }} />}
      {type}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_CFG[status] || STATUS_CFG["en-affinage"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, backgroundColor: s.bg, color: s.color, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, border: `1px solid ${s.border}` }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: s.dot }} />
      {s.label}
    </span>
  );
}

function SPBadge({ sp, onClick }) {
  if (!sp) return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 4, backgroundColor: T.orangeLight, color: T.orange, borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 600, border: `1px solid ${T.orangeBorder}`, cursor: "pointer", fontFamily: "inherit" }}>
      <AlertTriangle size={10} /> Non estimé
    </button>
  );
  return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 4, backgroundColor: T.primaryLight, color: T.primary, borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 600, border: `1px solid ${T.primaryMid}44`, cursor: "pointer", fontFamily: "inherit" }}>
      ⚡ {sp} SP — {spHint(sp)}
    </button>
  );
}

function PillGroup({ name, options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {options.map(({ v, label, sub }) => (
        <label key={v} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: T.radiusSm, cursor: "pointer", backgroundColor: value === v ? T.primaryLight : "transparent", border: `1.5px solid ${value === v ? T.primaryMid : "transparent"}`, transition: T.transition }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${value === v ? T.primary : "#D1D5DB"}`, backgroundColor: value === v ? T.primary : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {value === v && <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#fff" }} />}
          </div>
          <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} style={{ display: "none" }} />
          <span style={{ fontSize: 12.5, color: value === v ? T.primary : T.text, fontWeight: value === v ? 600 : 400, flex: 1 }}>{label}</span>
          {sub && <span style={{ fontSize: 11, color: T.textSubtle }}>{sub}</span>}
        </label>
      ))}
    </div>
  );
}

function InlineEdit({ value, onChange, multiline = false, placeholder = "Modifier…", style = {} }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const ref = useRef();
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  const save = () => { setEditing(false); if (draft !== value) onChange(draft); };
  const base = { fontSize: "inherit", fontFamily: "inherit", fontWeight: "inherit", color: "inherit", lineHeight: "inherit", background: "transparent", border: "none", outline: "none", width: "100%", resize: "none", padding: 0, margin: 0, ...style };
  if (editing) {
    const El = multiline ? "textarea" : "input";
    return <El ref={ref} value={draft} onChange={e => setDraft(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === "Escape") { setDraft(value); setEditing(false); } if (!multiline && e.key === "Enter") save(); }} style={{ ...base, border: `1px solid ${T.primary}`, borderRadius: 4, padding: "2px 6px", backgroundColor: T.primaryLight + "55", minHeight: multiline ? 60 : "auto" }} rows={multiline ? 3 : undefined} />;
  }
  return (
    <span onClick={() => { setDraft(value); setEditing(true); }} title="Cliquer pour modifier" style={{ cursor: "text", display: "block", ...style }}>
      {value || <span style={{ color: T.textSubtle, fontStyle: "italic" }}>{placeholder}</span>}
    </span>
  );
}

function ACEditor({ criteres, onChange }) {
  const [refining, setRefining] = useState(null);
  const [preview, setPreview]   = useState(null);

  const refineAC = async (ac, idx) => {
    setRefining(idx);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 200, messages: [{ role: "user", content: `Reformule ce critère d'acceptation pour le rendre plus testable (verbe d'action + condition + résultat mesurable). Réponds UNIQUEMENT avec le critère reformulé.\n\nCritère : "${ac}"` }] })
      });
      const data = await res.json();
      setPreview({ idx, refined: data.content?.[0]?.text?.trim() });
    } catch { } finally { setRefining(null); }
  };

  const update = (idx, val) => { const n = [...criteres]; n[idx] = val; onChange(n); };
  const remove = (idx)      => onChange(criteres.filter((_, i) => i !== idx));
  const add    = ()         => onChange([...criteres, ""]);

  return (
    <div>
      {criteres.map((ac, idx) => (
        <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6, padding: "6px 8px", backgroundColor: "#FAFAFA", borderRadius: 6, border: `1px solid ${T.borderSubtle}` }}>
          <span style={{ color: T.success, fontSize: 12, flexShrink: 0, marginTop: 2 }}>✓</span>
          <InlineEdit value={ac} onChange={v => update(idx, v)} multiline style={{ flex: 1, fontSize: 12.5, color: "#374151", lineHeight: 1.5 }} placeholder="Saisir un critère…" />
          <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
            {refining === idx
              ? <Loader2 size={12} color={T.primary} style={{ animation: "spin 1s linear infinite", marginTop: 3 }} />
              : <button onClick={() => refineAC(ac, idx)} title="Affiner avec Claude" style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: T.textSubtle }} onMouseEnter={e => e.currentTarget.style.color = T.primary} onMouseLeave={e => e.currentTarget.style.color = T.textSubtle}><Sparkles size={11} /></button>}
            <button onClick={() => remove(idx)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: T.textSubtle }} onMouseEnter={e => e.currentTarget.style.color = T.danger} onMouseLeave={e => e.currentTarget.style.color = T.textSubtle}><X size={11} /></button>
          </div>
        </div>
      ))}
      {preview && (
        <div style={{ backgroundColor: T.primaryLight, border: `1px solid ${T.primaryMid}`, borderRadius: T.radiusSm, padding: "10px 12px", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.primary, marginBottom: 6 }}>REFORMULATION CLAUDE</div>
          <div style={{ fontSize: 12.5, color: T.text, lineHeight: 1.5, marginBottom: 8 }}>{preview.refined}</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => { update(preview.idx, preview.refined); setPreview(null); }} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", backgroundColor: T.success, color: "#fff", border: "none", borderRadius: 6, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}><Check size={11} /> Accepter</button>
            <button onClick={() => setPreview(null)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", backgroundColor: "#F3F4F6", color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}><X size={11} /> Ignorer</button>
          </div>
        </div>
      )}
      <button onClick={add} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: T.primary, backgroundColor: "transparent", border: `1px dashed ${T.primaryMid}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
        <Plus size={11} /> Ajouter un critère
      </button>
    </div>
  );
}

function SPPicker({ value, onChange, onClose }) {
  return (
    <div style={{ position: "absolute", zIndex: 50, top: "100%", left: 0, marginTop: 4, backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadowMd, padding: 10, display: "flex", flexWrap: "wrap", gap: 5, width: 220 }}>
      {SP_SCALE.map(({ v, hint }) => (
        <button key={v} onClick={() => { onChange(v); onClose(); }} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", backgroundColor: value === v ? T.primary : T.primaryLight, color: value === v ? "#fff" : T.primary, border: `1px solid ${value === v ? T.primary : T.primaryMid}44` }}>
          {v} <span style={{ fontSize: 10, opacity: 0.7 }}>{hint}</span>
        </button>
      ))}
      {value && <button onClick={() => { onChange(null); onClose(); }} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit", backgroundColor: T.dangerLight, color: T.danger, border: `1px solid ${T.dangerBorder}`, width: "100%" }}>Effacer</button>}
    </div>
  );
}

/* ─── COMMENT THREAD (fixed layout) ─────────────────────────── */
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
      {commentaires.map(c => {
        const ct = COMMENT_TYPES[c.type] || COMMENT_TYPES.note;
        return (
          <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 3, backgroundColor: ct.color, borderRadius: 99, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: ct.color, backgroundColor: ct.bg, border: `1px solid ${ct.border}`, borderRadius: 4, padding: "1px 6px", flexShrink: 0 }}>{ct.label}</span>
                <span style={{ fontSize: 10.5, color: T.textSubtle }}>{c.date}</span>
              </div>
              <p style={{ fontSize: 12.5, color: T.text, lineHeight: 1.5, margin: 0, wordBreak: "break-word" }}>{c.texte}</p>
            </div>
          </div>
        );
      })}
      {/* Stacked layout: select above, input+button below */}
      <div style={{ marginTop: 8 }}>
        <select value={type} onChange={e => setType(e.target.value)} style={{ width: "100%", fontSize: 11.5, border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 8px", backgroundColor: "#FAFAFA", fontFamily: "inherit", color: T.text, marginBottom: 6 }}>
          {Object.entries(COMMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div style={{ display: "flex", gap: 6 }}>
          <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Ajouter un commentaire…" style={{ flex: 1, minWidth: 0, fontSize: 12.5, border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 10px", fontFamily: "inherit", outline: "none", backgroundColor: "#FAFAFA" }} />
          <button onClick={add} style={{ flexShrink: 0, padding: "5px 12px", backgroundColor: T.primary, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>↵</button>
        </div>
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
  return (
    <div>
      {prototypes.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {prototypes.map(p => (
            <div key={p.id} style={{ position: "relative", width: 80 }}>
              {p.type === "image"
                ? <img src={p.src} alt={p.caption} style={{ width: 80, height: 56, objectFit: "cover", borderRadius: T.radiusSm, border: `1px solid ${T.border}` }} />
                : <div style={{ width: 80, height: 56, borderRadius: T.radiusSm, border: `1px solid ${T.border}`, backgroundColor: T.primaryLight, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}><Link size={16} color={T.primary} /><span style={{ fontSize: 9, color: T.primary, fontWeight: 600 }}>Lien</span></div>}
              <button onClick={() => navigator.clipboard.writeText(p.src)} title="Copier" style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: 3, backgroundColor: "rgba(0,0,0,.5)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Copy size={8} color="#fff" /></button>
              <button onClick={() => remove(p.id)} style={{ position: "absolute", top: 2, left: 2, width: 16, height: 16, borderRadius: 3, backgroundColor: "rgba(220,38,38,.7)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={8} color="#fff" /></button>
              <input value={p.caption} onChange={e => updateCaption(p.id, e.target.value)} placeholder="Légende…" style={{ width: "100%", fontSize: 9.5, border: "none", outline: "none", backgroundColor: "transparent", color: T.textMuted, marginTop: 3, fontFamily: "inherit" }} />
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => fileRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: T.textMuted, backgroundColor: "#F3F4F6", border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}><Upload size={11} /> Image</button>
        <button onClick={() => setShowUrl(!showUrl)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: T.textMuted, backgroundColor: "#F3F4F6", border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}><Link size={11} /> URL / Figma</button>
        <input ref={fileRef} type="file" accept="image/*" onChange={addFile} style={{ display: "none" }} />
      </div>
      {showUrl && (
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <input value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addUrl()} placeholder="https://figma.com/… ou lien image" style={{ flex: 1, fontSize: 12.5, border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 10px", fontFamily: "inherit", outline: "none" }} />
          <button onClick={addUrl} style={{ padding: "5px 10px", backgroundColor: T.primary, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>Ajouter</button>
        </div>
      )}
    </div>
  );
}

/* ─── KANBAN CARD ────────────────────────────────────────────── */
function KanbanCard({ item, allItems, onUpdate, onDelete, highlighted, onNavigate, onSelectNode, isDragging = false, dragListeners, dragAttributes }) {
  const [expanded, setExpanded]       = useState(false);
  const [acOpen, setAcOpen]           = useState(false);
  const [showSP, setShowSP]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [confirmDelete, setConfirm]   = useState(false);
  const saveTimer = useRef();

  const update = (patch) => {
    onUpdate({ ...item, ...patch });
    clearTimeout(saveTimer.current);
    setSaved(false);
    saveTimer.current = setTimeout(() => { setSaved(true); setTimeout(() => setSaved(false), 1500); }, 500);
  };

  const parent   = item.parentId ? allItems.find(i => i.id === item.parentId) : null;
  const children = allItems.filter(i => i.parentId === item.id && EXECUTABLE_TYPES.includes(i.type));

  const navigateTo = (targetId) => {
    onNavigate?.(targetId);
    setTimeout(() => document.getElementById(`card-${targetId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  const handleParentClick = () => {
    if (parent && HIERARCHY_TYPES.includes(parent.type)) {
      onSelectNode?.({ id: parent.id, type: parent.type.toLowerCase() });
    } else if (parent) {
      navigateTo(parent.id);
    }
  };

  const pc = PRIO_CFG[item.priorite?.valeur] || { bg: "#F3F4F6", color: "#6B7280" };
  const parentCfg = parent ? (TYPE_CFG[parent.type] || TYPE_CFG["User Story"]) : null;

  return (
    <div id={`card-${item.id}`} style={{ backgroundColor: highlighted ? "#F0F0FF" : T.card, borderRadius: T.radius, boxShadow: isDragging ? T.shadowMd : (highlighted ? `0 0 0 2px ${T.primary}` : T.shadow), border: `1px solid ${highlighted ? T.primary : T.border}`, marginBottom: 8, opacity: isDragging ? 0.85 : 1, animation: highlighted ? "pulseRing 0.6s ease 2" : "none", transition: "box-shadow 0.15s, border-color 0.15s", overflow: "hidden" }}>

      {/* ── Drag handle ── */}
      {dragListeners && (
        <div {...dragListeners} {...dragAttributes} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, padding: "5px 0 4px", cursor: isDragging ? "grabbing" : "grab", backgroundColor: "rgba(0,0,0,0.018)", borderBottom: `1px solid ${T.borderSubtle}`, touchAction: "none", userSelect: "none" }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(92,95,212,0.06)"}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.018)"}>
          {[0,1,2,3,4].map(i => <div key={i} style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "#C4C4D4" }} />)}
        </div>
      )}

      <div style={{ padding: "10px 13px" }}>
      {/* Alerte doublon */}
      {item.potentiel_doublon && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, backgroundColor: "#FFFBEB", border: `1px solid #FCD34D`, borderRadius: T.radiusSm, padding: "5px 9px", marginBottom: 7 }} onPointerDown={e => e.stopPropagation()}>
          <AlertTriangle size={11} color="#D97706" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: "#92400E", flex: 1, lineHeight: 1.4 }}>
            Doublon {item.potentiel_doublon.niveau} · <em>"{item.potentiel_doublon.titre}"</em>
          </span>
          <button onClick={() => navigateTo(item.potentiel_doublon.id)} style={{ fontSize: 10.5, color: "#D97706", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, flexShrink: 0 }}>Voir →</button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7, flexWrap: "wrap" }}>
        <TypeBadge type={item.type} />
        <StatusBadge status={item.status} />
        {saved && <span style={{ fontSize: 10.5, color: T.success, fontWeight: 600, marginLeft: "auto" }}>Enregistré ✓</span>}
      </div>

      {parent && (
        <button onClick={handleParentClick} title={HIERARCHY_TYPES.includes(parent.type) ? "Filtrer par cette Feature/Epic" : "Aller au parent"} style={{ display: "inline-flex", alignItems: "center", gap: 4, backgroundColor: parentCfg.bg, color: parentCfg.color, border: `1px solid ${parentCfg.badge}`, borderRadius: 5, padding: "2px 8px", fontSize: 10.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 8, maxWidth: "100%", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
          ↑ {parent.type} · {shortTitle(parent.titre)}
        </button>
      )}

      {children.length > 0 && (
        <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
          {children.map(c => {
            const cc = TYPE_CFG[c.type] || TYPE_CFG["User Story"];
            return <button key={c.id} onClick={() => navigateTo(c.id)} style={{ display: "flex", alignItems: "center", gap: 4, backgroundColor: cc.bg, color: cc.color, border: `1px solid ${cc.badge}`, borderRadius: 5, padding: "2px 8px", fontSize: 10.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>↓ {c.type} · {shortTitle(c.titre)}</button>;
          })}
        </div>
      )}

      <div style={{ marginBottom: 5 }} onPointerDown={e => e.stopPropagation()}>
        <InlineEdit value={item.titre} onChange={v => update({ titre: v })} multiline style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.5 }} />
      </div>

      {/* Tags fonctionnels */}
      {item.tags?.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 7 }}>
          {item.tags.map(tag => (
            <span key={tag} style={{ fontSize: 10, fontWeight: 600, color: "#6366F1", backgroundColor: "#EEF2FF", borderRadius: 4, padding: "1px 6px", border: "1px solid #C7D2FE" }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Score RICE */}
      {item.rice && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: T.radiusSm, padding: "5px 9px", marginBottom: 7 }} onPointerDown={e => e.stopPropagation()}>
          <Zap size={11} color="#15803D" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: "#15803D", minWidth: 60 }}>RICE {item.rice.score}</span>
          <span style={{ fontSize: 10.5, color: "#166534", opacity: 0.85 }}>
            R:{item.rice.reach >= 1000 ? `${(item.rice.reach/1000).toFixed(0)}k` : item.rice.reach}
            {" · "}×{item.rice.impact}
            {" · "}{Math.round(item.rice.confidence * 100)}%
            {" · "}{item.rice.effort}w
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, alignItems: "flex-start", backgroundColor: T.successLight, border: `1px solid ${T.successBorder}`, borderRadius: T.radiusSm, padding: "5px 9px", marginBottom: 8 }} onPointerDown={e => e.stopPropagation()}>
        <Target size={12} color={T.success} style={{ flexShrink: 0, marginTop: 2 }} />
        <InlineEdit value={item.valeur_metier} onChange={v => update({ valeur_metier: v })} multiline placeholder="Valeur métier attendue…" style={{ fontSize: 11.5, color: "#15803D", lineHeight: 1.5 }} />
      </div>

      {item.prototypes?.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 9, flexWrap: "wrap" }}>
          {item.prototypes.slice(0, 3).map(p => (
            p.type === "image"
              ? <img key={p.id} src={p.src} alt={p.caption} style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 6, border: `1px solid ${T.border}` }} />
              : <div key={p.id} style={{ width: 56, height: 40, borderRadius: 6, border: `1px solid ${T.border}`, backgroundColor: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center" }}><Link size={14} color={T.primary} /></div>
          ))}
          {item.prototypes.length > 3 && <div style={{ width: 56, height: 40, borderRadius: 6, border: `1px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: T.textSubtle }}>+{item.prototypes.length - 3}</div>}
        </div>
      )}

      <div style={{ marginBottom: 8 }}>
        <button onClick={() => setAcOpen(!acOpen)} style={{ display: "flex", alignItems: "center", gap: 5, width: "100%", background: "none", border: "none", padding: "4px 0", cursor: "pointer", fontFamily: "inherit" }}>
          <ListChecks size={12} color={T.textSubtle} />
          <span style={{ fontSize: 11, color: T.textSubtle, fontWeight: 600, letterSpacing: "0.04em" }}>CRITÈRES D'ACCEPTATION</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.primary, backgroundColor: T.primaryLight, borderRadius: 4, padding: "0 6px" }}>{item.criteres_acceptation?.length || 0}</span>
          <ChevronDown size={11} color={T.textSubtle} style={{ marginLeft: "auto", transform: acOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        </button>
        {acOpen && (
          <div style={{ marginTop: 6 }} onPointerDown={e => e.stopPropagation()}>
            <ACEditor criteres={item.criteres_acceptation || []} onChange={v => update({ criteres_acceptation: v })} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: expanded ? 12 : 0, position: "relative" }} onPointerDown={e => e.stopPropagation()}>
        <div style={{ position: "relative" }}>
          <SPBadge sp={item.story_points} onClick={() => setShowSP(!showSP)} />
          {showSP && <SPPicker value={item.story_points} onChange={v => update({ story_points: v })} onClose={() => setShowSP(false)} />}
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 5, backgroundColor: pc.bg, color: pc.color }}>{item.priorite?.valeur}</span>
        {item.module_suggere && <span style={{ fontSize: 11, color: T.textSubtle }}>· {item.module_suggere}</span>}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          {confirmDelete ? (
            <>
              <span style={{ fontSize: 11, color: T.danger, fontWeight: 600 }}>Supprimer ?</span>
              <button onClick={() => onDelete?.(item.id)} style={{ fontSize: 11, fontWeight: 700, color: "#fff", backgroundColor: T.danger, border: "none", borderRadius: 5, padding: "2px 8px", cursor: "pointer", fontFamily: "inherit" }}>Oui</button>
              <button onClick={() => setConfirm(false)} style={{ fontSize: 11, color: T.textMuted, backgroundColor: "#F3F4F6", border: `1px solid ${T.border}`, borderRadius: 5, padding: "2px 8px", cursor: "pointer", fontFamily: "inherit" }}>Non</button>
            </>
          ) : (
            <button onClick={() => setConfirm(true)} title="Supprimer ce ticket" style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: T.textSubtle, display: "flex", alignItems: "center" }}
              onMouseEnter={e => e.currentTarget.style.color = T.danger}
              onMouseLeave={e => e.currentTarget.style.color = T.textSubtle}>
              <Trash2 size={12} />
            </button>
          )}
          <button onClick={() => setExpanded(!expanded)} style={{ fontSize: 11, color: T.primary, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
            {expanded ? "Réduire" : "Plus"} <ChevronDown size={11} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${T.borderSubtle}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.textSubtle, letterSpacing: "0.05em", marginBottom: 5 }}>CONTEXTE</div>
            <InlineEdit value={item.contexte} onChange={v => update({ contexte: v })} multiline style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.6 }} placeholder="Décrire le problème observé…" />
          </div>
          {item.questions_clarification?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.textSubtle, letterSpacing: "0.05em", marginBottom: 5 }}>QUESTIONS À CLARIFIER</div>
              {item.questions_clarification.map((q, i) => (
                <div key={i} style={{ display: "flex", gap: 7, marginBottom: 4 }}><HelpCircle size={12} color={T.primary} style={{ flexShrink: 0, marginTop: 2 }} /><span style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.5 }}>{q}</span></div>
              ))}
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.textSubtle, letterSpacing: "0.05em", marginBottom: 6 }}>PROTOTYPES & VISUELS</div>
            <PrototypePanel prototypes={item.prototypes || []} onChange={v => update({ prototypes: v })} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.textSubtle, letterSpacing: "0.05em", marginBottom: 8 }}>COMMENTAIRES</div>
            <CommentThread commentaires={item.commentaires || []} onChange={v => update({ commentaires: v })} />
          </div>
        </div>
      )}

      {item.ambigu && (
        <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: T.radiusSm, backgroundColor: T.warningLight, border: `1px solid ${T.warningBorder}`, display: "flex", gap: 6, alignItems: "flex-start" }}>
          <AlertCircle size={12} color={T.warning} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11.5, color: "#92400E", lineHeight: 1.5 }}>Feedback ambigu — clarifier avec le stakeholder avant de mettre en backlog.</span>
        </div>
      )}
      </div>{/* end padding wrapper */}
    </div>
  );
}

function SortableCard({ item, allItems, onUpdate, onDelete, highlighted, onNavigate, onSelectNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 999 : undefined };
  return (
    <div ref={setNodeRef} style={style}>
      <KanbanCard item={item} allItems={allItems} onUpdate={onUpdate} onDelete={onDelete} highlighted={highlighted} onNavigate={onNavigate} onSelectNode={onSelectNode} isDragging={isDragging} dragListeners={listeners} dragAttributes={attributes} />
    </div>
  );
}

const COLUMNS = ["a-clarifier", "en-affinage", "pret-pour-dev", "exporte"];

function KanbanColumn({ statusKey, items, allItems, onUpdate, onDelete, highlightedId, onNavigate, onSelectNode }) {
  const cfg = STATUS_CFG[statusKey];
  const { setNodeRef, isOver } = useDroppable({ id: statusKey });
  return (
    <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "0 2px" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: cfg.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{cfg.label}</span>
        <span style={{ backgroundColor: cfg.bg, color: cfg.color, borderRadius: 20, fontSize: 11, fontWeight: 700, padding: "1px 8px", border: `1px solid ${cfg.border}` }}>{items.length}</span>
        <div style={{ flex: 1, height: 1, backgroundColor: T.border }} />
      </div>
      <div ref={setNodeRef} style={{ flex: 1, minHeight: 80, borderRadius: T.radius, backgroundColor: isOver ? T.primaryLight : (items.length === 0 ? "#FAFAFD" : "transparent"), border: isOver ? `1.5px dashed ${T.primary}` : (items.length === 0 ? `1.5px dashed ${T.border}` : "none"), display: "flex", flexDirection: "column", justifyContent: items.length === 0 ? "center" : "flex-start", padding: items.length === 0 ? 12 : 0, transition: "background 0.15s" }}>
        {items.length === 0 && <p style={{ textAlign: "center", fontSize: 12, color: T.textSubtle, margin: 0 }}>Glisser des items ici</p>}
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(item => <SortableCard key={item.id} item={item} allItems={allItems} onUpdate={onUpdate} onDelete={onDelete} highlighted={highlightedId === item.id} onNavigate={onNavigate} onSelectNode={onSelectNode} />)}
        </SortableContext>
      </div>
    </div>
  );
}

function KanbanBoard({ items, allItems, onItemsChange, onDeleteItem, highlightedId, onNavigate, onSelectNode, filter }) {
  const [activeId, setActiveId]       = useState(null);
  const [pendingMove, setPendingMove] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const findContainer = (id) => COLUMNS.includes(id) ? id : items.find(i => i.id === id)?.status;

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

  const updateItem = (updated) => onItemsChange(items.map(i => i.id === updated.id ? updated : i));
  const deleteItem = (id) => onDeleteItem?.(id);

  const totalSP  = items.filter(i => i.story_points).reduce((s, i) => s + i.story_points, 0);
  const activeItem = activeId ? items.find(i => i.id === activeId) : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {filter && (
            <span style={{ fontSize: 12.5, color: T.primary, backgroundColor: T.primaryLight, borderRadius: 6, padding: "3px 10px", fontWeight: 600, border: `1px solid ${T.primaryMid}44` }}>
              {filter.label}
            </span>
          )}
          {totalSP > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: T.primaryLight, border: `1px solid ${T.primaryMid}44`, borderRadius: T.radiusSm, padding: "4px 12px" }}>
              <Zap size={13} color={T.primary} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: T.primary }}>{totalSP} SP ≈ {(totalSP / 4).toFixed(1)} jours</span>
            </div>
          )}
        </div>
        <span style={{ fontSize: 11.5, color: T.textSubtle }}>{items.length} item{items.length > 1 ? "s" : ""}</span>
      </div>

      {pendingMove && (
        <div style={{ backgroundColor: T.warningLight, border: `1px solid ${T.warningBorder}`, borderRadius: T.radius, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={16} color={T.warning} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#92400E", marginBottom: 2 }}>Manque : {pendingMove.missing.join(" et ")}</div>
            <div style={{ fontSize: 12, color: "#A16207" }}>Marquer "Prêt pour dev" quand même ?</div>
          </div>
          <button onClick={() => { applyMove(pendingMove.item, pendingMove.targetStatus, pendingMove.item.id, pendingMove.item.id); setPendingMove(null); }} style={{ padding: "5px 12px", backgroundColor: T.warning, color: "#fff", border: "none", borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Confirmer</button>
          <button onClick={() => setPendingMove(null)} style={{ padding: "5px 10px", backgroundColor: "#F3F4F6", color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          {COLUMNS.map(col => {
            const colItems = items.filter(i => i.status === col).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
            return <KanbanColumn key={col} statusKey={col} items={colItems} allItems={allItems} onUpdate={updateItem} onDelete={deleteItem} highlightedId={highlightedId} onNavigate={onNavigate} onSelectNode={onSelectNode} />;
          })}
        </div>
        <DragOverlay>{activeItem && <KanbanCard item={activeItem} allItems={allItems} onUpdate={() => {}} isDragging />}</DragOverlay>
      </DndContext>
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
    <div style={{ backgroundColor: "#F8FAFC", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: "10px 12px", marginTop: 6 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {["Bug", "Spike"].map(t => {
          const c = TYPE_CFG[t];
          return (
            <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", backgroundColor: type === t ? c.bg : "#F3F4F6", color: type === t ? c.color : T.textMuted, border: `1.5px solid ${type === t ? c.badge : T.border}` }}>{t}</button>
          );
        })}
      </div>
      <input ref={ref} value={titre} onChange={e => setTitre(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder={type === "Bug" ? "Décrire le bug…" : "[SPIKE] Explorer…"} style={{ width: "100%", fontSize: 12.5, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 10px", fontFamily: "inherit", outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
      <input value={contexte} onChange={e => setCtx(e.target.value)} placeholder="Contexte (optionnel)…" style={{ width: "100%", fontSize: 12, border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 10px", fontFamily: "inherit", outline: "none", marginBottom: 8, boxSizing: "border-box", color: T.textMuted }} />
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={submit} style={{ flex: 1, padding: "5px 0", backgroundColor: T.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Ajouter</button>
        <button onClick={onCancel} style={{ flex: 1, padding: "5px 0", backgroundColor: "#F3F4F6", color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
      </div>
    </div>
  );
}

/* ─── DETAIL MODAL (Epic/Feature editing) ────────────────────── */
function DetailModal({ item, onUpdate, onClose }) {
  const [local, setLocal] = useState(item);
  const save = (patch) => { const next = { ...local, ...patch }; setLocal(next); onUpdate(next); };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ width: 460, height: "100%", backgroundColor: T.card, boxShadow: "-4px 0 24px rgba(0,0,0,.12)", overflow: "auto", padding: "24px 24px 40px", animation: "slideInRight 0.2s ease" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <TypeBadge type={item.type} />
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: T.textSubtle, borderRadius: 6 }}><X size={16} /></button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textSubtle, letterSpacing: "0.05em", marginBottom: 6 }}>TITRE</div>
          <InlineEdit value={local.titre} onChange={v => save({ titre: v })} multiline style={{ fontSize: 14, fontWeight: 600, color: T.text, lineHeight: 1.5 }} />
        </div>

        <div style={{ backgroundColor: T.successLight, border: `1px solid ${T.successBorder}`, borderRadius: T.radiusSm, padding: "10px 12px", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
            <Target size={12} color={T.success} />
            <span style={{ fontSize: 11, fontWeight: 700, color: T.success, letterSpacing: "0.05em" }}>VALEUR MÉTIER</span>
          </div>
          <InlineEdit value={local.valeur_metier} onChange={v => save({ valeur_metier: v })} multiline placeholder="Bénéfice attendu, chiffré si possible…" style={{ fontSize: 13, color: "#15803D", lineHeight: 1.5 }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textSubtle, letterSpacing: "0.05em", marginBottom: 6 }}>CONTEXTE (problème observé)</div>
          <InlineEdit value={local.contexte} onChange={v => save({ contexte: v })} multiline placeholder="Décrire le problème observé…" style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6 }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textSubtle, letterSpacing: "0.05em", marginBottom: 6 }}>CRITÈRES D'ACCEPTATION</div>
          <ACEditor criteres={local.criteres_acceptation || []} onChange={v => save({ criteres_acceptation: v })} />
        </div>

        {local.questions_clarification?.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textSubtle, letterSpacing: "0.05em", marginBottom: 6 }}>QUESTIONS À CLARIFIER</div>
            {local.questions_clarification.map((q, i) => (
              <div key={i} style={{ display: "flex", gap: 7, marginBottom: 4 }}><HelpCircle size={12} color={T.primary} style={{ flexShrink: 0, marginTop: 2 }} /><span style={{ fontSize: 12.5, color: "#374151" }}>{q}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── HIERARCHY TREE ─────────────────────────────────────────── */
function HierarchyTree({ backlog, activeFilter, onSelectFilter, onUpdateItem, onAddItem }) {
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

  const nodeBtn = (id, label, color, isActive, onClick, depth = 0) => (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", width: "100%", textAlign: "left", padding: `6px ${8 + depth * 12}px 6px ${depth > 0 ? 8 + depth * 12 : 8}px`, borderRadius: T.radiusSm, border: "none", cursor: "pointer", fontFamily: "inherit", backgroundColor: isActive ? T.primaryLight : "transparent", color: isActive ? T.primary : T.text, fontWeight: isActive ? 600 : 400, fontSize: 12.5, transition: T.transition, gap: 7 }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = "#F5F5FA"; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </button>
  );

  return (
    <>
      <div style={{ width: 248, flexShrink: 0, borderRight: `1px solid ${T.border}`, overflow: "auto", padding: "12px 8px", backgroundColor: T.sidebar, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px 10px" }}>
          <div style={{ width: 20, height: 20, borderRadius: 5, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center" }}><Layers size={10} color="#fff" /></div>
          <span style={{ fontSize: 10, fontWeight: 700, color: T.textSubtle, letterSpacing: ".07em", textTransform: "uppercase" }}>Hiérarchie</span>
        </div>

        {/* Tout afficher */}
        <button onClick={() => onSelectFilter(null)} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", textAlign: "left", padding: "6px 8px", borderRadius: T.radiusSm, border: `1.5px solid ${!activeFilter ? T.primaryMid : "transparent"}`, cursor: "pointer", fontFamily: "inherit", backgroundColor: !activeFilter ? T.primaryLight : "transparent", color: !activeFilter ? T.primary : T.textMuted, fontWeight: !activeFilter ? 700 : 500, fontSize: 12.5, transition: T.transition, marginBottom: 4 }}>
          <Layers size={13} />
          Tout afficher
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, backgroundColor: !activeFilter ? T.primaryMid + "55" : "#F3F4F6", color: !activeFilter ? T.primary : T.textSubtle, borderRadius: 10, padding: "0 6px" }}>
            {backlog.filter(i => EXECUTABLE_TYPES.includes(i.type)).length}
          </span>
        </button>

        <div style={{ height: 1, backgroundColor: T.borderSubtle, margin: "4px 0 8px" }} />

        {epics.map(epic => {
          const features  = backlog.filter(i => i.type === "Feature" && i.parentId === epic.id);
          const eCount    = execCount(epic.id, "Epic");
          const isExpanded = expanded[epic.id];
          const eCfg      = TYPE_CFG.Epic;

          return (
            <div key={epic.id} style={{ marginBottom: 4 }}>
              {/* Epic row */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button onClick={() => toggle(epic.id)} style={{ flexShrink: 0, padding: "3px 2px", background: "none", border: "none", cursor: "pointer", color: T.textSubtle, display: "flex", alignItems: "center" }}>
                  <ChevronRight size={13} style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                </button>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, padding: "4px 6px 4px 2px", borderRadius: T.radiusSm, backgroundColor: isActive(epic.id) ? eCfg.bg : "transparent", cursor: "pointer", transition: T.transition }}
                  onClick={() => onSelectFilter({ id: epic.id, type: "epic", label: `Epic · ${shortTitle(epic.titre)}` })}
                  onMouseEnter={e => { if (!isActive(epic.id)) e.currentTarget.style.backgroundColor = "#FFF9F5"; }}
                  onMouseLeave={e => { if (!isActive(epic.id)) e.currentTarget.style.backgroundColor = "transparent"; }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: eCfg.dot, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: isActive(epic.id) ? 700 : 600, color: isActive(epic.id) ? eCfg.color : T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shortTitle(epic.titre)}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: eCfg.color, backgroundColor: eCfg.bg, border: `1px solid ${eCfg.badge}`, borderRadius: 10, padding: "0 5px", flexShrink: 0 }}>{eCount}</span>
                </div>
                <button onClick={() => setDetailItem(epic)} title="Modifier l'Epic" style={{ flexShrink: 0, padding: 3, background: "none", border: "none", cursor: "pointer", color: T.textSubtle, opacity: 0.5 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0.5}>
                  <Pencil size={11} />
                </button>
              </div>

              {/* Features */}
              {isExpanded && (
                <div style={{ marginLeft: 20, marginTop: 2 }}>
                  {features.map(feat => {
                    const fCount = execCount(feat.id, "Feature");
                    const fCfg   = TYPE_CFG.Feature;
                    const fActive = isActive(feat.id);

                    return (
                      <div key={feat.id}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, padding: "4px 6px", borderRadius: T.radiusSm, backgroundColor: fActive ? fCfg.bg : "transparent", cursor: "pointer", transition: T.transition }}
                            onClick={() => onSelectFilter({ id: feat.id, type: "feature", label: `Feature · ${shortTitle(feat.titre)}` })}
                            onMouseEnter={e => { if (!fActive) e.currentTarget.style.backgroundColor = "#F5FDF7"; }}
                            onMouseLeave={e => { if (!fActive) e.currentTarget.style.backgroundColor = "transparent"; }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: fCfg.dot, flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 12, fontWeight: fActive ? 700 : 500, color: fActive ? fCfg.color : T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shortTitle(feat.titre)}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: fCfg.color, backgroundColor: fCfg.bg, border: `1px solid ${fCfg.badge}`, borderRadius: 10, padding: "0 5px", flexShrink: 0 }}>{fCount}</span>
                          </div>
                          <button onClick={() => setDetailItem(feat)} title="Modifier la Feature" style={{ flexShrink: 0, padding: 3, background: "none", border: "none", cursor: "pointer", color: T.textSubtle, opacity: 0.5 }}
                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                            onMouseLeave={e => e.currentTarget.style.opacity = 0.5}>
                            <Pencil size={10} />
                          </button>
                          <button onClick={() => setAddingTo(addingTo === feat.id ? null : feat.id)} title="Ajouter Bug ou Spike" style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 4, backgroundColor: addingTo === feat.id ? T.primaryLight : "#F3F4F6", color: addingTo === feat.id ? T.primary : T.textSubtle, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Plus size={11} />
                          </button>
                        </div>
                        {addingTo === feat.id && <AddChildForm parentId={feat.id} onAdd={handleAdd} onCancel={() => setAddingTo(null)} />}
                      </div>
                    );
                  })}
                  {features.length === 0 && <span style={{ fontSize: 11.5, color: T.textSubtle, paddingLeft: 4 }}>Aucune Feature</span>}
                </div>
              )}
            </div>
          );
        })}

        {epics.length === 0 && <div style={{ textAlign: "center", padding: 16, fontSize: 12.5, color: T.textSubtle }}>Génère un feedback pour voir la hiérarchie.</div>}
      </div>

      {detailItem && <DetailModal item={detailItem} onUpdate={(updated) => { onUpdateItem(updated); setDetailItem(updated); }} onClose={() => setDetailItem(null)} />}
    </>
  );
}

/* ─── DEMO BANNER ────────────────────────────────────────────── */
function DemoBanner() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: T.warningLight, border: `1px solid ${T.warningBorder}`, borderRadius: T.radiusSm, padding: "8px 14px", marginBottom: 20 }}>
      <AlertCircle size={14} color={T.warning} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, color: "#A16207" }}><strong style={{ color: "#92400E" }}>Données d'exemple</strong> — Ces chiffres illustrent la fonctionnalité. Connecte ton historique réel pour des statistiques basées sur ton usage.</span>
    </div>
  );
}

/* ─── PAGE: ANALYSER ─────────────────────────────────────────── */
function PageAnalyser({ backlog, onSetBacklog, analyserMode, setAnalyserMode }) {
  const [feedback, setFeedback]       = useState("");
  const [outputType, setOutputType]   = useState("auto");
  const [framework, setFramework]     = useState("MoSCoW");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [highlightedId, setHighId]    = useState(null);
  const [activeFilter, setFilter]     = useState(null);

  const hasBacklog = backlog.length > 0;

  const handleNavigate = (id) => {
    setHighId(id);
    setTimeout(() => setHighId(null), 2000);
  };

  const handleSelectNode = (filter) => {
    setFilter(filter);
  };

  const handleGenerate = async () => {
    if (!feedback.trim() || loading) return;
    setLoading(true); setError("");
    const typeInstruction = outputType === "auto"
      ? "Détecte automatiquement les niveaux (Epic/Feature/User Story/Bug/Spike)."
      : `Type cible : "${outputType}".`;
    try {
      const existingCtx = backlog.length > 0
        ? `\n\n--- BACKLOG EXISTANT (${backlog.length} items — détecte les doublons) ---\n` +
          backlog.slice(0, 30).map(i => `[${i.id}] [${i.type}] ${i.titre}`).join("\n")
        : "";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4096, system: SYSTEM_PROMPT, messages: [{ role: "user", content: `Framework: ${framework}\n${typeInstruction}\n\nFeedback:\n${feedback}${existingCtx}` }] })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error("Clé API invalide (VITE_ANTHROPIC_API_KEY).");
        if (res.status === 429) throw new Error("Quota dépassé — vérifiez console.anthropic.com.");
        throw new Error(`Erreur ${res.status} : ${err?.error?.message || "Réessayez."}`);
      }
      const data   = await res.json();
      const txt    = (data.content?.[0]?.text || "").replace(/```json\n?|```\n?/g, "").trim();
      const parsed = JSON.parse(txt).items || [];
      onSetBacklog([...backlog, ...parsed.map(item => ({
        ...item, status: defaultStatus(item), ordre: 0,
        prototypes: [], commentaires: [], valeur_metier: item.valeur_metier || "",
        tags: item.tags || [], rice: item.rice || null,
        potentiel_doublon: item.potentiel_doublon || null,
      }))]);
      setFilter(null);
      setAnalyserMode("result");
    } catch (e) { setError(e.message || "Erreur inattendue."); }
    finally { setLoading(false); }
  };

  const handleUpdate = (updated) => {
    onSetBacklog(backlog.map(i => i.id === updated.id ? updated : i));
  };

  const handleAddItem = (item) => {
    onSetBacklog([...backlog, item]);
  };

  const handleDeleteItem = (id) => {
    onSetBacklog(backlog.filter(i => i.id !== id));
  };

  const handleKanbanChange = (updatedKanban) => {
    onSetBacklog(backlog.map(b => updatedKanban.find(k => k.id === b.id) || b));
  };

  const kanbanItems = getKanbanItems(backlog, activeFilter);
  const charCount   = feedback.length;

  const toMd = (item) => `## [${item.type}] ${item.titre}\n\n**Valeur métier:** ${item.valeur_metier || "—"}\n\n**Contexte:** ${item.contexte}\n\n**Critères d'acceptation:**\n${item.criteres_acceptation?.map(c => `- [ ] ${c}`).join("\n") || ""}`;

  const handleExport = () => {
    if (!backlog.length) return;
    const blob = new Blob([backlog.map(toMd).join("\n\n---\n\n")], { type: "text/markdown" });
    Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "backlog.md" }).click();
  };

  return (
    <>
      {hasBacklog && analyserMode === "result" && (
        <div style={{ backgroundColor: "#FAFAFA", borderBottom: `1px solid ${T.border}`, padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: "-0.02em" }}>Backlog généré</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: T.primary, backgroundColor: T.primaryLight, borderRadius: 20, padding: "2px 9px", border: `1px solid ${T.primaryMid}44` }}>{backlog.length} items</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setFeedback(""); setError(""); setFilter(null); setAnalyserMode("input"); }} style={{ display: "flex", alignItems: "center", gap: 5, backgroundColor: "transparent", color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "#F3F4F6"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
              <RefreshCw size={12} /> Nouveau feedback
            </button>
            <button onClick={handleExport} style={{ display: "flex", alignItems: "center", gap: 5, background: T.gradient, color: "#fff", border: "none", borderRadius: T.radiusSm, padding: "5px 13px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", boxShadow: T.shadowPrimary, transition: "opacity 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
              <Download size={12} /> Exporter
            </button>
          </div>
        </div>
      )}

      {analyserMode !== "result" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          {/* Full hero with greeting + textarea */}
          <div style={{
            background: T.gradientHero,
            padding: "40px 28px 36px",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Decorative orbs */}
            <div style={{ position: "absolute", width: 260, height: 260, borderRadius: "50%", background: "rgba(92,95,212,0.06)", top: -80, right: 60, pointerEvents: "none", animation: "floatOrb 6s ease-in-out infinite" }} />
            <div style={{ position: "absolute", width: 160, height: 160, borderRadius: "50%", background: "rgba(139,92,246,0.07)", bottom: -50, right: 30, pointerEvents: "none", animation: "floatOrb 8s ease-in-out infinite 1.5s" }} />
            <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto" }}>
              {/* Big greeting */}
              <h1 style={{ fontSize: 28, fontWeight: 800, color: T.text, margin: "0 0 6px", letterSpacing: "-0.04em", animation: "fadeInUp 0.4s ease both", lineHeight: 1.2 }}>
                👋 Hey, Ernestine !
              </h1>
              <p style={{ fontSize: 13.5, color: T.textMuted, margin: "0 0 22px", fontWeight: 400, animation: "fadeInUp 0.45s ease 0.05s both", lineHeight: 1.6 }}>
                Colle un feedback brut ci-dessous — Et je le transforme en backlog structuré en quelques secondes.
              </p>

              {/* Textarea directly in hero */}
              <div style={{ animation: "fadeInUp 0.5s ease 0.1s both" }}>
                <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder={`Ex : "Marc m'a dit en réunion que son équipe perd 2h par jour à ressaisir les données de ventes dans Excel…"`}
                  style={{ width: "100%", minHeight: 130, border: `1.5px solid rgba(92,95,212,0.18)`, borderRadius: T.radius, padding: "14px 16px", fontSize: 13.5, color: "#374151", lineHeight: 1.7, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", backgroundColor: "rgba(255,255,255,0.85)", backdropFilter: "blur(6px)", outline: "none", transition: "border-color 0.15s, box-shadow 0.15s", boxShadow: "0 2px 12px rgba(92,95,212,0.08)" }}
                  onFocus={e => { e.target.style.borderColor = T.primary; e.target.style.boxShadow = `0 0 0 3px rgba(92,95,212,0.12), 0 2px 12px rgba(92,95,212,0.1)`; e.target.style.backgroundColor = "#fff"; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(92,95,212,0.18)"; e.target.style.boxShadow = "0 2px 12px rgba(92,95,212,0.08)"; e.target.style.backgroundColor = "rgba(255,255,255,0.85)"; }} />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4, marginBottom: 14 }}>
                  <span style={{ fontSize: 11.5, color: charCount < 60 && charCount > 0 ? "#F59E0B" : T.textSubtle }}>{charCount} car.</span>
                </div>

                {/* Options inline */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                  <div style={{ flex: 1, minWidth: 220, background: "rgba(255,255,255,0.7)", borderRadius: T.radiusSm, padding: "12px 14px", border: `1px solid rgba(92,95,212,0.12)` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.textSubtle, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>Type de sortie</div>
                    <PillGroup name="type" value={outputType} onChange={setOutputType} options={[{ v: "auto", label: "Auto-detect", sub: "Recommandé" }, { v: "Epic", label: "Epic" }, { v: "Feature", label: "Feature" }, { v: "User Story", label: "User Story" }, { v: "Bug", label: "Bug" }, { v: "Spike", label: "Spike" }]} />
                  </div>
                  <div style={{ flex: 1, minWidth: 220, background: "rgba(255,255,255,0.7)", borderRadius: T.radiusSm, padding: "12px 14px", border: `1px solid rgba(92,95,212,0.12)` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.textSubtle, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>Priorisation</div>
                    <PillGroup name="fw" value={framework} onChange={setFramework} options={[{ v: "MoSCoW", label: "MoSCoW", sub: "Must/Should/Could" }, { v: "RICE", label: "RICE", sub: "Score composite" }, { v: "Valeur-Effort", label: "Valeur/Effort", sub: "Impact vs effort" }]} />
                  </div>
                </div>

                {error && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", background: T.dangerLight, border: `1px solid ${T.dangerBorder}`, borderRadius: T.radiusSm, padding: "10px 14px", marginBottom: 14 }}>
                    <AlertCircle size={14} color={T.danger} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: T.danger }}>{error}</span>
                  </div>
                )}

                <button onClick={handleGenerate} disabled={loading || feedback.trim().length < 10} style={{ width: "100%", padding: "13px 0", border: "none", borderRadius: T.radius, background: loading || feedback.trim().length < 10 ? "#C7C8F5" : T.gradient, color: "#fff", fontSize: 14.5, fontWeight: 700, cursor: loading || feedback.trim().length < 10 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: loading || feedback.trim().length < 10 ? "none" : T.shadowPrimary, fontFamily: "inherit", letterSpacing: "-0.01em", transition: "opacity 0.15s, transform 0.15s" }}
                  onMouseEnter={e => { if (!loading && feedback.trim().length >= 10) { e.currentTarget.style.opacity = "0.92"; e.currentTarget.style.transform = "translateY(-1px)"; }}}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}>
                  {loading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Structuration en cours…</> : <><Sparkles size={16} /> Transformer en backlog</>}
                </button>
              </div>

              {/* Feature pills */}
              <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap", animation: "fadeInUp 0.55s ease 0.15s both" }}>
                {[
                  { icon: Zap,      label: "Génération IA",    color: T.primary,  bg: "rgba(92,95,212,0.1)" },
                  { icon: Layers,   label: "Epic → US / Bug",  color: "#7C3AED",  bg: "rgba(124,58,237,0.1)" },
                  { icon: Target,   label: "MoSCoW / RICE",    color: "#15803D",  bg: "rgba(21,128,61,0.1)" },
                  { icon: Download, label: "Export Markdown",  color: "#C2410C",  bg: "rgba(194,65,12,0.1)" },
                ].map(({ icon: Icon, label, color, bg }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: bg, borderRadius: 20, padding: "4px 11px", cursor: "default" }}>
                    <Icon size={11} color={color} />
                    <span style={{ fontSize: 11, fontWeight: 600, color }}>{label}</span>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: "center", marginTop: 14 }}>
                <button onClick={() => { onSetBacklog(MOCK_KANBAN); setAnalyserMode("result"); }} style={{ fontSize: 12.5, color: T.primary, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, textDecoration: "underline", opacity: 0.8 }}>
                  Voir un exemple avec le cas Kantara →
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <HierarchyTree backlog={backlog} activeFilter={activeFilter} onSelectFilter={setFilter} onUpdateItem={handleUpdate} onAddItem={handleAddItem} />
          <div style={{ flex: 1, overflow: "auto", padding: "20px 20px 20px 16px" }}>
            <KanbanBoard items={kanbanItems} allItems={backlog} onItemsChange={handleKanbanChange} onDeleteItem={handleDeleteItem} highlightedId={highlightedId} onNavigate={handleNavigate} onSelectNode={handleSelectNode} filter={activeFilter} />
          </div>
        </div>
      )}
    </>
  );
}

/* ─── PAGE: BOARD GLOBAL ─────────────────────────────────────── */
function PageGlobalBoard({ backlog, onSetBacklog }) {
  const [highlightedId, setHighId] = useState(null);
  const items = backlog.filter(i => EXECUTABLE_TYPES.includes(i.type));

  const handleKanbanChange = (updatedKanban) => {
    onSetBacklog(backlog.map(b => updatedKanban.find(k => k.id === b.id) || b));
  };

  const handleDeleteItem = (id) => {
    onSetBacklog(backlog.filter(i => i.id !== id));
  };

  return (
    <>
      <div style={{ backgroundColor: T.sidebar, borderBottom: `1px solid ${T.border}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #7C3AED 0%, #5C5FD4 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}><Layout size={13} color="#fff" /></div>
          Backlog global
          <span style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, backgroundColor: "#F3F4F6", borderRadius: 20, padding: "2px 11px" }}>{items.length} items</span>
        </h1>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.entries({ "User Story": items.filter(i=>i.type==="User Story").length, Bug: items.filter(i=>i.type==="Bug").length, Spike: items.filter(i=>i.type==="Spike").length }).map(([type, count]) => count > 0 ? <TypeBadge key={type} type={type} /> : null)}
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
        {items.length === 0
          ? <div style={{ textAlign: "center", padding: 60, color: T.textSubtle }}>
              <Layers size={32} color={T.textSubtle} style={{ opacity: 0.4, marginBottom: 12 }} />
              <p style={{ fontSize: 14, margin: 0 }}>Aucun item exécutable dans le backlog.</p>
              <p style={{ fontSize: 13, margin: "6px 0 0", color: T.textSubtle }}>Génère un feedback dans "Analyser" pour commencer.</p>
            </div>
          : <KanbanBoard items={items} allItems={backlog} onItemsChange={handleKanbanChange} onDeleteItem={handleDeleteItem} highlightedId={highlightedId} onNavigate={(id) => { setHighId(id); setTimeout(() => setHighId(null), 2000); }} onSelectNode={() => {}} />
        }
      </div>
    </>
  );
}

/* ─── PAGE: HISTORIQUE ───────────────────────────────────────── */
function PageHistorique({ onViewItems }) {
  const [selected, setSelected] = useState(null);
  const projectColor = (p) => p === "Kantara" ? { bg: "#EEF2FF", color: "#4338CA" } : p === "Nexio" ? { bg: "#F0FDF4", color: "#15803D" } : { bg: "#FFF4ED", color: "#C2410C" };

  return (
    <>
      <div style={{ backgroundColor: T.sidebar, borderBottom: `1px solid ${T.border}`, padding: "12px 24px", flexShrink: 0, display: "flex", alignItems: "center" }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}><Clock size={13} color="#fff" /></div>
          Historique des analyses
          <span style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, backgroundColor: "#F3F4F6", borderRadius: 20, padding: "2px 11px" }}>{MOCK_HISTORY.length}</span>
        </h1>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "28px" }}>
        <DemoBanner />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {MOCK_HISTORY.map(h => {
            const pc = projectColor(h.projet);
            const isOpen = selected === h.id;
            return (
              <div key={h.id} style={{ backgroundColor: T.card, borderRadius: T.radiusLg, padding: "18px 20px", border: `1px solid ${isOpen ? T.primaryMid : T.border}`, boxShadow: isOpen ? T.shadowMd : T.shadow, cursor: "pointer", transition: "all 0.15s" }} onClick={() => setSelected(isOpen ? null : h.id)}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 9px", borderRadius: 6, backgroundColor: pc.bg, color: pc.color }}>{h.projet}</span>
                    <span style={{ fontSize: 11.5, color: T.textSubtle, display: "flex", alignItems: "center", gap: 4 }}><Calendar size={11} /> {h.date}</span>
                  </div>
                  <ChevronDown size={15} color={T.textSubtle} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                </div>
                <p style={{ fontSize: 13, color: T.text, lineHeight: 1.55, margin: "0 0 12px", fontStyle: "italic" }}>"{h.apercu}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, backgroundColor: T.primaryLight, borderRadius: 6, padding: "3px 9px", fontSize: 11.5, fontWeight: 600, color: T.primary }}><Layers size={11} />{h.items} items</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, backgroundColor: "#F3F4F6", borderRadius: 6, padding: "3px 9px", fontSize: 11.5, fontWeight: 600, color: T.textMuted }}><Timer size={11} />{h.framework}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, backgroundColor: T.successLight, borderRadius: 6, padding: "3px 9px", fontSize: 11.5, fontWeight: 600, color: T.success }}><Zap size={11} />{h.duree}</span>
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {h.tags.map(tag => <span key={tag} style={{ fontSize: 11, color: T.textSubtle, backgroundColor: "#F5F5FA", borderRadius: 4, padding: "1px 7px", border: `1px solid ${T.border}` }}>#{tag}</span>)}
                </div>
                {isOpen && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>{h.types.map((t, i) => <TypeBadge key={i} type={t} />)}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={(e) => { e.stopPropagation(); if (h.mockItems?.length) onViewItems(h.mockItems); }} disabled={!h.mockItems?.length} style={{ flex: 1, padding: "8px", backgroundColor: h.mockItems?.length ? T.primaryLight : "#F9FAFB", color: h.mockItems?.length ? T.primary : T.textSubtle, border: `1px solid ${h.mockItems?.length ? T.primaryMid + "44" : T.border}`, borderRadius: T.radiusSm, fontSize: 12.5, fontWeight: 600, cursor: h.mockItems?.length ? "pointer" : "not-allowed", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                        <Eye size={13} /> {h.mockItems?.length ? "Voir les items" : "Exemple uniquement"}
                      </button>
                      <button onClick={e => e.stopPropagation()} style={{ flex: 1, padding: "8px", backgroundColor: "#F9FAFB", color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
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
function StatCard({ icon: Icon, label, value, sub, color = T.primary, bg = T.primaryLight }) {
  return (
    <div style={{ backgroundColor: T.card, borderRadius: T.radiusLg, padding: "20px", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><Icon size={18} color={color} /></div>
      <div style={{ fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: "-0.03em", marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: T.textSubtle }}>{sub}</div>
    </div>
  );
}

function PageRapport() {
  const s = RAPPORT_STATS;
  const maxActivite = Math.max(...s.activite);
  const maxProjet   = Math.max(...Object.values(s.parProjet));
  return (
    <>
      <div style={{ backgroundColor: T.sidebar, borderBottom: `1px solid ${T.border}`, padding: "12px 24px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #10B981 0%, #0D9488 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}><BarChart2 size={13} color="#fff" /></div>
          Rapport d'activité
        </h1>
        <span style={{ fontSize: 11.5, color: T.textSubtle, backgroundColor: "#F3F4F6", borderRadius: 20, padding: "4px 12px", fontWeight: 500 }}>30 derniers jours</span>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "28px" }}>
        <DemoBanner />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
          <StatCard icon={FileText} label="Feedbacks analysés" value={s.feedbacks} sub="ce mois-ci" color={T.primary} bg={T.primaryLight} />
          <StatCard icon={Layers} label="Items générés" value={s.items} sub="Epics, Features, US, Bugs, Spikes" color="#15803D" bg="#F0FDF4" />
          <StatCard icon={Repeat2} label="Taux de réutilisation" value={`${s.reutilisation}%`} sub="sans retouche majeure" color="#C2410C" bg="#FFF4ED" />
          <StatCard icon={Timer} label="Heures économisées" value={`${s.tempsSave}h`} sub="estimation / semaine" color="#A16207" bg="#FEFCE8" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div style={{ backgroundColor: T.card, borderRadius: T.radiusLg, padding: "20px", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 16 }}>Activité — 7 derniers jours</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 100 }}>
              {s.activite.map((v, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 10.5, color: T.textSubtle, fontWeight: 600 }}>{v}</span>
                  <div style={{ width: "100%", borderRadius: "4px 4px 0 0", backgroundColor: i === 3 ? T.primary : T.primaryLight, height: `${(v / maxActivite) * 80}px` }} />
                  <span style={{ fontSize: 10, color: T.textSubtle }}>{s.jours[i]}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ backgroundColor: T.card, borderRadius: T.radiusLg, padding: "20px", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 18 }}>Répartition par type</div>
            {Object.entries(s.parType).map(([type, count]) => {
              const cfg = TYPE_CFG[type] || TYPE_CFG["User Story"];
              const pct = Math.round((count / s.items) * 100);
              return (
                <div key={type} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: cfg.dot }} /><span style={{ fontSize: 12.5, color: T.text }}>{type}</span></div>
                    <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 600 }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, backgroundColor: T.borderSubtle, borderRadius: 99 }}><div style={{ height: "100%", width: `${pct}%`, backgroundColor: cfg.dot, borderRadius: 99, opacity: 0.8 }} /></div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ backgroundColor: T.card, borderRadius: T.radiusLg, padding: "20px", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 18 }}>Distribution MoSCoW</div>
            {Object.entries(s.parPrio).map(([label, count]) => {
              const pc = PRIO_CFG[label] || { bg: "#F9FAFB", color: "#6B7280" };
              const pct = Math.round((count / Object.values(s.parPrio).reduce((a, b) => a + b, 0)) * 100);
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, padding: "2px 9px", borderRadius: 5, backgroundColor: pc.bg, color: pc.color, minWidth: 96, textAlign: "center" }}>{label}</span>
                  <div style={{ flex: 1, height: 6, backgroundColor: T.borderSubtle, borderRadius: 99 }}><div style={{ height: "100%", width: `${pct}%`, backgroundColor: pc.color, borderRadius: 99, opacity: 0.5 }} /></div>
                  <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 600, minWidth: 24, textAlign: "right" }}>{count}</span>
                </div>
              );
            })}
          </div>
          <div style={{ backgroundColor: T.card, borderRadius: T.radiusLg, padding: "20px", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 18 }}>Items par projet</div>
            {Object.entries(s.parProjet).map(([projet, count], idx) => {
              const pct    = Math.round((count / maxProjet) * 100);
              const colors = [T.primary, "#15803D", "#C2410C"];
              const bgs    = [T.primaryLight, "#F0FDF4", "#FFF4ED"];
              return (
                <div key={projet} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 12.5, color: T.text, fontWeight: 600 }}>{projet}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: colors[idx], backgroundColor: bgs[idx], borderRadius: 20, padding: "1px 9px" }}>{count} items</span>
                  </div>
                  <div style={{ height: 8, backgroundColor: T.borderSubtle, borderRadius: 99 }}><div style={{ height: "100%", width: `${pct}%`, backgroundColor: colors[idx], borderRadius: 99, opacity: 0.7 }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── PAGE: PARAMÈTRES ───────────────────────────────────────── */
function PageParametres() {
  const [model, setModel]       = useState("claude-sonnet-4-6");
  const [defFw, setDefFw]       = useState("MoSCoW");
  const [velocity, setVelocity] = useState(4);
  const [saved, setSaved]       = useState(false);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const Toggle = ({ value, onChange }) => (
    <div onClick={() => onChange(!value)} style={{ width: 38, height: 22, borderRadius: 99, backgroundColor: value ? T.primary : "#D1D5DB", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
      <div style={{ position: "absolute", top: 3, left: value ? 19 : 3, width: 16, height: 16, borderRadius: "50%", backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)", transition: "left 0.2s" }} />
    </div>
  );
  const [notif, setNotif] = useState(true);
  const Section = ({ icon: Icon, title, children }) => (
    <div style={{ backgroundColor: T.card, borderRadius: T.radiusLg, border: `1px solid ${T.border}`, boxShadow: T.shadow, marginBottom: 16, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.borderSubtle}`, display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={14} color={T.primary} /></div>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{title}</span>
      </div>
      <div style={{ padding: "18px 20px" }}>{children}</div>
    </div>
  );
  return (
    <>
      <div style={{ backgroundColor: T.sidebar, borderBottom: `1px solid ${T.border}`, padding: "12px 24px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #6B7280 0%, #374151 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}><Settings2 size={13} color="#fff" /></div>
          Paramètres
        </h1>
        <button onClick={save} style={{ display: "flex", alignItems: "center", gap: 6, background: saved ? "linear-gradient(135deg,#16A34A,#15803D)" : T.gradient, color: "#fff", border: "none", borderRadius: T.radiusSm, padding: "6px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", boxShadow: T.shadowPrimary, transition: "background 0.2s, opacity 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
          {saved ? <><CheckCheck size={13} /> Sauvegardé</> : "Sauvegarder"}
        </button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "28px", maxWidth: 680 }}>
        <Section icon={Key} title="Modèle Claude">
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-8"].map(m => (
              <button key={m} onClick={() => setModel(m)} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", backgroundColor: model === m ? T.primary : "#F3F4F6", color: model === m ? "#fff" : T.textMuted, border: `1px solid ${model === m ? T.primary : T.border}` }}>
                {m.includes("haiku") ? "Haiku" : m.includes("sonnet") ? "Sonnet (Recommandé)" : "Opus"}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12.5, color: T.textSubtle, margin: 0 }}>La clé API est configurée via la variable d'environnement <code style={{ backgroundColor: "#F3F4F6", padding: "1px 5px", borderRadius: 3, fontFamily: "monospace" }}>VITE_ANTHROPIC_API_KEY</code> dans le fichier <code style={{ backgroundColor: "#F3F4F6", padding: "1px 5px", borderRadius: 3, fontFamily: "monospace" }}>.env</code>.</p>
        </Section>
        <Section icon={Zap} title="Vélocité d'équipe">
          <div style={{ marginBottom: 6, fontSize: 13.5, fontWeight: 500, color: T.text }}>1 Story Point = <strong>{velocity}h</strong> — 1 jour ≈ {Math.round(8/velocity)} SP</div>
          <input type="range" min={1} max={8} step={0.5} value={velocity} onChange={e => setVelocity(Number(e.target.value))} style={{ width: "100%", accentColor: T.primary, marginBottom: 4 }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.textSubtle }}>
            <span>1h (rapide)</span><span>4h (standard)</span><span>8h (lent)</span>
          </div>
        </Section>
        <Section icon={Sliders} title="Préférences">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div><div style={{ fontSize: 13.5, fontWeight: 500, color: T.text }}>Framework par défaut</div><div style={{ fontSize: 12, color: T.textSubtle }}>Utilisé à chaque analyse</div></div>
            <div style={{ display: "flex", gap: 6 }}>
              {["MoSCoW", "RICE", "Valeur-Effort"].map(fw => (
                <button key={fw} onClick={() => setDefFw(fw)} style={{ padding: "5px 11px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontFamily: "inherit", backgroundColor: defFw === fw ? T.primary : "#F3F4F6", color: defFw === fw ? "#fff" : T.textMuted, border: `1px solid ${defFw === fw ? T.primary : T.border}` }}>{fw}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontSize: 13.5, fontWeight: 500, color: T.text }}>Rapport hebdomadaire</div><div style={{ fontSize: 12, color: T.textSubtle }}>Email chaque lundi à 8h</div></div>
            <Toggle value={notif} onChange={setNotif} />
          </div>
        </Section>
        <Section icon={Users} title="Projets">
          {["Kantara", "Nexio", "Pathline"].map((p, i) => {
            const colors = [T.primary, "#15803D", "#C2410C"];
            const counts = [28, 21, 18];
            return (
              <div key={p} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 2 ? `1px solid ${T.borderSubtle}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: colors[i] }} />
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: T.text }}>{p}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: colors[i] }}>{counts[i]} items</span>
              </div>
            );
          })}
        </Section>
      </div>
    </>
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

function TipsBanner() {
  const [visible, setVisible] = useState(true);
  const [idx] = useState(() => Math.floor(Math.random() * TIPS_DU_JOUR.length));
  if (!visible) return null;
  return (
    <div style={{
      backgroundColor: "#F0F0FF", borderBottom: `1px solid #DDDDF5`,
      padding: "9px 20px", display: "flex", alignItems: "center", gap: 10,
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 15, flexShrink: 0 }}>💡</span>
      <span style={{ fontSize: 12.5, color: "#4338CA", flex: 1, lineHeight: 1.5 }}>
        <strong style={{ fontWeight: 700 }}>Tip du jour · </strong>{TIPS_DU_JOUR[idx]}
      </span>
      <button onClick={() => setVisible(false)} style={{
        background: "none", border: "none", cursor: "pointer", color: "#A5B4FC",
        fontSize: 18, lineHeight: 1, padding: "0 4px", flexShrink: 0,
        transition: "color 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.color = "#6366F1"}
      onMouseLeave={e => e.currentTarget.style.color = "#A5B4FC"}>×</button>
    </div>
  );
}

/* ─── APP HEADER ─────────────────────────────────────────────── */
const NAV_ITEMS = [
  { id: "analyser",   label: "Analyser",   Icon: Sparkles  },
  { id: "board",      label: "Backlog",    Icon: Layout    },
  { id: "historique", label: "Historique", Icon: Clock     },
  { id: "rapport",    label: "Rapport",    Icon: BarChart2 },
  { id: "settings",   label: "Paramètres", Icon: Settings2 },
];

function AppHeader({ activeNav, setActiveNav, backlog, goHome }) {
  const boardCount = backlog.filter(i => EXECUTABLE_TYPES.includes(i.type)).length;

  return (
    <header style={{
      height: 52, backgroundColor: "#FFFFFF", borderBottom: `1px solid ${T.border}`,
      display: "flex", alignItems: "center", padding: "0 20px", gap: 16,
      flexShrink: 0, zIndex: 100, boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
    }}>
      {/* Logo — cliquable pour revenir à l'accueil */}
      <div onClick={goHome} style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0, minWidth: 140, cursor: "pointer", userSelect: "none" }}
        title="Retour à l'accueil">
        <img src={logoSrc} alt="FeedbackPO" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, objectFit: "cover", boxShadow: "0 2px 8px rgba(92,95,212,.25)" }} />
        <div style={{ fontSize: 14, fontWeight: 800, color: T.text, letterSpacing: "-0.03em" }}>FeedbackPO</div>
      </div>

      {/* Nav pills */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 2,
          backgroundColor: "#F0F0F8", borderRadius: 99, padding: "4px",
        }}>
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = activeNav === id;
            const badge = id === "board" ? boardCount : id === "historique" ? MOCK_HISTORY.length : 0;
            return (
              <button key={id} onClick={() => id === "analyser" ? goHome() : setActiveNav(id)} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 99, border: "none",
                cursor: "pointer", fontFamily: "inherit",
                fontSize: 12.5, fontWeight: active ? 600 : 400,
                color: active ? T.primary : T.textMuted,
                backgroundColor: active ? "#FFFFFF" : "transparent",
                boxShadow: active ? "0 1px 4px rgba(0,0,0,.09), 0 0 0 0.5px rgba(0,0,0,0.03)" : "none",
                transition: "all 0.18s ease", whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.55)"; e.currentTarget.style.color = T.text; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = T.textMuted; }}}>
                <Icon size={13} strokeWidth={active ? 2.2 : 1.8} />
                {label}
                {badge > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, lineHeight: 1,
                    color: active ? T.primary : "#9CA3AF",
                    backgroundColor: active ? T.primaryLight : "#E0E0EC",
                    borderRadius: 99, padding: "1px 6px",
                  }}>{badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Avatar only */}
      <div style={{ flexShrink: 0, minWidth: 140, display: "flex", justifyContent: "flex-end" }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: T.gradient,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
          boxShadow: "0 2px 8px rgba(92,95,212,.32)",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
        title="Ernestine · Product Owner"
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(92,95,212,.45)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(92,95,212,.32)"; }}>
          E
        </div>
      </div>
    </header>
  );
}

/* ─── APP ────────────────────────────────────────────────────── */
export default function App() {
  const [activeNav, setActiveNav]       = useState("analyser");
  const [backlog, setBacklog]           = useState(MOCK_KANBAN);
  const [analyserMode, setAnalyserMode] = useState("result");

  const goHome = () => { setActiveNav("analyser"); setAnalyserMode("input"); };
  const navigateToAnalyser = (items) => { setBacklog(items); setActiveNav("analyser"); setAnalyserMode("result"); };

  const PAGES = {
    analyser:   <PageAnalyser backlog={backlog} onSetBacklog={setBacklog} analyserMode={analyserMode} setAnalyserMode={setAnalyserMode} />,
    board:      <PageGlobalBoard backlog={backlog} onSetBacklog={setBacklog} />,
    historique: <PageHistorique onViewItems={navigateToAnalyser} />,
    rapport:    <PageRapport />,
    settings:   <PageParametres />,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", backgroundColor: T.bg, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
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

      <TipsBanner />
      <AppHeader activeNav={activeNav} setActiveNav={setActiveNav} backlog={backlog} goHome={goHome} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {PAGES[activeNav]}
      </div>
    </div>
  );
}
