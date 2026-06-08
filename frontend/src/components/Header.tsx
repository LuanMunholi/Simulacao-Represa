import { ALERT_HEALTH, STATUS_LABELS } from "../constants";
import type { Tick } from "../types";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5 text-xs px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/60">
      <span className="text-slate-500 uppercase tracking-wide text-[10px]">{label}</span>
      <span className="font-mono font-semibold text-slate-200">{value}</span>
    </span>
  );
}

export function Header({ data, connected }: { data: Tick | null; connected: boolean }) {
  const health = data ? ALERT_HEALTH[data.alert_level] : undefined;
  const isPaused = data?.status === "PAUSADO";
  const dia = data ? Math.floor(data.simulated_hours / 24) : null;

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-800">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-500/30 grid place-items-center text-sky-300">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2.7s6 6.6 6 11a6 6 0 1 1-12 0c0-4.4 6-11 6-11Z" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-semibold m-0 leading-tight">Simulação Represa</h1>
          <div className="text-xs text-slate-400 font-mono">
            {data ? data.simulated_time : "Aguardando dados…"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Stat label="Dia" value={dia != null ? String(dia) : "—"} />
        <Stat
          label="Veloc."
          value={data ? `${data.fator_aceleracao.toFixed(1)}x` : "—"}
        />

        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <span
            className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-500"}`}
          />
          {connected ? "Conectado" : "Desconectado"}
        </span>

        <span
          className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
            isPaused
              ? "bg-red-500/15 text-red-300 border-red-500/30"
              : "bg-slate-700/50 text-slate-300 border-slate-600/50"
          }`}
        >
          {data ? STATUS_LABELS[data.status] ?? data.status : "—"}
          {isPaused && data?.paused_reason ? ` · ${data.paused_reason}` : ""}
        </span>

        <span
          className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-md font-semibold bg-slate-800/80 border border-slate-700 ring-1 ${
            health?.ring ?? "ring-slate-600/40"
          } ${health?.text ?? "text-slate-300"}`}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${health?.dot ?? "bg-slate-500"}`} />
          {health?.label ?? "—"}
        </span>
      </div>
    </header>
  );
}
