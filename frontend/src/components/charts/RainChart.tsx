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
import { Card } from "../Card";
import { CHART, ChartEmpty, axisProps, gridProps, tooltipStyle } from "./chartTheme";
import { mergeSeries } from "./merge";

export function RainChart() {
  const { items: c01 } = useSensorHistory("sensor_chuva_01");
  const { items: c02 } = useSensorHistory("sensor_chuva_02");
  const data = mergeSeries([
    { points: c01, key: "chuva_01" },
    { points: c02, key: "chuva_02" },
  ]);

  return (
    <Card title="Chuva — atual (mm/h) e acumulada 30d (mm)">
      {data.length === 0 ? (
        <ChartEmpty />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 50, left: 0, bottom: 5 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="simulated_timestamp" {...axisProps} />
            <YAxis
              yAxisId="left"
              stroke={CHART.rain}
              tick={{ fontSize: 11, fill: CHART.rain }}
              label={{ value: "mm/h", angle: -90, position: "insideLeft", fill: CHART.rain, fontSize: 11 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              {...axisProps}
              label={{ value: "mm", angle: 90, position: "insideRight", fill: CHART.axis, fontSize: 11 }}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="chuva_01"
              stroke={CHART.rain}
              name="Atual (mm/h)"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="chuva_02"
              stroke={CHART.rainAccum}
              name="Acumulado (mm)"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
