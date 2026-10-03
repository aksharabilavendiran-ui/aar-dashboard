import { broadcast } from "./websocket";

/** Synthetic drone feed so the Live Tactical Map works without a Unity/Unreal client. */
export function startSimulator() {
  type D = { id: string; x: number; y: number; vx: number; vy: number; kind: string; autonomous: boolean };
  let drones: D[] = [];
  let t = 0;
  let n = 0;
  const kinds = ["HOSTILE_FPV", "HOSTILE_FPV", "FRIENDLY_RECON", "CIVILIAN_COMMERCIAL"];

  const spawn = (): D => {
    const edge = Math.random() * Math.PI * 2;
    const x = 500 + Math.cos(edge) * 520;
    const y = 500 + Math.sin(edge) * 520;
    const sp = 6 + Math.random() * 10;
    const a = Math.atan2(500 - y, 500 - x) + (Math.random() - 0.5) * 0.6;
    return { id: `T-${++n}`, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, kind: kinds[Math.floor(Math.random() * kinds.length)], autonomous: Math.random() < 0.35 };
  };

  setInterval(() => {
    t += 500;
    if (drones.length < 7 && Math.random() < 0.3) drones.push(spawn());
    drones.forEach((d) => { d.x += d.vx; d.y += d.vy; });
    drones = drones.filter((d) => d.x > -50 && d.x < 1050 && d.y > -50 && d.y < 1050 && Math.hypot(d.x - 500, d.y - 500) > 25);
    const hostile = drones.filter((d) => d.kind === "HOSTILE_FPV");
    broadcast({
      type: "frame",
      payload: {
        sessionId: "demo-live", timestampMs: t, threatCount: hostile.length, drones,
        sensors: {
          rf: { active: true, signal: Math.round(60 + Math.random() * 35), contacts: hostile.filter((d) => !d.autonomous).length },
          acoustic: { active: true, signal: Math.round(40 + Math.random() * 40), contacts: drones.length },
          eoir: { active: true, signal: Math.round(30 + Math.random() * 50), contacts: Math.min(drones.length, 4) },
        },
      },
    });
  }, 500);
}
