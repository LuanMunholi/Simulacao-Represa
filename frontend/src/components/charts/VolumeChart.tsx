import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useSensorHistory } from "../../hooks/useSensorHistory";
import { Card } from "../Card";
import { CHART, ChartEmpty, axisProps, gridProps, tooltipStyle } from "./chartTheme";
import { mergeSeries } from "./merge";

export function VolumeChart() {
  const { items: vol01 } = useSensorHistory("sensor_volume_01");
  const { items: vol02 } = useSensorHistory("sensor_volume_02");
  const data = mergeSeries([
    { points: vol01, key: "vol_01" },
    { points: vol02, key: "vol_02" },
  ]);

  return (
    <Card title="Volume dos tanques (%)">
      {data.length === 0 ? (
        <ChartEmpty />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid {...gridProps} />
            {/* zonas de perigo: transbordo (>=95%) e vazio (<=5%) */}
            <ReferenceArea y1={95} y2={100} fill={CHART.danger} fillOpacity={0.08} />
            <ReferenceArea y1={0} y2={5} fill={CHART.danger} fillOpacity={0.08} />
            <XAxis
              dataKey="simulated_timestamp"
              {...axisProps}
              label={{ value: "hora simulada", position: "insideBottom", fill: CHART.axis, offset: -2, fontSize: 11 }}
            />
            <YAxis domain={[0, 100]} {...axisProps} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={90} stroke={CHART.ok} strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="vol_01"
              stroke={CHART.water}
              name="Tanque Superior"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="vol_02"
              stroke={CHART.waterAlt}
              name="Tanque Inferior"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
