import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useSensorHistory } from "../../hooks/useSensorHistory";
import { Card } from "../Card";

const tooltipStyle: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  color: "#e2e8f0",
  fontSize: 12,
};

export function EnergyChart() {
  const { items } = useSensorHistory("sensor_energia_01");
  const data = items.map((p) => ({
    simulated_timestamp: p.simulated_timestamp,
    energia: p.valor,
  }));

  return (
    <Card title="Energia gerada (kW/h)">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#facc15" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#facc15" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="simulated_timestamp"
            stroke="#94a3b8"
            tick={{ fontSize: 11 }}
          />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            dataKey="energia"
            stroke="#facc15"
            fill="url(#energyGradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
