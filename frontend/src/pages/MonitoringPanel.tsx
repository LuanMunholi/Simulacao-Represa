import { useOutletContext } from "react-router-dom";

import { AlertHistoryTable } from "../components/AlertHistoryTable";
import { ComportaControlCard } from "../components/ComportaControlCard";
import { SensorCard } from "../components/SensorCard";
import { SeverityBadge } from "../components/SeverityBadge";
import { EnergyChart } from "../components/charts/EnergyChart";
import { RainChart } from "../components/charts/RainChart";
import { RiskCountChart } from "../components/charts/RiskCountChart";
import { VolumeChart } from "../components/charts/VolumeChart";
import { CHUVA_WINDOW_DAYS, SENSOR_CATEGORIES, SEVERITY_BORDER } from "../constants";
import type { LayoutContext, SensorEntry } from "../types";

// O engine expõe sensor_chuva_02 como total de mm acumulado na janela de 30 dias.
// O card deve mostrar a média diária, sem alterar a física do engine. Enquanto a
// janela não enche, divide-se pelos dias já decorridos (o dia em curso conta como 1),
// limitado a 30 — assim que a janela enche, o divisor fixa em 30.
function displayEntry(
  id: string,
  entry: SensorEntry,
  simulatedHours: number,
): SensorEntry {
  if (id === "sensor_chuva_02" && typeof entry.valor === "number") {
    const dias = Math.min(CHUVA_WINDOW_DAYS, Math.floor(simulatedHours / 24) + 1);
    return { valor: entry.valor / dias, unidade: "mm/dia" };
  }
  return entry;
}

export function MonitoringPanel() {
  const { data } = useOutletContext<LayoutContext>();

  return (
    <>
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
        <ComportaControlCard />
      </section>

      <section className="mb-6">
        <h2 className="text-sm text-slate-400 m-0 mb-2">Sensores em tempo real</h2>
        <div className="flex flex-col gap-4">
          {SENSOR_CATEGORIES.map((cat) => (
            <div key={cat.title}>
              <h3 className="text-xs uppercase tracking-wide text-slate-500 m-0 mb-1.5">
                {cat.title}
              </h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
                {cat.sensors.map((id) => {
                  const entry = data?.sensors?.[id];
                  if (!entry) return null;
                  return (
                    <SensorCard
                      key={id}
                      id={id}
                      entry={displayEntry(id, entry, data?.simulated_hours ?? 0)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
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
