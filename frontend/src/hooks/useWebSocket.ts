import { useEffect, useRef, useState, useCallback } from "react";

interface WsOptions {
  url: string;
  onMessage?: (data: any) => void;
  reconnectInterval?: number;
  maxReconnects?: number;
}

export function useWebSocket({ url, onMessage, reconnectInterval = 2000, maxReconnects = 20 }: WsOptions) {
  const [status, setStatus] = useState<"connecting" | "online" | "offline" | "reconnecting">("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef<number>(0);

  const connect = useCallback(() => {
    if (!url) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("online");
      reconnectCount.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "ping") return;
        onMessage?.(data);
      } catch {}
    };

    ws.onclose = () => {
      setStatus("reconnecting");
      if (reconnectCount.current < maxReconnects) {
        const delay = Math.min(reconnectInterval * Math.pow(1.5, reconnectCount.current), 30000);
        reconnectCount.current++;
        reconnectTimer.current = window.setTimeout(connect, delay);
      } else {
        setStatus("offline");
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [url, onMessage, reconnectInterval, maxReconnects]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { status, send };
}
