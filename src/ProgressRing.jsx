import { useEffect, useRef } from "react";

/**
 * ProgressRing — animated SVG ring replacing the flat MomentumBar.
 * Props:
 *   pct      {number}  0-100
 *   size     {number}  diameter in px (default 120)
 *   stroke   {number}  ring thickness (default 10)
 *   label    {string}  centre label (default "Momentum")
 */
export default function ProgressRing({ pct = 0, size = 120, stroke = 10, label = "Momentum" }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const color =
    pct >= 70 ? "#10B981" :
    pct >= 40 ? "#F59E0B" : "#EF4444";

  const grad =
    pct >= 70 ? ["#10B981", "#34D399"] :
    pct >= 40 ? ["#F59E0B", "#FCD34D"] : ["#EF4444", "#F87171"];

  const gradId = `ring-grad-${pct}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={grad[0]} />
            <stop offset="100%" stopColor={grad[1]} />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.34,1.56,0.64,1)" }}
        />
      </svg>
      {/* Centre text — rotated back upright */}
      <div style={{ marginTop: -size / 2 - 8, textAlign: "center", pointerEvents: "none" }}>
        <p style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: "-0.5px", lineHeight: 1 }}>{pct}%</p>
        <p style={{ fontSize: 11, color: "#8B8A9E", marginTop: 2, fontWeight: 500 }}>{label}</p>
      </div>
      <div style={{ height: size / 2 - 8 }} />
    </div>
  );
}
