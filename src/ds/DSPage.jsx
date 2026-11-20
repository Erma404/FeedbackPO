import { useState } from "react";
import { TYPE_SCALE, contrast } from "./tokens.js";
import { Button, Card, Pill, Ring, Segmented, Toggle } from "./primitives.jsx";

const BRAND = [
  ["Primary", "#7C5CE0", "Actions, focus"], ["Primary strong", "#5B3FC9", "Liens, état actif"],
  ["Primary soft", "#F1EDFF", "Sélection, pills"], ["Nav deep", "#2A1B6B", "Sidebar"],
  ["Hero base", "#3B2594", "Bandeau hero"], ["Hero end", "#1A1040", "Fin de dégradé"],
  ["Lavender", "#9B82F2", "Dégradés, séries"], ["Pink", "#F0A0EA", "Dégradés uniquement"],
  ["Butter", "#FBE9A0", "Dégradés uniquement"],
];
const NEUTRALS = [
  ["Canvas", "#F4F2FB", "Fond d'app"], ["Surface", "#FFFFFF", "Cartes"], ["Surface muted", "#F1EFF8", "Pistes, champs"],
  ["Border", "#E6E2F2", "Filets"], ["Text", "#1B1535", "Titres, valeurs"],
  ["Secondary", "#54507A", "Corps de texte"], ["Muted", "#7E7A9C", "Labels uniquement"],
];
const STATUS = [
  ["Success", "#1F9D4B", "#E3F8E9", "#167A3B"], ["Warning", "#F0A30A", "#FEF3CC", "#8F5206"], ["Danger", "#D93636", "#FDE6E6", "#A82424"],
];
const GRADS = [
  ["Brand", "linear-gradient(135deg,#7C5CE0 0%,#F0A0EA 60%,#FBE9A0 100%)"],
  ["Hero", "linear-gradient(120deg,#3B2594 0%,#5B3FC9 55%,#1A1040 100%)"],
  ["Stage", "linear-gradient(160deg,#8F73F0 0%,#E7A1EE 55%,#FBE9A0 100%)"],
  ["Ring", "linear-gradient(180deg,#9B82F2 0%,#5B3FC9 100%)"],
];
const CONTRASTS = [
  ["Texte sur Surface", "#1B1535", "#FFFFFF", "Titres, valeurs", 4.5],
  ["Secondary sur Surface", "#54507A", "#FFFFFF", "Corps de texte", 4.5],
  ["Muted sur Surface", "#7E7A9C", "#FFFFFF", "Labels (grand texte / UI)", 3],
  ["Blanc sur Primary", "#FFFFFF", "#7C5CE0", "Libellé de bouton", 3],
  ["Blanc sur Primary strong", "#FFFFFF", "#5B3FC9", "Bouton, état actif", 4.5],
  ["Primary strong sur Soft", "#5B3FC9", "#F1EDFF", "Pill active", 4.5],
  ["Success text sur bg", "#167A3B", "#E3F8E9", "Pill statut", 4.5],
  ["Warning text sur bg", "#8F5206", "#FEF3CC", "Pill statut", 4.5],
  ["Danger text sur bg", "#A82424", "#FDE6E6", "Pill statut", 4.5],
];
const SPACE = [4, 8, 12, 16, 20, 24, 32, 36];
const RADII = [["xs", 6], ["sm", 8], ["md", 12], ["lg", 16], ["xl", 22], ["card", 28], ["full", 999]];
const ELEV = [["1 · Card", "var(--elev-1)"], ["2 · Raised", "var(--elev-2)"], ["3 · Tooltip", "var(--elev-3)"], ["4 · Overlay", "var(--elev-4)"]];
const MOTION = [["Fast", "150 ms", "Hover, press, changement de couleur"], ["Base", "200 ms", "Toggles, onglets, indicateurs"], ["Slow", "280 ms", "Panneaux, drawers"], ["Data", "600 ms", "Remplissage d'anneaux et de barres"]];

const ink = "var(--ds-text)", sec = "var(--ds-text-secondary)", mut = "var(--ds-text-muted)";
const card = { background: "var(--ds-surface)", borderRadius: "var(--radius-card)", padding: 28, boxShadow: "var(--elev-1)", border: "1px solid var(--ds-border)" };
const eyebrow = { fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: mut };

function Section({ n, title, intro, children }) {
  return (
    <section style={{ marginTop: 56 }}>
      <div style={eyebrow}>{n} · {title}</div>
      <h2 style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.025em", color: ink, margin: "6px 0 8px" }}>{title}</h2>
      {intro && <p style={{ fontSize: 14, color: sec, maxWidth: 640, lineHeight: 1.5, marginBottom: 20 }}>{intro}</p>}
      {children}
    </section>
  );
}
function Swatch({ name, hex, use }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ height: 72, borderRadius: 14, background: hex, border: "1px solid var(--ds-border)" }} />
      <div style={{ fontSize: 13, fontWeight: 600, color: ink, marginTop: 8 }}>{name}</div>
      <div style={{ fontSize: 11.5, color: mut, fontFamily: "var(--font-mono)" }}>{hex}</div>
      <div style={{ fontSize: 12, color: sec }}>{use}</div>
    </div>
  );
}
const grid = (min) => ({ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, gap: 16 });

