import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useSensorHistory } from "../../hooks/useSensorHistory";
import { mergeSeries } from "./merge";

const tooltipStyle: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  color: "#e2e8f0",
  fontSize: 12,
};

export function RainChart() {
  const { items: c01 } = useSensorHistory("sensor_chuva_01");
  const { items: c02 } = useSensorHistory("sensor_chuva_02");
  const data = mergeSeries([
    { points: c01, key: "chuva_01" },
    { points: c02, key: "chuva_02" },
  ]);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <h3 className="text-[13px] text-slate-400 m-0 mb-3">
        Chuva — atual (mm/h) e acumulada 30d (mm)
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 50, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="simulated_timestamp"
            stroke="#94a3b8"
            tick={{ fontSize: 11 }}
          />
          <YAxis
            yAxisId="left"
            stroke="#0ea5e9"
            tick={{ fontSize: 11 }}
            label={{ value: "mm/h", angle: -90, position: "insideLeft", fill: "#0ea5e9", fontSize: 11 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#94a3b8"
            tick={{ fontSize: 11 }}
            label={{ value: "mm", angle: 90, position: "insideRight", fill: "#94a3b8", fontSize: 11 }}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="chuva_01"
            stroke="#0ea5e9"
            name="Atual (mm/h)"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="chuva_02"
            stroke="#64748b"
            name="Acumulado (mm)"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
