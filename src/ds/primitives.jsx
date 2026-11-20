import { useEffect, useId, useState } from "react";

export const Eyebrow = ({ children, style }) => <div className="ds-eyebrow" style={style}>{children}</div>;
export const Card = ({ children, style, ...p }) => <div className="ds-card" style={style} {...p}>{children}</div>;
export const Pill = ({ tone, dot, children }) => (
  <span className="ds-pill" data-tone={tone}>{dot && <span className="ds-pill__dot" />}{children}</span>
);
export const Button = ({ variant = "primary", size, className = "", children, ...p }) => (
  <button className={`ds-btn ds-btn--${variant} ${size === "lg" ? "ds-btn--lg" : ""} ${className}`} {...p}>{children}</button>
);
export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="ds-seg" role="group" aria-label={label}>
      {options.map(o => <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)}>{o}</button>)}
    </div>
  );
}

/* Anneau de progression — dégradé lavande, remplissage animé (--dur-data) */
export function Ring({ value = 0, size = 168, stroke = 16, caption }) {
  const gid = "ring" + useId().replace(/:/g, "");
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const [p, setP] = useState(0);
  useEffect(() => { const t = requestAnimationFrame(() => setP(value)); return () => cancelAnimationFrame(t); }, [value]);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} role="img" aria-label={`${value}% ${caption || ""}`} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B7A4F7" /><stop offset="100%" stopColor="#5B3FC9" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEEAFB" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} style={{ transition: "stroke-dashoffset var(--dur-data) var(--ease-out)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.27, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1, color: "var(--ds-text)" }}>{value}%</span>
        {caption && <span style={{ fontSize: 12.5, color: "var(--ds-text-secondary)", marginTop: 6, textAlign: "center", maxWidth: size - 56 }}>{caption}</span>}
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, sub, right, mobile }) {
  return (
    <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 28 }}>
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 style={{ fontSize: mobile ? 30 : 40, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--ds-text)", margin: "6px 0 8px" }}>{title}</h1>
        {sub && <p style={{ fontSize: 15.5, color: "var(--ds-text-secondary)", maxWidth: 520, lineHeight: 1.5 }}>{sub}</p>}
      </div>
      {right}
    </header>
  );
}

export function Toggle({ value, onChange, label }) {
  return <button type="button" role="switch" aria-checked={value} aria-label={label} className="ds-toggle" onClick={() => onChange(!value)} />;
}
