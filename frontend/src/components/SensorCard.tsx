import { ACCENT, SENSOR_LABELS } from "../constants";
import type { SensorEntry } from "../types";
import { SensorIcon } from "./SensorIcon";
import { Sparkline } from "./Sparkline";

export type SensorTone = "ok" | "good" | "warn" | "danger";
type AccentKey = keyof typeof ACCENT;

const TONE_TEXT: Record<SensorTone, string> = {
  ok: "text-slate-100",
  good: "text-emerald-300",
  warn: "text-amber-300",
  danger: "text-red-300",
};

function formatValue(valor: number | string): string {
  if (typeof valor === "string") return valor;
  return valor.toFixed(2);
}

function Trend({ trail }: { trail: number[] }) {
  if (trail.length < 2) return null;
  const d = trail[trail.length - 1] - trail[trail.length - 2];
  const glyph = Math.abs(d) < 0.01 ? "—" : d > 0 ? "▲" : "▼";
  return <span className="text-[11px] text-slate-500 font-mono leading-none">{glyph}</span>;
}

export function SensorCard({
  id,
  entry,
  accent,
  tone = "ok",
  trail,
}: {
  id: string;
  entry: SensorEntry;
  /** Categoria — define a barra de acento, o ícone e a cor da sparkline. */
  accent?: AccentKey;
  /** Cor do valor conforme a saúde da leitura. */
  tone?: SensorTone;
  /** Rastro recente de valores (para a sparkline e a tendência). */
  trail?: number[];
}) {
  const bar = accent ? ACCENT[accent].bar : "border-l-slate-600/70";
  const accentText = accent ? ACCENT[accent].text : "text-slate-400";
  const isNumeric = typeof entry.valor === "number";

  return (
    <div
      className={`bg-slate-800/70 border border-slate-700/80 border-l-[3px] ${bar} rounded-lg px-3.5 py-3`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] text-slate-400">{SENSOR_LABELS[id] ?? id}</span>
        {accent && (
          <span className={`${accentText} opacity-80 shrink-0`}>
            <SensorIcon accent={accent} />
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2 mt-1.5">
        <span className={`text-[22px] font-semibold font-mono leading-none ${TONE_TEXT[tone]}`}>
          {formatValue(entry.valor)}
          {entry.unidade && (
            <span className="text-xs text-slate-500 ml-1.5 font-sans">{entry.unidade}</span>
          )}
        </span>
        {isNumeric && trail && <Trend trail={trail} />}
      </div>

      {isNumeric && trail && trail.length >= 2 && (
        <div className={`mt-2 ${accentText}`}>
          <Sparkline values={trail} />
        </div>
      )}
    </div>
  );
}
