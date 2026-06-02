import { useEffect, useState } from "react";

import type { AlertHistoryItem } from "../types";
import { SeverityBadge } from "./SeverityBadge";

export function AlertHistoryTable() {
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
      <div className="text-sm text-slate-400 p-3">
        Nenhum alerta registrado ainda.
      </div>
    );
  }

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="text-left text-slate-400 border-b border-slate-700">
          <th className="p-2">Tempo</th>
          <th className="p-2">Tipo</th>
          <th className="p-2">Severidade</th>
          <th className="p-2">Mensagem</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it) => (
          <tr key={it.id} className="border-b border-slate-800">
            <td className="p-2 font-mono text-slate-300 whitespace-nowrap">
              {it.simulated_time}
            </td>
            <td className="p-2">{it.tipo}</td>
            <td className="p-2">
              <SeverityBadge severidade={it.severidade} />
            </td>
            <td className="p-2">{it.mensagem}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
