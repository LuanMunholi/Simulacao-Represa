import { useOutletContext } from "react-router-dom";

import { AlertHistoryTable } from "../components/AlertHistoryTable";
import { Card } from "../components/Card";
import { ComportaControlCard } from "../components/ComportaControlCard";
import { DamSchematic } from "../components/DamSchematic";
import { SensorCard, type SensorTone } from "../components/SensorCard";
import { SeverityBadge } from "../components/SeverityBadge";
import { useSensorTrails } from "../hooks/useSensorTrails";
import { EnergyChart } from "../components/charts/EnergyChart";
import { RainChart } from "../components/charts/RainChart";
import { VolumeChart } from "../components/charts/VolumeChart";
import {
  ACCENT,
  CHUVA_WINDOW_DAYS,
  SECTION_TITLE,
  SENSOR_CATEGORIES,
  SEVERITY_BORDER,
} from "../constants";
import type { LayoutContext, SensorEntry } from "../types";

// O engine expõe sensor_chuva_02 como total de mm acumulado na janela de 30 dias.
// O card mostra a média diária. A janela já parte cheia (semeada com o mês anterior
// no boot/reset), então o divisor é sempre 30 dias.
function displayEntry(id: string, entry: SensorEntry): SensorEntry {
  if (id === "sensor_chuva_02" && typeof entry.valor === "number") {
    return { valor: entry.valor / CHUVA_WINDOW_DAYS, unidade: "mm/dia" };
  }
  return entry;
}

// Severidade crítica (risco "CRITICA" ou previsão "CRITICO") → card pisca em vermelho.
function isCritical(severidade: string): boolean {
  return severidade === "CRITICA" || severidade === "CRITICO";
}

// Cor do valor conforme a saúde da leitura. Os volumes são os indicadores
// críticos (perto de 0% = vazio, perto de 100% = transbordo); a turbina sinaliza
// produção ativa. Os demais sensores ficam neutros.
function toneFor(id: string, valor: number | string): SensorTone {
  if (id === "sensor_volume_01" || id === "sensor_volume_02") {
    if (typeof valor !== "number") return "ok";
    if (valor <= 5 || valor >= 98) return "danger";
    if (valor <= 20 || valor >= 95) return "warn";
    return "ok";
  }
  if (id === "sensor_turbina_01") {
    return valor === "LIGADO" ? "good" : "ok";
  }
  return "ok";
}

export function MonitoringPanel() {
  const { data } = useOutletContext<LayoutContext>();
  const trails = useSensorTrails(data);

  return (
    <>
      {data && data.active_risks.length > 0 && (
        <section className="mb-4">
          <h2 className={`${SECTION_TITLE} mb-2`}>
            Riscos ativos ({data.active_risks.length})
          </h2>
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
            {data.active_risks.map((r) => (
              <li
                key={r.codigo}
                className={`border border-l-4 rounded px-3 py-2 text-sm ${
                  isCritical(r.severidade)
                    ? "alert-blink text-red-50 font-medium"
                    : `bg-slate-800 border-slate-700 ${SEVERITY_BORDER[r.severidade] ?? "border-l-slate-500"}`
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
          <h2 className={`${SECTION_TITLE} mb-2`}>
            Previsões ativas ({data.active_predictions.length})
          </h2>
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
            {data.active_predictions.map((p, i) => (
              <li
                key={i}
                className={`border border-l-4 rounded px-3 py-2 text-sm ${
                  isCritical(p.severidade)
                    ? "alert-blink text-red-50 font-medium"
                    : `bg-slate-800 border-slate-700 ${SEVERITY_BORDER[p.severidade] ?? "border-l-slate-500"}`
                }`}
              >
                <SeverityBadge severidade={p.severidade} />
                {p.mensagem}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-4 mb-6">
        <DamSchematic />
        <ComportaControlCard />
      </div>

      <Card title="Sensores em tempo real" className="mb-6" bodyClassName="p-4 flex flex-col gap-4">
        {SENSOR_CATEGORIES.map((cat) => (
          <div key={cat.title}>
            <h3 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-500 m-0 mb-2">
              <span className={`w-2 h-2 rounded-full ${ACCENT[cat.accent].dot}`} />
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
                    entry={displayEntry(id, entry)}
                    accent={cat.accent}
                    tone={toneFor(id, entry.valor)}
                    trail={trails[id]}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </Card>

      <section className="mb-6">
        <h2 className={`${SECTION_TITLE} mb-2.5`}>
          Gráficos — últimas 720 horas simuladas
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] gap-3">
          <VolumeChart />
          <RainChart />
          <EnergyChart />
        </div>
      </section>

      <Card
        title="Histórico de alertas (últimos 20)"
        bodyClassName="p-0 overflow-hidden rounded-b-xl"
      >
        <AlertHistoryTable />
      </Card>
    </>
  );
}
