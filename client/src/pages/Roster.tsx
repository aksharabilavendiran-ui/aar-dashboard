import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, gradeColor, label } from "../api";
import { TraineeRow } from "../types";

interface Stats {
  trainee: TraineeRow;
  totals: { sessions: number; totalScore: number; avgScore: number; avgTtdMs: number };
  accuracyOverTime: { sessionId: string; date: string; scenarioName: string; weatherCondition: string; totalScore: number; timeToDetectMs: number; classificationAcc: number; mitigationAccuracy: number; grade: string }[];
}

export default function Roster() {
  const [rows, setRows] = useState<TraineeRow[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { api<TraineeRow[]>("/trainees").then((r) => { setRows(r); if (r[0]) setActive(r[0].id); }).catch((e) => setError(e.message)); }, []);
  useEffect(() => { if (active) api<Stats>(`/trainees/${active}/stats`).then(setStats).catch((e) => setError(e.message)); }, [active]);

  return (
    <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[22rem_1fr]">
      <section>
        <h1 className="font-head text-3xl font-bold text-zinc-100">Trainee roster</h1>
        {error && <p className="mt-2 text-hostile">{error}</p>}
        {!error && !rows.length && <p className="mt-3 text-zinc-500">No trainees yet. Run <code>npm run db:seed</code> in the server folder.</p>}
        <ul className="mt-3 space-y-2">
          {rows.map((t) => (
            <li key={t.id}>
              <button onClick={() => setActive(t.id)} aria-pressed={active === t.id}
                className={`w-full rounded border p-3 text-left ${active === t.id ? "border-friendly bg-zinc-800" : "border-zinc-800 bg-zinc-900 hover:bg-zinc-800/60"}`}>
                <div className="flex items-baseline justify-between">
                  <span className="font-medium text-zinc-100">{t.rank} {t.name}</span>
                  <span className="font-head text-lg font-semibold tabular-nums text-zinc-100">{t.avgScore}</span>
                </div>
                <div className="text-sm text-zinc-400">{t.unit} · {t.sessionCount} sessions · TTD {(t.avgTtdMs / 1000).toFixed(1)} s</div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        {stats && (
          <>
            <div className="panel p-4">
              <h2 className="panel-title">{stats.trainee.rank} {stats.trainee.name}</h2>
              <div className="mt-3 grid grid-cols-3 gap-4 text-sm text-zinc-400">
                <div><div className="font-head text-3xl font-bold text-zinc-100">{stats.totals.sessions}</div>Sessions</div>
                <div><div className="font-head text-3xl font-bold text-zinc-100">{stats.totals.avgScore}</div>Average score</div>
                <div><div className="font-head text-3xl font-bold text-zinc-100">{(stats.totals.avgTtdMs / 1000).toFixed(2)}s</div>Average time to detect</div>
              </div>
            </div>
            <div className="panel p-4">
              <h2 className="panel-title">Accuracy over time</h2>
              <div className="mt-2 h-64">
                <ResponsiveContainer>
                  <LineChart data={stats.accuracyOverTime.map((s, i) => ({ n: i + 1, cls: s.classificationAcc, mit: s.mitigationAccuracy }))} margin={{ left: -16, right: 8, top: 8 }}>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                    <XAxis dataKey="n" stroke="#71717a" fontSize={12} label={{ value: "Session", position: "insideBottom", offset: -2, fill: "#71717a", fontSize: 12 }} />
                    <YAxis domain={[0, 100]} stroke="#71717a" fontSize={12} />
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line dataKey="cls" name="Classification %" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line dataKey="mit" name="Mitigation %" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="panel">
              <h2 className="panel-title border-b border-zinc-800 p-4">Sessions</h2>
              <ul className="divide-y divide-zinc-800">
                {[...stats.accuracyOverTime].reverse().map((s) => (
                  <li key={s.sessionId}>
                    <Link to={`/aar/${s.sessionId}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-zinc-800/50">
                      <div><div className="text-zinc-100">{s.scenarioName}</div><div className="text-xs text-zinc-500">{label(s.weatherCondition)} · {new Date(s.date).toLocaleDateString()}</div></div>
                      <div className="flex items-center gap-4"><span className="tabular-nums text-zinc-300">{s.totalScore}</span>
                        <span className="w-10 text-right font-head text-xl font-bold" style={{ color: gradeColor(s.grade) }}>{s.grade}</span></div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
