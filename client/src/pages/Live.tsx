import { useEffect, useRef, useState } from "react";
import { wsUrl, label } from "../api";

interface Drone { id: string; x: number; y: number; kind: string; autonomous: boolean }
interface Frame { timestampMs: number; threatCount: number; drones: Drone[]; sensors?: Record<"rf" | "acoustic" | "eoir", { active: boolean; signal: number; contacts: number }> }
interface Feed { id: string; text: string; ok: boolean }

const kindColor = (k: string) => (k === "HOSTILE_FPV" ? "#EF4444" : k === "FRIENDLY_RECON" ? "#10B981" : "#F59E0B");
const sensorNames = { rf: "RF", acoustic: "Acoustic", eoir: "EO/IR" } as const;

export default function Live() {
  const [frame, setFrame] = useState<Frame | null>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const [feed, setFeed] = useState<Feed[]>([]);
  const retry = useRef<number>();

  useEffect(() => {
    let ws: WebSocket; let closed = false;
    const connect = () => {
      setStatus("connecting");
      ws = new WebSocket(wsUrl());
      ws.onopen = () => setStatus("live");
      ws.onclose = () => { if (!closed) { setStatus("offline"); retry.current = window.setTimeout(connect, 2000); } };
      ws.onmessage = (m) => {
        const msg = JSON.parse(m.data);
        if (msg.type === "frame") setFrame(msg.payload);
        if (msg.type === "event") {
          const e = msg.payload;
          setFeed((f) => [{ id: e.id, ok: e.isCorrect, text: `${label(e.eventType)}: ${e.rule} (${e.scoreDelta > 0 ? "+" : ""}${e.scoreDelta})` }, ...f].slice(0, 8));
        }
      };
    };
    connect();
    return () => { closed = true; clearTimeout(retry.current); ws?.close(); };
  }, []);

  const dot = status === "live" ? "bg-friendly" : status === "connecting" ? "bg-caution" : "bg-hostile";

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="font-head text-3xl font-bold text-zinc-100">Live tactical map</h1>
        <span className="flex items-center gap-2 text-sm text-zinc-400"><span className={`h-2.5 w-2.5 rounded-full ${dot}`} />{status === "live" ? "Receiving telemetry" : status === "connecting" ? "Connecting" : "Offline, retrying"}</span>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="panel p-2">
          <svg viewBox="0 0 1000 1000" className="mx-auto aspect-square max-h-[75vh] w-full" role="img" aria-label="Tactical map of tracked drones">
            <rect width="1000" height="1000" fill="#09090b" />
            {[150, 300, 450].map((r) => <circle key={r} cx="500" cy="500" r={r} fill="none" stroke="#27272a" strokeWidth="2" />)}
            <line x1="500" y1="40" x2="500" y2="960" stroke="#1f1f23" /><line x1="40" y1="500" x2="960" y2="500" stroke="#1f1f23" />
            <circle cx="500" cy="500" r="12" fill="#10B981" /><text x="520" y="492" fill="#71717a" fontSize="22">Protected site</text>
            {frame?.drones.map((d) => (
              <g key={d.id}>
                <circle cx={d.x} cy={d.y} r="14" fill={kindColor(d.kind)} fillOpacity="0.25" stroke={kindColor(d.kind)} strokeWidth="3" strokeDasharray={d.autonomous ? "5 4" : undefined} />
                <text x={d.x + 20} y={d.y + 6} fill="#d4d4d8" fontSize="22">{d.id}</text>
              </g>
            ))}
          </svg>
          <div className="flex flex-wrap gap-4 px-3 pb-2 text-xs text-zinc-400">
            {[["HOSTILE_FPV", "Hostile"], ["FRIENDLY_RECON", "Friendly"], ["CIVILIAN_COMMERCIAL", "Civilian"]].map(([k, n]) => <span key={k} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: kindColor(k) }} />{n}</span>)}
            <span>Dashed outline: no RF link</span>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="panel p-4">
            <div className="text-sm text-zinc-400">Active hostile threats</div>
            <div className="font-head text-6xl font-bold text-hostile">{frame?.threatCount ?? 0}</div>
            <div className="text-sm text-zinc-500">{frame?.drones.length ?? 0} aircraft tracked</div>
          </div>
          <div className="panel p-4">
            <h2 className="panel-title">Sensor channels</h2>
            <ul className="mt-3 space-y-3">
              {(Object.keys(sensorNames) as (keyof typeof sensorNames)[]).map((k) => {
                const s = frame?.sensors?.[k];
                return (
                  <li key={k}>
                    <div className="flex justify-between text-sm"><span className="text-zinc-300">{sensorNames[k]}</span><span className="text-zinc-500">{s ? `${s.contacts} contacts` : "No data"}</span></div>
                    <div className="mt-1 h-1.5 rounded bg-zinc-800"><div className="h-1.5 rounded bg-friendly" style={{ width: `${s?.signal ?? 0}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="panel p-4">
            <h2 className="panel-title">Decision feed</h2>
            {!feed.length && <p className="mt-2 text-sm text-zinc-500">Scored decisions appear here as the simulator posts them.</p>}
            <ul className="mt-2 space-y-1.5 text-sm">{feed.map((f) => <li key={f.id} className={f.ok ? "text-friendly" : "text-hostile"}>{f.text}</li>)}</ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
