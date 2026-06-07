import { SENSOR_LABELS } from "../constants";
import type { SensorEntry } from "../types";

export type SensorTone = "ok" | "good" | "warn" | "danger";

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

export function SensorCard({
  id,
  entry,
  accentBar,
  tone = "ok",
}: {
  id: string;
  entry: SensorEntry;
  /** Classe de borda-esquerda (acento da categoria). */
  accentBar?: string;
  /** Cor do valor conforme a saúde da leitura. */
  tone?: SensorTone;
}) {
  return (
    <div
      className={`bg-slate-800/70 border border-slate-700/80 border-l-[3px] ${
        accentBar ?? "border-l-slate-600/70"
      } rounded-lg px-3.5 py-3`}
    >
      <div className="text-[11px] text-slate-400 mb-1.5">
        {SENSOR_LABELS[id] ?? id}
      </div>
      <div className={`text-[22px] font-semibold font-mono leading-none ${TONE_TEXT[tone]}`}>
        {formatValue(entry.valor)}
        {entry.unidade && (
          <span className="text-xs text-slate-500 ml-1.5 font-sans">{entry.unidade}</span>
        )}
      </div>
    </div>
  );
}
