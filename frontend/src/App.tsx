import { useEffect, useState } from "react";

import { EnergyChart } from "./components/charts/EnergyChart";
import { RainChart } from "./components/charts/RainChart";
import { VolumeChart } from "./components/charts/VolumeChart";
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
  scenario_ticks_remaining: number | null;
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

const STATUS_LABELS: Record<string, string> = {
  RODANDO: "RODANDO",
  PAUSADO: "PAUSADO",
  INICIANDO: "INICIANDO",
  CENARIO_ATIVO: "CENÁRIO ATIVO",
};

const buttonStyle: React.CSSProperties = {
  background: "#334155",
  color: "#e2e8f0",
  border: "1px solid #475569",
  borderRadius: 4,
  padding: "6px 12px",
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "inherit",
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#2563eb",
  borderColor: "#1d4ed8",
};

const urgentButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#dc2626",
  borderColor: "#991b1b",
  fontWeight: 600,
};

async function postJson(path: string, body?: object): Promise<Response> {
  return fetch(path, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Slider 0–100 maps logarithmically to 0.1x–100x
function speedFromSlider(v: number): number {
  return Math.pow(10, (v / 100) * 3 - 1);
}
function speedToSlider(s: number): number {
  return ((Math.log10(s) + 1) / 3) * 100;
}

function formatValue(valor: number | string): string {
  if (typeof valor === "string") return valor;
  return valor.toFixed(2);
}

function SensorCard({ id, entry }: { id: string; entry: SensorEntry }) {
  return (
    <div style={{
      background: "#1e293b", border: "1px solid #334155",
      borderRadius: 8, padding: 14,
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
      background: color, color: "#fff", fontWeight: 600, marginRight: 8,
    }}>
      {severidade}
    </span>
  );
}

function ControlPanel({ data }: { data: Tick | null }) {
  const fator = data?.fator_aceleracao ?? 1.0;
  const [sliderPos, setSliderPos] = useState<number>(() => speedToSlider(fator));
  const [feedback, setFeedback] = useState<string>("");
  const status = data?.status;
  const isCriticPause =
    status === "PAUSADO" && data?.paused_reason === "previsao_critica";
  const isStarting = status === "INICIANDO";

  // Sync slider with backend on connect/changes outside the slider
  useEffect(() => {
    if (data) setSliderPos(speedToSlider(data.fator_aceleracao));
  }, [data?.fator_aceleracao]);

  async function call(label: string, path: string, body?: object) {
    setFeedback(`${label}…`);
    try {
      const res = await postJson(path, body);
      if (res.ok) {
        setFeedback(`${label} OK`);
      } else {
        const detail = await res.text();
        setFeedback(`${label} falhou (${res.status}): ${detail.slice(0, 120)}`);
      }
    } catch (e) {
      setFeedback(`${label} erro: ${e}`);
    }
    setTimeout(() => setFeedback(""), 4000);
  }

  function commitSpeed() {
    const fator = Math.round(speedFromSlider(sliderPos) * 10) / 10;
    call(`Velocidade ${fator}x`, "/api/simulation/speed", { fator });
  }

  const currentSpeed = speedFromSlider(sliderPos);

  return (
    <section style={{
      background: "#1e293b", border: "1px solid #334155",
      borderRadius: 8, padding: 16, marginBottom: 16,
    }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          style={primaryButtonStyle}
          onClick={() => call("Iniciar barragem", "/api/simulation/start")}
          disabled={isStarting}
        >
          {isStarting ? "Iniciando…" : "Iniciar Barragem"}
        </button>

        <button
          style={isCriticPause ? urgentButtonStyle : buttonStyle}
          onClick={() => call("Ajustar comportas", "/api/simulation/adjust")}
        >
          {isCriticPause ? "Ajustar Comportas (CRÍTICO)" : "Ajustar Comportas"}
        </button>

        <button
          style={buttonStyle}
          onClick={() =>
            status === "PAUSADO"
              ? call("Retomar", "/api/simulation/resume")
              : call("Pausar", "/api/simulation/pause")
          }
        >
          {status === "PAUSADO" ? "Retomar" : "Pausar"}
        </button>
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12, color: "#94a3b8", minWidth: 80 }}>Velocidade</span>
        <input
          type="range" min={0} max={100} step={0.5}
          value={sliderPos}
          onChange={(e) => setSliderPos(parseFloat(e.target.value))}
          onMouseUp={commitSpeed}
          onTouchEnd={commitSpeed}
          style={{ flex: 1, maxWidth: 240 }}
        />
        <span style={{ fontSize: 13, fontFamily: "ui-monospace, monospace", minWidth: 60 }}>
          {currentSpeed.toFixed(1)}x
        </span>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>Chuva intensa:</span>
        {[1, 7, 15].map((d) => (
          <button
            key={`chuva-${d}`}
            style={buttonStyle}
            onClick={() =>
              call(`Chuva ${d}d`, "/api/simulation/scenario", { tipo: "chuva_intensa", duracao_dias: d })
            }
          >
            {d}d
          </button>
        ))}
        <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 12 }}>Seca:</span>
        {[15, 30, 60].map((d) => (
          <button
            key={`seca-${d}`}
            style={buttonStyle}
            onClick={() =>
              call(`Seca ${d}d`, "/api/simulation/scenario", { tipo: "seca", duracao_dias: d })
            }
          >
            {d}d
          </button>
        ))}
      </div>

      {data?.scenario_active && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#cbd5e1" }}>
          Cenário ativo: <strong>{data.scenario_active}</strong>
          {data.scenario_ticks_remaining != null && (
            <> — {data.scenario_ticks_remaining}h restantes ({(data.scenario_ticks_remaining / 24).toFixed(1)} dias)</>
          )}
        </div>
      )}

      {feedback && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8", fontFamily: "ui-monospace, monospace" }}>
          {feedback}
        </div>
      )}
    </section>
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
            {data ? STATUS_LABELS[data.status] ?? data.status : "—"}
            {isPaused && data?.paused_reason ? ` (${data.paused_reason})` : ""}
          </span>
        </div>
      </header>

      <ControlPanel data={data} />

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

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 8px" }}>
          Sensores em tempo real
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 10,
        }}>
          {SENSOR_ORDER.map((id) => {
            const entry = data?.sensors?.[id];
            if (!entry) return null;
            return <SensorCard key={id} id={id} entry={entry} />;
          })}
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 8px" }}>
          Gráficos — últimas 720 horas simuladas
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          gap: 12,
        }}>
          <VolumeChart />
          <RainChart />
          <EnergyChart />
        </div>
      </section>

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
