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

interface AlertCountPoint {
  simulated_timestamp: number;
  count: number;
}

const tooltipStyle: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  color: "#e2e8f0",
  fontSize: 12,
};

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
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={items} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="simulated_timestamp"
            stroke="#94a3b8"
            tick={{ fontSize: 11 }}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fontSize: 11 }}
            allowDecimals={false}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill="#ef4444" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
