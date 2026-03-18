"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { WsMessage, WhaleAlert, BlockTransfers, NetworkStats } from "@/lib/types";
import { WS_URL } from "@/lib/constants";

// ─── WebSocket hook with auto-reconnect ──────────────────────────────
export function useWebSocket() {
  const [whaleAlerts, setWhaleAlerts] = useState<WhaleAlert[]>([]);
  const [transfers, setTransfers] = useState<BlockTransfers[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const retryCount = useRef(0);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        retryCount.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);

          switch (msg.type) {
            case "whale_alert":
              setWhaleAlerts((prev) => [msg.data as WhaleAlert, ...prev].slice(0, 50));
              break;
            case "new_transfer":
              setTransfers((prev) => [msg.data as BlockTransfers, ...prev].slice(0, 30));
              break;
            case "network_stats":
              setNetworkStats(msg.data as NetworkStats);
              break;
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
        const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
        retryCount.current++;
        reconnectTimeout.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
      retryCount.current++;
      reconnectTimeout.current = setTimeout(connect, delay);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [connect]);

  return { whaleAlerts, transfers, networkStats, connected };
}
