import { ALERT_BG, STATUS_LABELS } from "../constants";
import type { Tick } from "../types";

export function Header({ data, connected }: { data: Tick | null; connected: boolean }) {
  const alertBg = data ? ALERT_BG[data.alert_level] ?? "bg-slate-500" : "bg-slate-500";
  const isPaused = data?.status === "PAUSADO";

  return (
    <header className="flex flex-wrap justify-between items-center gap-3 mb-4">
      <div>
        <h1 className="text-lg m-0">Simulação Represa</h1>
        <div className="text-sm text-slate-400 mt-1 font-mono">
          {data ? data.simulated_time : "Aguardando dados…"}
        </div>
      </div>
      <div className="flex gap-3 items-center">
        <span className="text-sm">{connected ? "Conectado" : "Desconectado"}</span>
        <span
          className={`text-xs px-2.5 py-1 rounded text-white font-semibold ${alertBg}`}
        >
          {data?.alert_level ?? "—"}
        </span>
        <span
          className={`text-xs px-2.5 py-1 rounded ${
            isPaused ? "bg-red-600 text-white" : "bg-slate-700 text-slate-300"
          }`}
        >
          {data ? STATUS_LABELS[data.status] ?? data.status : "—"}
          {isPaused && data?.paused_reason ? ` (${data.paused_reason})` : ""}
        </span>
      </div>
    </header>
  );
}
