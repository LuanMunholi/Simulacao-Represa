import { useState } from "react";
import { useOutletContext } from "react-router-dom";

import { AlertHistoryTable } from "../components/AlertHistoryTable";
import { SensorCard } from "../components/SensorCard";
import { SeverityBadge } from "../components/SeverityBadge";
import { EnergyChart } from "../components/charts/EnergyChart";
import { RainChart } from "../components/charts/RainChart";
import { RiskCountChart } from "../components/charts/RiskCountChart";
import { VolumeChart } from "../components/charts/VolumeChart";
import { BTN, BTN_URGENT, SENSOR_ORDER, SEVERITY_BORDER } from "../constants";
import type { LayoutContext } from "../types";

export function MonitoringPanel() {
  const { data } = useOutletContext<LayoutContext>();
  const [adjustFeedback, setAdjustFeedback] = useState<string>("");

  const hasAlerts = data
    ? data.active_risks.length > 0 ||
      data.active_predictions.length > 0 ||
      data.status === "PAUSADO"
    : false;
  const isCriticPause =
    data?.status === "PAUSADO" && data?.paused_reason === "previsao_critica";

  async function handleAdjust() {
    setAdjustFeedback("Ajustando comportas…");
    try {
      const res = await fetch("/api/simulation/adjust", { method: "POST" });
      if (res.ok) setAdjustFeedback("Ajuste aplicado");
      else setAdjustFeedback(`Falhou: HTTP ${res.status}`);
    } catch (e) {
      setAdjustFeedback(`Erro: ${e}`);
    }
    setTimeout(() => setAdjustFeedback(""), 4000);
  }

  return (
    <>
      {hasAlerts && (
        <div className="flex items-center gap-3 mb-4">
          <button
            className={isCriticPause ? BTN_URGENT : BTN}
            onClick={handleAdjust}
          >
            {isCriticPause ? "Ajustar Comportas (CRÍTICO)" : "Ajustar Comportas"}
          </button>
          {adjustFeedback && (
            <span className="text-xs text-slate-400 font-mono">{adjustFeedback}</span>
          )}
        </div>
      )}

      {data && data.active_risks.length > 0 && (
        <section className="mb-4">
          <h2 className="text-sm text-slate-400 m-0 mb-2">
            Riscos ativos ({data.active_risks.length})
          </h2>
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
            {data.active_risks.map((r) => (
              <li
                key={r.codigo}
                className={`bg-slate-800 border border-slate-700 border-l-4 rounded px-3 py-2 text-sm ${
                  SEVERITY_BORDER[r.severidade] ?? "border-l-slate-500"
                }`}
              >
                <SeverityBadge severidade={r.severidade} />
                <strong>{r.codigo}</strong>: {r.mensagem}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && data.active_predictions.length > 0 && (
        <section className="mb-4">
          <h2 className="text-sm text-slate-400 m-0 mb-2">
            Previsões ativas ({data.active_predictions.length})
          </h2>
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
            {data.active_predictions.map((p, i) => (
              <li
                key={i}
                className={`bg-slate-800 border border-slate-700 border-l-4 rounded px-3 py-2 text-sm ${
                  SEVERITY_BORDER[p.severidade] ?? "border-l-slate-500"
                }`}
              >
                <SeverityBadge severidade={p.severidade} />
                {p.mensagem}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-sm text-slate-400 m-0 mb-2">Sensores em tempo real</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
          {SENSOR_ORDER.map((id) => {
            const entry = data?.sensors?.[id];
            if (!entry) return null;
            return <SensorCard key={id} id={id} entry={entry} />;
          })}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-sm text-slate-400 m-0 mb-2">
          Gráficos — últimas 720 horas simuladas
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] gap-3">
          <VolumeChart />
          <RainChart />
          <EnergyChart />
          <RiskCountChart />
        </div>
      </section>

      <section>
        <h2 className="text-sm text-slate-400 m-0 mb-2">
          Histórico de alertas (últimos 20)
        </h2>
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <AlertHistoryTable />
        </div>
      </section>
    </>
  );
}
