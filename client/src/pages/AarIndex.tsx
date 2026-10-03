import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, label } from "../api";
import { SessionRow } from "../types";

export default function AarIndex() {
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api<SessionRow[]>("/sessions").then(setRows).catch((e) => setError(e.message)); }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-head text-3xl font-bold text-zinc-100">After-action review</h1>
      <p className="mt-1 text-zinc-400">Pick a session to open its full review.</p>
      {error && <p className="mt-4 text-hostile">{error}</p>}
      {rows && !rows.length && <p className="mt-6 text-zinc-500">No sessions yet. Run <code>npm run db:seed</code> in the server folder to load sample data.</p>}
      <ul className="mt-4 divide-y divide-zinc-800 panel">
        {rows?.map((r) => (
          <li key={r.id}>
            <Link to={`/aar/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-zinc-800/50">
              <div>
                <div className="font-medium text-zinc-100">{r.trainee.rank} {r.trainee.name}</div>
                <div className="text-sm text-zinc-400">{r.scenarioName}, {label(r.weatherCondition).toLowerCase()}, {label(r.threatType).toLowerCase()}</div>
              </div>
              <div className="text-right">
                <div className="font-head text-xl font-semibold tabular-nums text-zinc-100">{r.totalScore.toLocaleString()}</div>
                <div className="text-xs text-zinc-500">{new Date(r.startTime).toLocaleDateString()}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
