import type { HistoryPoint } from "../../hooks/useSensorHistory";

export interface MergedPoint {
  simulated_timestamp: number;
  [key: string]: number;
}

/** Faz merge de N séries de histórico em um único array indexado por simulated_timestamp. */
export function mergeSeries(
  series: { points: HistoryPoint[]; key: string }[],
): MergedPoint[] {
  const map = new Map<number, MergedPoint>();
  for (const { points, key } of series) {
    for (const p of points) {
      const existing = map.get(p.simulated_timestamp) ?? {
        simulated_timestamp: p.simulated_timestamp,
      };
      existing[key] = p.valor;
      map.set(p.simulated_timestamp, existing);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => a.simulated_timestamp - b.simulated_timestamp,
  );
}
