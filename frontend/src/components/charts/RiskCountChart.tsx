import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "../Card";
import { CHART, ChartEmpty, axisProps, gridProps, tooltipStyle } from "./chartTheme";

interface AlertCountPoint {
  simulated_timestamp: number;
  count: number;
}

export function RiskCountChart() {
  const [items, setItems] = useState<AlertCountPoint[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/history/alert-counts?horas=720");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setItems(json.items ?? []);
      } catch (e) {
        console.error("Failed to load alert counts:", e);
      }
    }
    load();
    const id = setInterval(load, 5_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <Card title="Atividade de alertas (novos por hora simulada)">
      {items.length === 0 ? (
        <ChartEmpty />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={items} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="simulated_timestamp" {...axisProps} />
            <YAxis {...axisProps} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill={CHART.danger} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
