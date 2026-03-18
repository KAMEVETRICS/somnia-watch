import { WebSocketServer, WebSocket } from "ws";
import { config } from "./config.js";

// ─── WebSocket broadcast server for the frontend dashboard ───────────
let wss: WebSocketServer;
const clients = new Set<WebSocket>();

export function startWsServer(): void {
  wss = new WebSocketServer({ port: config.wsPort });

  wss.on("connection", (ws) => {
    clients.add(ws);
    console.log(`🔌 Frontend client connected (${clients.size} total)`);

    ws.on("close", () => {
      clients.delete(ws);
      console.log(`🔌 Frontend client disconnected (${clients.size} total)`);
    });

    // Send a welcome message
    ws.send(JSON.stringify({ type: "connected", timestamp: Date.now() }));
  });

  console.log(`📡 WebSocket server running on ws://localhost:${config.wsPort}`);
}

// ─── Broadcast typed messages to all connected frontend clients ──────
export interface WsMessage {
  type: "whale_alert" | "new_transfer" | "hot_contracts_update" | "network_stats";
  data: unknown;
  timestamp: number;
}

export function broadcast(message: WsMessage): void {
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