export default function DSPage() {
  const [seg, setSeg] = useState("Cartes");
  const [tog, setTog] = useState(true);
  return (
    <div style={{ minHeight: "100vh", background: "var(--ds-canvas)", fontFamily: "var(--font-sans)", color: ink, paddingBottom: 96 }}>
      <header style={{ background: "var(--ds-grad-hero)", color: "#fff", padding: "56px 0 64px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ ...eyebrow, color: "rgba(255,255,255,.65)" }}>Design system · v0.2 · {new Date().getFullYear()}</div>
          <h1 style={{ fontSize: "clamp(34px, 6vw, 56px)", fontWeight: 500, letterSpacing: "-0.03em", margin: "10px 0 14px" }}>FeedbackPO · Amethyst</h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,.78)", maxWidth: 620, lineHeight: 1.5 }}>
            Des surfaces calmes, un seul accent améthyste, et une couleur qui n'apparaît que lorsqu'elle signifie quelque chose.
            Une police, une échelle, des tokens nommés.
          </p>
          <a href="#/" style={{ display: "inline-block", marginTop: 20, color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 4 }}>← Retour à l'app</a>
        </div>
      </header>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>
        <Section n="01" title="Couleur" intro="Les teintes de marque servent aux actions et aux dégradés. Les statuts ont chacun un fond et un texte dédiés, pour garder le contraste.">
          <div style={card}>
            <div style={{ ...eyebrow, marginBottom: 12 }}>Marque</div>
            <div style={grid(120)}>{BRAND.map(b => <Swatch key={b[0]} name={b[0]} hex={b[1]} use={b[2]} />)}</div>
            <div style={{ ...eyebrow, margin: "28px 0 12px" }}>Neutres et texte</div>
            <div style={grid(120)}>{NEUTRALS.map(b => <Swatch key={b[0]} name={b[0]} hex={b[1]} use={b[2]} />)}</div>
            <div style={{ ...eyebrow, margin: "28px 0 12px" }}>Statuts</div>
            <div style={grid(220)}>
              {STATUS.map(([n, c, bg, tx]) => (
                <div key={n} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: c, flexShrink: 0 }} />
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, border: "1px solid var(--ds-border)", flexShrink: 0 }} />
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: bg, color: tx, fontSize: 12, fontWeight: 600 }}>{n}</span>
                </div>
              ))}
            </div>
            <div style={{ ...eyebrow, margin: "28px 0 12px" }}>Dégradés</div>
            <div style={grid(180)}>
              {GRADS.map(([n, g]) => (
                <div key={n}><div style={{ height: 72, borderRadius: 14, background: g }} /><div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>{n}</div></div>
              ))}
            </div>
          </div>
          <div style={{ ...card, marginTop: 16 }}>
            <div style={{ ...eyebrow, marginBottom: 12 }}>Contrastes · WCAG 2.2 (calculés)</div>
            {CONTRASTS.map(([label, fg, bg, use, min]) => {
              const r = contrast(fg, bg); const ok = r >= min;
              return (
                <div key={label} style={{ display: "grid", gridTemplateColumns: "minmax(140px,1.3fr) 110px 1fr 96px", gap: 12, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--ds-border)" }}>
                  <span style={{ fontSize: 13, color: sec }}>{label}</span>
                  <span style={{ background: bg, color: fg, borderRadius: 10, padding: "6px 10px", fontSize: 13, fontWeight: 600, textAlign: "center", border: "1px solid var(--ds-border)" }}>Aa Valider</span>
                  <span style={{ fontSize: 12, color: mut }}>{use}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, textAlign: "right", color: ok ? "var(--ds-success-text)" : "var(--ds-danger-text)", fontFamily: "var(--font-mono)" }}>{r.toFixed(1)}:1 {ok ? "OK" : "KO"}</span>
                </div>
              );
            })}
          </div>
        </Section>

        <Section n="02" title="Typographie" intro="Geist partout, en Medium, avec un tracking serré sur les grands chiffres pour qu'ils se lisent d'un bloc.">
          <div style={card}>
            {TYPE_SCALE.map(t => (
              <div key={t.name} style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16, alignItems: "baseline", padding: "14px 0", borderTop: "1px solid var(--ds-border)" }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: mut, fontFamily: "var(--font-mono)" }}>{t.size}/{t.weight} · {t.track}</div>
                  <div style={{ fontSize: 11.5, color: sec }}>{t.use}</div>
                </div>
                <div style={{ fontSize: t.size, fontWeight: t.weight, letterSpacing: t.track, lineHeight: t.lh, textTransform: t.upper ? "uppercase" : "none", color: t.name === "Eyebrow" ? mut : ink, overflowWrap: "anywhere" }}>{t.sample}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section n="03" title="Espacement, rayons, élévation" intro="Cartes à 28 px de rayon, éléments interactifs entre 8 et 16. L'ombre croît avec l'altitude, jamais avec la décoration.">
          <div style={card}>
            <div style={{ ...eyebrow, marginBottom: 12 }}>Espacement</div>
            {SPACE.map(s => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                <span style={{ width: 70, fontSize: 12, color: mut, fontFamily: "var(--font-mono)" }}>space/{s}</span>
                <span style={{ height: 10, width: s * 6, background: "var(--ds-grad-ring)", borderRadius: 999 }} />
                <span style={{ fontSize: 12, color: sec }}>{s}px</span>
              </div>
            ))}
            <div style={{ ...eyebrow, margin: "28px 0 12px" }}>Rayons</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {RADII.map(([n, r]) => (
                <div key={n} style={{ textAlign: "center" }}>
                  <div style={{ width: 72, height: 56, background: "var(--ds-primary-soft)", border: "1.5px solid var(--ds-primary)", borderRadius: r }} />
                  <div style={{ fontSize: 12, marginTop: 6, color: sec }}>{n}</div>
                </div>
              ))}
            </div>
            <div style={{ ...eyebrow, margin: "28px 0 12px" }}>Élévation</div>
            <div style={{ ...grid(180), padding: 20, background: "var(--ds-canvas)", borderRadius: 20 }}>
              {ELEV.map(([n, sh]) => (
                <div key={n} style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: sh, fontSize: 13, fontWeight: 600 }}>{n}</div>
              ))}
            </div>
          </div>
        </Section>

        <Section n="04" title="Mouvement" intro="Le mouvement confirme une action ou révèle une donnée. Tout est coupé quand l'utilisateur demande de réduire les animations.">
          <div style={{ ...card, display: "grid", gap: 14 }}>
            {MOTION.map(([n, d, use]) => (
              <div key={n} style={{ display: "grid", gridTemplateColumns: "90px 70px 1fr", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{n}</span>
                <span style={{ fontSize: 12, color: mut, fontFamily: "var(--font-mono)" }}>{d}</span>
                <span style={{ fontSize: 13, color: sec }}>{use}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section n="05" title="Composants" intro="Les briques utilisées par tous les écrans. Leurs états (hover, focus, désactivé) sont définis dans components.css, pas en inline.">
          <div style={{ ...card, display: "grid", gap: 28 }}>
            <div>
              <div style={{ ...eyebrow, marginBottom: 12 }}>Boutons</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <Button>Primaire</Button><Button variant="secondary">Secondaire</Button><Button variant="ghost">Discret</Button><Button disabled>Désactivé</Button><Button size="lg">Grand</Button>
              </div>
            </div>
            <div>
              <div style={{ ...eyebrow, marginBottom: 12 }}>Pills · statut et priorité</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Pill>Neutre</Pill><Pill tone="primary" dot>Validé</Pill><Pill tone="success" dot>Dans la politique</Pill><Pill tone="warning" dot>Non estimé</Pill><Pill tone="danger" dot>Must Have</Pill>
              </div>
            </div>
            <div>
              <div style={{ ...eyebrow, marginBottom: 12 }}>Segmenté et interrupteur</div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
                <Segmented label="Vue" options={["Cartes", "Kanban"]} value={seg} onChange={setSeg} />
                <Toggle value={tog} onChange={setTog} label="Exemple" />
              </div>
            </div>
            <div>
              <div style={{ ...eyebrow, marginBottom: 12 }}>Anneau et progression</div>
              <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "center" }}>
                <Ring value={71} size={150} stroke={15} caption="couvert" />
                <div style={{ flex: 1, minWidth: 220, display: "grid", gap: 14 }}>
                  <div className="ds-progress"><span style={{ width: "42%" }} /></div>
                  <div className="ds-progress" data-tone="warning"><span style={{ width: "88%" }} /></div>
                  <div className="ds-progress" data-tone="danger"><span style={{ width: "100%" }} /></div>
                </div>
              </div>
            </div>
            <div>
              <div style={{ ...eyebrow, marginBottom: 12 }}>Carte</div>
              <Card style={{ maxWidth: 420 }}><div className="ds-card__title">Titre de carte</div><div className="ds-card__sub">Rayon 28 px, filet fin, ombre légère teintée de violet.</div></Card>
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}
