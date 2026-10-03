import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import { router } from "./routes";
import { attachWebSocket } from "./websocket";
import { startSimulator } from "./simulator";

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(",") ?? true }));
app.use(express.json({ limit: "2mb" }));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/v1", router);
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const server = http.createServer(app);
attachWebSocket(server);
if (process.env.SIM_LIVE !== "false") startSimulator();

const port = Number(process.env.PORT ?? 5000);
server.listen(port, () => console.log(`API on http://localhost:${port}  |  WS on ws://localhost:${port}/live-telemetry`));
