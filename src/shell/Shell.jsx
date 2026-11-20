import { useState } from "react";
import { Lightbulb, X } from "lucide-react";
import logoSrc from "../assets/logo.svg";
import { useIsMobile } from "../ds/useIsMobile.js";

/* Scène en dégradé → cadre arrondi → sidebar sombre + zone principale.
   Sous 900 px : la sidebar devient une barre d'onglets en bas. */
export default function Shell({ items, active, onNavigate, counts = {}, tip, savedCount, children }) {
  const compact = useIsMobile(900);
  const [tipOpen, setTipOpen] = useState(true);
  const main = items.filter(i => !i.config);
  const config = items.filter(i => i.config);

  const NavButton = ({ id, label, Icon }) => (
    <button className="ds-nav" aria-current={active === id ? "page" : undefined} onClick={() => onNavigate(id)}>
      <Icon size={19} strokeWidth={1.8} />
      <span className="ds-nav__label">{label}</span>
      {counts[id] > 0 && <span className="ds-count">{counts[id]}</span>}
    </button>
  );

  return (
    <div className="ds-stage">
      <div className="ds-frame">
        {!compact && (
          <aside className="ds-sidebar" aria-label="Navigation principale">
            <button className="ds-ws" onClick={() => onNavigate("analyser")} title="Retour à Analyser">
              <img src={logoSrc} alt="" width={40} height={40} style={{ flexShrink: 0 }} />
              <span style={{ display: "flex", flexDirection: "column" }}>
                <span className="ds-ws__name">FeedbackPO</span>
                <span className="ds-ws__sub">Espace Product Owner</span>
              </span>
            </button>

            <div className="ds-eyebrow">Espace de travail</div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>{main.map(i => <NavButton key={i.id} {...i} />)}</nav>

            {config.length > 0 && <>
              <div className="ds-eyebrow">Configuration</div>
              <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>{config.map(i => <NavButton key={i.id} {...i} />)}</nav>
            </>}

            <div style={{ flex: 1, minHeight: 16 }} />

            {tip && tipOpen && (
              <div className="ds-sidebar__card" style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ds-accent-butter)", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                  <Lightbulb size={15} /> Tip du jour
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,.78)", paddingRight: 14 }}>{tip}</p>
                <button onClick={() => setTipOpen(false)} aria-label="Masquer le tip"
                  style={{ position: "absolute", top: 10, right: 10, background: "none", border: 0, color: "rgba(255,255,255,.55)", cursor: "pointer", display: "flex" }}>
                  <X size={15} />
                </button>
              </div>
            )}

            <div className="ds-sidebar__card" style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <div aria-hidden style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--ds-grad-brand)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 15, color: "var(--ds-nav-deep)" }}>E</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Ernestine</div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.6)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ADE80" }} />
                  Enregistré sur cet appareil{savedCount != null ? ` · ${savedCount}` : ""}
                </div>
              </div>
            </div>
          </aside>
        )}

        <main className="ds-main">{children}</main>

        {compact && (
          <nav className="ds-tabbar" aria-label="Navigation principale">
            {items.map(({ id, label, Icon }) => (
              <button key={id} aria-current={active === id ? "page" : undefined} onClick={() => onNavigate(id)}>
                <Icon size={22} strokeWidth={1.8} />{label}
                {counts[id] > 0 && <span className="ds-count">{counts[id]}</span>}
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
