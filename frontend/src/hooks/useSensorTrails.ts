import { useEffect, useRef, useState } from "react";

import type { Tick } from "../types";

/**
 * Mantém um rastro rolante (últimos N valores) de cada sensor numérico, derivado
 * do stream de ticks do WebSocket — sem nenhuma chamada de rede adicional.
 *
 * Só acrescenta um ponto quando o tempo simulado avança (durante uma pausa o
 * engine reenvia o mesmo tick como heartbeat; ignoramos esses para não inflar o
 * rastro com valores repetidos).
 */
export function useSensorTrails(
  data: Tick | null,
  maxLen = 40,
): Record<string, number[]> {
  const [trails, setTrails] = useState<Record<string, number[]>>({});
  const lastHour = useRef<number | null>(null);

  useEffect(() => {
    if (!data?.sensors) return;
    if (lastHour.current === data.simulated_hours) return;
    lastHour.current = data.simulated_hours;

    setTrails((prev) => {
      const next: Record<string, number[]> = { ...prev };
      for (const [id, entry] of Object.entries(data.sensors)) {
        if (typeof entry.valor !== "number") continue;
        const arr = next[id] ? next[id].slice(-(maxLen - 1)) : [];
        arr.push(entry.valor);
        next[id] = arr;
      }
      return next;
    });
  }, [data, maxLen]);

  return trails;
}
