import { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";

let wss: WebSocketServer | null = null;

export function attachWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/live-telemetry" });
  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ type: "hello", payload: { message: "connected to live-telemetry" } }));
  });
  console.log("WebSocket listening on /live-telemetry");
}

export function broadcast(msg: { type: "frame" | "event"; payload: unknown }) {
  if (!wss) return;
  const data = JSON.stringify(msg);
  wss.clients.forEach((c: WebSocket) => c.readyState === WebSocket.OPEN && c.send(data));
}
