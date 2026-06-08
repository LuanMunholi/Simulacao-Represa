import { useEffect, useRef, useState } from "react";

interface UseWebSocketResult<T> {
  data: T | null;
  connected: boolean;
}

export function useWebSocket<T>(path: string): UseWebSocketResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let stopped = false;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (stopped) return;
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${proto}//${window.location.host}${path}`;
      ws = new WebSocket(url);

      ws.onopen = () => {
        setConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as T;
          setData(payload);
        } catch (err) {
          console.error("Failed to parse WS message:", err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (!stopped) {
          const delay = Math.min(30000, 1000 * 2 ** reconnectAttempts.current);
          reconnectAttempts.current += 1;
          reconnectTimeout = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        ws?.close();
      };
    }

    connect();

    return () => {
      stopped = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [path]);

  return { data, connected };
}
