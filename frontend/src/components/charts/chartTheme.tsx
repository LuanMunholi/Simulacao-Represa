import type { CSSProperties } from "react";

// Paleta dos gráficos — alinhada aos tokens semânticos da UI.
export const CHART = {
  grid: "#1e293b", // slate-800 (grade discreta)
  axis: "#64748b", // slate-500
  water: "#38bdf8", // tanque superior / água
  waterAlt: "#818cf8", // tanque inferior (indigo, mantém distinção)
  rain: "#22d3ee", // chuva atual
  rainAccum: "#64748b", // chuva acumulada
  energy: "#22c55e", // energia (verde, igual ao acento dos cards)
  danger: "#ef4444",
  warn: "#f59e0b",
  ok: "#10b981",
} as const;

export const tooltipStyle: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: 12,
};

export const axisProps = {
  stroke: CHART.axis,
  tick: { fontSize: 11, fill: CHART.axis },
} as const;

export const gridProps = {
  strokeDasharray: "3 3",
  stroke: CHART.grid,
} as const;

/** Placeholder exibido enquanto a série ainda não tem pontos. */
export function ChartEmpty({ height = 220 }: { height?: number }) {
  return (
    <div
      style={{ height }}
      className="grid place-items-center text-xs text-slate-500"
    >
      Sem dados ainda…
    </div>
  );
}
