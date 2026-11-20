/* Pont JS → CSS variables. Les composants existants consomment `T` ;
   les valeurs vivent dans tokens.css (source de vérité). */
export const T = {
  bg: "var(--c-bg)", sidebar: "var(--c-sidebar)", card: "var(--c-card)",
  border: "var(--c-border)", borderSubtle: "var(--c-border-subtle)",
  primary: "var(--c-primary)", primaryHover: "var(--c-primary-hover)",
  primaryLight: "var(--c-primary-light)", primaryMid: "var(--c-primary-mid)",
  text: "var(--c-text)", textMuted: "var(--c-text-muted)", textSubtle: "var(--c-text-subtle)",
  success: "var(--c-success)", successLight: "var(--c-success-light)", successBorder: "var(--c-success-border)",
  warning: "var(--c-warning)", warningLight: "var(--c-warning-light)", warningBorder: "var(--c-warning-border)",
  danger: "var(--c-danger)", dangerLight: "var(--c-danger-light)", dangerBorder: "var(--c-danger-border)",
  orange: "var(--c-orange)", orangeLight: "var(--c-orange-light)", orangeBorder: "var(--c-orange-border)",
  radius: "var(--radius-md)", radiusSm: "var(--radius-sm)", radiusLg: "var(--radius-lg)",
  shadow: "var(--elev-1)", shadowMd: "var(--elev-2)", shadowLg: "var(--elev-3)",
  shadowPrimary: "var(--elev-glow)",
  transition: "var(--transition)",
  gradient: "var(--c-gradient)", gradientHero: "var(--c-gradient-hero)",
};

/* Remplace l'ancien `T.x + "55"` (hex + alpha), incompatible avec var(). */
export const alpha = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

/* Échelle typographique nommée (cf. Atrium) */
export const TYPE_SCALE = [
  { name: "Display",        size: 40, weight: 500, track: "-0.03em", lh: 1.1,  use: "Titres marketing",   sample: "Feedback → Backlog" },
  { name: "Title/Page",     size: 28, weight: 500, track: "-0.025em", lh: 1.15, use: "Titre de page",      sample: "Bonjour, Ernestine" },
  { name: "Title/Hero",     size: 30, weight: 500, track: "-0.025em", lh: 1.2,  use: "Phrase-clé du hero", sample: "3 thèmes à valider avant le sprint" },
  { name: "Number/Large",   size: 44, weight: 500, track: "-0.03em", lh: 1,    use: "Centre d'anneau",    sample: "71%" },
  { name: "Number/KPI",     size: 28, weight: 500, track: "-0.025em", lh: 1,   use: "Métrique de carte",  sample: "128" },
  { name: "Heading/Section",size: 16, weight: 600, track: "-0.01em", lh: 1.3,  use: "Titre de carte",     sample: "À valider" },
  { name: "Body/Default",   size: 14, weight: 400, track: "0",       lh: 1.5,  use: "Paragraphes",        sample: "Colle un feedback brut, il rejoint sa thématique." },
  { name: "Body/Strong",    size: 14, weight: 600, track: "0",       lh: 1.4,  use: "Emphase",            sample: "Export des données" },
  { name: "Caption",        size: 12, weight: 400, track: "0",       lh: 1.4,  use: "Méta, aides",        sample: "Trié par urgence. Rien n'est poussé sans ton accord." },
  { name: "Eyebrow",        size: 11, weight: 500, track: "0.08em",  lh: 1,    use: "Sur-titres",         sample: "CRITÈRES D'ACCEPTATION", upper: true },
];

/* Contraste WCAG 2.2 */
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
