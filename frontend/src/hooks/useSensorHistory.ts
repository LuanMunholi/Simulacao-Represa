import { useEffect, useState } from "react";

export interface HistoryPoint {
  simulated_timestamp: number;
  valor: number;
}

interface UseSensorHistoryResult {
  items: HistoryPoint[];
  loading: boolean;
  error: string | null;
}

const DEFAULT_REFRESH_MS = 5_000;

export function useSensorHistory(
  sensorId: string,
  horas: number = 720,
  refreshMs: number = DEFAULT_REFRESH_MS,
): UseSensorHistoryResult {
  const [items, setItems] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/history/sensors/${sensorId}?horas=${horas}`);
        if (!res.ok) {
          if (!cancelled) setError(`HTTP ${res.status}`);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setItems(data.items ?? []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sensorId, horas, refreshMs]);

  return { items, loading, error };
}
