import { SENSOR_LABELS } from "../constants";
import type { SensorEntry } from "../types";

function formatValue(valor: number | string): string {
  if (typeof valor === "string") return valor;
  return valor.toFixed(2);
}

export function SensorCard({ id, entry }: { id: string; entry: SensorEntry }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3.5">
      <div className="text-[11px] text-slate-400 mb-1.5">
        {SENSOR_LABELS[id] ?? id}
      </div>
      <div className="text-[22px] font-semibold font-mono">
        {formatValue(entry.valor)}
        {entry.unidade && (
          <span className="text-xs text-slate-400 ml-1.5">{entry.unidade}</span>
        )}
      </div>
    </div>
  );
}
