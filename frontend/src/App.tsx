import { useEffect, useState } from "react";

import { useWebSocket } from "./hooks/useWebSocket";

interface SensorEntry {
  valor: number | string;
  unidade: string | null;
}

interface RiskEntry {
  codigo: string;
  severidade: string;
  mensagem: string;
  sensores: Record<string, number | string>;
}

interface PredictionEntry {
  tanque: string;
  tipo: string;
  tempo_horas: number;
  severidade: string;
  mensagem: string;
}

interface Tick {
  simulated_hours: number;
  simulated_time: string;
  fator_aceleracao: number;
  status: string;
  paused_reason: string | null;
  scenario_active: string | null;
  sensors: Record<string, SensorEntry>;
  derived: {
    capacidade_atual: number;
    contribuicao_chuva: number;
    taxa_liquida_01: number;
    taxa_liquida_02: number;
  };
  alert_level: string;
  active_risks: RiskEntry[];
  active_predictions: PredictionEntry[];
}

interface AlertHistoryItem {
  id: number;
  simulated_timestamp: number;
  simulated_time: string;
  tipo: string;
  severidade: string;
  mensagem: string;
  leituras: Record<string, number | string>;
}

const SENSOR_LABELS: Record<string, string> = {
  sensor_volume_01: "Volume Tanque Superior",
  sensor_volume_02: "Volume Tanque Inferior",
  sensor_chuva_01: "Chuva atual",
  sensor_chuva_02: "Chuva acumulada (30d)",
  sensor_turbina_01: "Turbina",
  sensor_energia_01: "Energia gerada",
  sensor_comporta_01: "Comporta 01 — Enchimento Sup.",
  sensor_enchimento_01: "Taxa de enchimento",
  sensor_comporta_02: "Comporta 02 — Saída Sup.",
  sensor_fluxo_01: "Fluxo passagem turbina",
  sensor_comporta_03: "Comporta 03 — Entrada Inf.",
  sensor_fluxo_02: "Fluxo saída barragem",
  sensor_comporta_04: "Comporta 04 — Esvaziamento Inf.",
  sensor_esvaziamento_01: "Taxa de esvaziamento",
};

const SENSOR_ORDER: string[] = [
  "sensor_volume_01", "sensor_volume_02",
  "sensor_chuva_01", "sensor_chuva_02",
  "sensor_turbina_01", "sensor_energia_01",
  "sensor_comporta_01", "sensor_enchimento_01",
  "sensor_comporta_02", "sensor_fluxo_01",
  "sensor_comporta_03", "sensor_fluxo_02",
  "sensor_comporta_04", "sensor_esvaziamento_01",
];

const ALERT_COLORS: Record<string, string> = {
  VERDE: "#16a34a",
  AMARELO: "#ca8a04",
  LARANJA: "#ea580c",
  VERMELHO: "#dc2626",
};

const SEVERITY_COLORS: Record<string, string> = {
  BAIXA: "#0891b2",
  MEDIA: "#ca8a04",
  ALTA: "#ea580c",
  CRITICA: "#dc2626",
  ALERTA: "#ca8a04",
  CRITICO: "#dc2626",
};

function formatValue(valor: number | string): string {
  if (typeof valor === "string") return valor;
  return valor.toFixed(2);
}

function SensorCard({ id, entry }: { id: string; entry: SensorEntry }) {
  return (
    <div style={{
      background: "#1e293b",
      border: "1px solid #334155",
      borderRadius: 8,
      padding: 14,
    }}>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>
        {SENSOR_LABELS[id] ?? id}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 600,
        fontFamily: "ui-monospace, monospace",
      }}>
        {formatValue(entry.valor)}
        {entry.unidade && (
          <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 6 }}>
            {entry.unidade}
          </span>
        )}
      </div>
    </div>
  );
}

function SeverityBadge({ severidade }: { severidade: string }) {
  const color = SEVERITY_COLORS[severidade] ?? "#94a3b8";
  return (
    <span style={{
      fontSize: 11, padding: "2px 6px", borderRadius: 4,
      background: color, color: "#fff", fontWeight: 600,
      marginRight: 8,
    }}>
      {severidade}
    </span>
  );
}

