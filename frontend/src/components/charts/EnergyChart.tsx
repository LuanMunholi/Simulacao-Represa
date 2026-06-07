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
import { CHART, ChartEmpty, axisProps, gridProps, tooltipStyle } from "./chartTheme";

export function EnergyChart() {
  const { items } = useSensorHistory("sensor_energia_01");
  const data = items.map((p) => ({
    simulated_timestamp: p.simulated_timestamp,
    energia: p.valor,
  }));

  return (
    <Card title="Energia gerada (kW/h)">
      {data.length === 0 ? (
        <ChartEmpty />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.energy} stopOpacity={0.55} />
                <stop offset="100%" stopColor={CHART.energy} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="simulated_timestamp" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="energia"
              stroke={CHART.energy}
              strokeWidth={2}
              fill="url(#energyGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
