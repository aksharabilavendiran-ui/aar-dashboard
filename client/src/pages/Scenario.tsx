import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dices } from "lucide-react";
import { api } from "../api";
import { TraineeRow } from "../types";

const opts = {
  environmentType: [["URBAN", "Urban high-rise"], ["RURAL", "Rural or forest"], ["DESERT", "Desert outpost"]],
  weatherCondition: [["CLEAR", "Clear"], ["HEAVY_RAIN", "Heavy rain"], ["FOG", "Fog"], ["NIGHT", "Night"]],
  threatType: [["SINGLE_RECON", "Single recon drone"], ["FPV_KAMIKAZE", "FPV kamikaze"], ["SWARM", "Swarm"]],
} as const;
const names = ["Rooftop watch", "Perimeter breach", "Dawn raid", "Convoy cover", "Border patrol", "Depot defence"];
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

export default function Scenario() {
  const [trainees, setTrainees] = useState<TraineeRow[]>([]);
  const [form, setForm] = useState({ traineeId: "", scenarioName: "Rooftop watch", environmentType: "URBAN", weatherCondition: "CLEAR", threatType: "FPV_KAMIKAZE" });
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { api<TraineeRow[]>("/trainees").then((r) => { setTrainees(r); setForm((f) => ({ ...f, traineeId: r[0]?.id ?? "" })); }).catch((e) => setError(e.message)); }, []);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const randomize = () => setForm((f) => ({ ...f, scenarioName: pick(names), environmentType: pick(opts.environmentType)[0], weatherCondition: pick(opts.weatherCondition)[0], threatType: pick(opts.threatType)[0] }));
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError("");
    try { const s = await api<{ id: string }>("/sessions", { method: "POST", body: JSON.stringify(form) }); setCreated(s.id); } catch (err: any) { setError(err.message); }
  };

  const select = (k: keyof typeof opts, title: string) => (
    <label className="block text-sm text-zinc-400">{title}
      <select className="field mt-1" value={(form as any)[k]} onChange={(e) => set(k, e.target.value)}>{opts[k].map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
    </label>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-head text-3xl font-bold text-zinc-100">Scenario builder</h1>
      <form onSubmit={submit} className="panel mt-4 space-y-4 p-5">
        <label className="block text-sm text-zinc-400">Trainee
          <select className="field mt-1" value={form.traineeId} onChange={(e) => set("traineeId", e.target.value)} required>{trainees.map((t) => <option key={t.id} value={t.id}>{t.rank} {t.name}</option>)}</select>
        </label>
        <label className="block text-sm text-zinc-400">Scenario name
          <input className="field mt-1" value={form.scenarioName} onChange={(e) => set("scenarioName", e.target.value)} required />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">{select("environmentType", "Environment")}{select("weatherCondition", "Weather")}{select("threatType", "Threat type")}</div>
        <div className="flex gap-3">
          <button type="button" className="btn" onClick={randomize}><Dices className="h-4 w-4" />Randomize</button>
          <button type="submit" className="btn btn-primary" disabled={!form.traineeId}>Create session</button>
        </div>
        {error && <p className="text-sm text-hostile">{error}</p>}
      </form>
      {created && (
        <div className="panel mt-4 p-5">
          <h2 className="panel-title">Session created</h2>
          <p className="mt-1 text-sm text-zinc-400">Send events from the simulation client with this session ID:</p>
          <pre className="mt-3 overflow-x-auto rounded border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">{`POST http://localhost:5001/api/v1/telemetry/event
{
  "sessionId": "${created}",
  "timestampMs": 12400,
  "eventType": "ENGAGEMENT",
  "targetType": "HOSTILE_FPV",
  "chosenAction": "NET_INTERCEPT",
  "reactionMs": 2300,
  "autonomous": true
}`}</pre>
          <Link to={`/aar/${created}`} className="btn mt-3">Open review</Link>
        </div>
      )}
    </div>
  );
}
