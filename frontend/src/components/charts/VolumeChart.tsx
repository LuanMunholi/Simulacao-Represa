import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useSensorHistory } from "../../hooks/useSensorHistory";
import { mergeSeries } from "./merge";

const chartContainerStyle: React.CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 8,
  padding: 16,
};

const tooltipStyle: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  color: "#e2e8f0",
  fontSize: 12,
};

export function VolumeChart() {
  const { items: vol01 } = useSensorHistory("sensor_volume_01");
  const { items: vol02 } = useSensorHistory("sensor_volume_02");
  const data = mergeSeries([
    { points: vol01, key: "vol_01" },
    { points: vol02, key: "vol_02" },
  ]);

  return (
    <div style={chartContainerStyle}>
      <h3 style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 12px" }}>
        Volume dos tanques (%)
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="simulated_timestamp"
            stroke="#94a3b8"
            tick={{ fontSize: 11 }}
            label={{ value: "hora simulada", position: "insideBottom", fill: "#94a3b8", offset: -2, fontSize: 11 }}
          />
          <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={90} stroke="#16a34a" strokeDasharray="3 3" />
          <ReferenceLine y={20} stroke="#dc2626" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="vol_01"
            stroke="#3b82f6"
            name="Tanque Superior"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="vol_02"
            stroke="#a855f7"
            name="Tanque Inferior"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