function AlertHistoryTable() {
  const [items, setItems] = useState<AlertHistoryItem[]>([]);

  useEffect(() => {
    let stopped = false;
    async function load() {
      try {
        const res = await fetch("/api/history/alerts?per_page=20");
        const data = await res.json();
        if (!stopped) setItems(data.items ?? []);
      } catch (e) {
        console.error("Failed to load alerts:", e);
      }
    }
    load();
    const interval = setInterval(load, 10_000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  if (items.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "#94a3b8", padding: 12 }}>
        Nenhum alerta registrado ainda.
      </div>
    );
  }

  return (
    <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ textAlign: "left", color: "#94a3b8", borderBottom: "1px solid #334155" }}>
          <th style={{ padding: 8 }}>Tempo</th>
          <th style={{ padding: 8 }}>Tipo</th>
          <th style={{ padding: 8 }}>Severidade</th>
          <th style={{ padding: 8 }}>Mensagem</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it) => (
          <tr key={it.id} style={{ borderBottom: "1px solid #1e293b" }}>
            <td style={{ padding: 8, fontFamily: "ui-monospace, monospace", color: "#cbd5e1" }}>
              {it.simulated_time}
            </td>
            <td style={{ padding: 8 }}>{it.tipo}</td>
            <td style={{ padding: 8 }}>
              <SeverityBadge severidade={it.severidade} />
            </td>
            <td style={{ padding: 8 }}>{it.mensagem}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function App() {
  const { data, connected } = useWebSocket<Tick>("/ws");
  const alertColor = data ? ALERT_COLORS[data.alert_level] ?? "#94a3b8" : "#94a3b8";
  const isPaused = data?.status === "PAUSADO";

  return (
    <div style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <header style={{
        marginBottom: 16, display: "flex",
        justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 18, margin: 0 }}>Simulação Represa</h1>
          <div style={{
            fontSize: 13, color: "#94a3b8", marginTop: 4,
            fontFamily: "ui-monospace, monospace",
          }}>
            {data ? data.simulated_time : "Aguardando dados…"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 13 }}>{connected ? "Conectado" : "Desconectado"}</span>
          <span style={{
            fontSize: 12, padding: "4px 10px", borderRadius: 4,
            background: alertColor, color: "#fff", fontWeight: 600,
          }}>
            {data?.alert_level ?? "—"}
          </span>
          <span style={{
            fontSize: 12, padding: "4px 10px", borderRadius: 4,
            background: isPaused ? "#dc2626" : "#334155",
            color: isPaused ? "#fff" : "#cbd5e1",
          }}>
            {data?.status ?? "—"}
            {isPaused && data?.paused_reason ? ` (${data.paused_reason})` : ""}
          </span>
        </div>
      </header>

      {data && data.active_risks.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 8px" }}>
            Riscos ativos ({data.active_risks.length})
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {data.active_risks.map((r) => (
              <li key={r.codigo} style={{
                background: "#1e293b", border: "1px solid #334155",
                borderLeft: `4px solid ${SEVERITY_COLORS[r.severidade] ?? "#94a3b8"}`,
                borderRadius: 4, padding: "8px 12px", fontSize: 13,
              }}>
                <SeverityBadge severidade={r.severidade} />
                <strong>{r.codigo}</strong>: {r.mensagem}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && data.active_predictions.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 8px" }}>
            Previsões ativas ({data.active_predictions.length})
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {data.active_predictions.map((p, i) => (
              <li key={i} style={{
                background: "#1e293b", border: "1px solid #334155",
                borderLeft: `4px solid ${SEVERITY_COLORS[p.severidade] ?? "#94a3b8"}`,
                borderRadius: 4, padding: "8px 12px", fontSize: 13,
              }}>
                <SeverityBadge severidade={p.severidade} />
                {p.mensagem}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 10, marginBottom: 24,
      }}>
        {SENSOR_ORDER.map((id) => {
          const entry = data?.sensors?.[id];
          if (!entry) return null;
          return <SensorCard key={id} id={id} entry={entry} />;
        })}
      </div>

      <section>
        <h2 style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 8px" }}>
          Histórico de alertas (últimos 20)
        </h2>
        <div style={{
          background: "#1e293b", border: "1px solid #334155",
          borderRadius: 8, overflow: "hidden",
        }}>
          <AlertHistoryTable />
        </div>
      </section>
    </div>
  );
}
