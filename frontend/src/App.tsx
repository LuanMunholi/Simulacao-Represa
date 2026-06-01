import { useWebSocket } from "./hooks/useWebSocket";

interface SensorEntry {
  valor: number | string;
  unidade: string | null;
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
  "sensor_volume_01",
  "sensor_volume_02",
  "sensor_chuva_01",
  "sensor_chuva_02",
  "sensor_turbina_01",
  "sensor_energia_01",
  "sensor_comporta_01",
  "sensor_enchimento_01",
  "sensor_comporta_02",
  "sensor_fluxo_01",
  "sensor_comporta_03",
  "sensor_fluxo_02",
  "sensor_comporta_04",
  "sensor_esvaziamento_01",
];

const ALERT_COLORS: Record<string, string> = {
  VERDE: "#16a34a",
  AMARELO: "#ca8a04",
  LARANJA: "#ea580c",
  VERMELHO: "#dc2626",
};

function formatValue(valor: number | string): string {
  if (typeof valor === "string") return valor;
  return valor.toFixed(2);
}

function SensorCard({ id, entry }: { id: string; entry: SensorEntry }) {
  return (
    <div
      style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 8,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>
        {SENSOR_LABELS[id] ?? id}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "ui-monospace, monospace" }}>
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

export default function App() {
  const { data, connected } = useWebSocket<Tick>("/ws");
  const alertColor = data ? ALERT_COLORS[data.alert_level] ?? "#94a3b8" : "#94a3b8";

  return (
    <div style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <header
        style={{
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 18, margin: 0 }}>Simulação Represa</h1>
          <div
            style={{
              fontSize: 13,
              color: "#94a3b8",
              marginTop: 4,
              fontFamily: "ui-monospace, monospace",
            }}
          >
            {data ? data.simulated_time : "Aguardando dados…"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 13 }}>{connected ? "Conectado" : "Desconectado"}</span>
          <span
            style={{
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 4,
              background: alertColor,
              color: "#fff",
              fontWeight: 600,
            }}
          >
            {data?.alert_level ?? "—"}
          </span>
          <span
            style={{
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 4,
              background: "#334155",
              color: "#cbd5e1",
            }}
          >
            {data?.status ?? "—"}
          </span>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {SENSOR_ORDER.map((id) => {
          const entry = data?.sensors?.[id];
          if (!entry) return null;
          return <SensorCard key={id} id={id} entry={entry} />;
        })}
      </div>
    </div>
  );
}
