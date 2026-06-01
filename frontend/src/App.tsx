import { useWebSocket } from "./hooks/useWebSocket";

interface Tick {
  simulated_hours: number;
  fator_aceleracao: number;
  dummy_value: number;
}

const cardStyle: React.CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 8,
  padding: 24,
  marginTop: 16,
  maxWidth: 480,
};

export default function App() {
  const { data, connected } = useWebSocket<Tick>("/ws");

  return (
    <div style={{ padding: 32, fontFamily: "ui-monospace, monospace" }}>
      <h1>Simulação Represa — Slice 1</h1>
      <p>Status: {connected ? "Conectado" : "Desconectado"}</p>
      <div style={cardStyle}>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
          dummy sensor
        </div>
        <div style={{ fontSize: 48, fontWeight: 600 }}>
          {data ? data.dummy_value.toFixed(1) : "—"}
        </div>
        <div style={{ fontSize: 14, color: "#cbd5e1", marginTop: 12 }}>
          simulated_hours: {data ? data.simulated_hours : "—"}
        </div>
        <div style={{ fontSize: 14, color: "#cbd5e1" }}>
          fator_aceleracao: {data ? data.fator_aceleracao : "—"}
        </div>
      </div>
    </div>
  );
}
