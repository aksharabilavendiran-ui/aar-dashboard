import { Fragment, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { AarEvent } from "../types";
import { label } from "../api";

const filters = [
  { id: "ALL", name: "All events" },
  { id: "DETECTION", name: "Detection" },
  { id: "CLASSIFICATION", name: "Classification" },
  { id: "ENGAGEMENT", name: "Engagement" },
] as const;

export default function EventTable({ events, selectedId, onSelect }: { events: AarEvent[]; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("ALL");
  const [mistakesOnly, setMistakesOnly] = useState(false);
  const selRef = useRef<HTMLTableRowElement | null>(null);

  const rows = events.filter((e) => (filter === "ALL" || e.eventType === filter) && (!mistakesOnly || !e.isCorrect));
  useEffect(() => { selRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [selectedId]);

  return (
    <div className="panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 p-4">
        <h2 className="panel-title">Decision log</h2>
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
              className={`rounded border px-3 py-1 text-sm ${filter === f.id ? "border-friendly bg-friendly/15 text-friendly" : "border-zinc-700 text-zinc-400 hover:text-zinc-100"}`}>
              {f.name}
            </button>
          ))}
          <label className="ml-2 flex items-center gap-2 text-sm text-zinc-400">
            <input type="checkbox" checked={mistakesOnly} onChange={(e) => setMistakesOnly(e.target.checked)} className="accent-red-500" />
            Mistakes only
          </label>
        </div>
      </div>
      <div className="max-h-[28rem] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-zinc-900 text-zinc-400">
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-2 font-medium">Time</th><th className="px-4 py-2 font-medium">Event</th><th className="px-4 py-2 font-medium">Target</th>
              <th className="px-4 py-2 font-medium">Action</th><th className="px-4 py-2 font-medium">Reaction</th><th className="px-4 py-2 font-medium">Result</th>
              <th className="px-4 py-2 text-right font-medium">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const open = selectedId === e.id;
              return (
                <Fragment key={e.id}>
                  <tr ref={open ? selRef : null} onClick={() => onSelect(open ? null : e.id)} tabIndex={0}
                    onKeyDown={(k) => (k.key === "Enter" || k.key === " ") && onSelect(open ? null : e.id)}
                    className={`cursor-pointer border-b border-zinc-800/70 hover:bg-zinc-800/50 ${open ? "bg-zinc-800/70" : ""} ${e.critical ? "border-l-2 border-l-hostile" : ""}`}>
                    <td className="px-4 py-2 tabular-nums">{e.t.toFixed(1)}s</td>
                    <td className="px-4 py-2">{label(e.eventType)}</td>
                    <td className="px-4 py-2">{label(e.targetType)}{e.autonomous && <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">No RF link</span>}</td>
                    <td className="px-4 py-2">{e.chosenAction === "NONE" ? "None" : label(e.chosenAction)}</td>
                    <td className="px-4 py-2 tabular-nums">{(e.reactionMs / 1000).toFixed(1)}s</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 ${e.isCorrect ? "text-friendly" : "text-hostile"}`}>
                        {e.isCorrect ? <Check className="h-4 w-4" /> : e.critical ? <AlertTriangle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        {e.rule}
                      </span>
                    </td>
                    <td className={`px-4 py-2 text-right tabular-nums ${e.scoreDelta >= 0 ? "text-friendly" : "text-hostile"}`}>{e.scoreDelta > 0 ? "+" : ""}{e.scoreDelta}</td>
                  </tr>
                  {open && (
                    <tr className="border-b border-zinc-800">
                      <td colSpan={7} className="bg-zinc-950 px-4 py-4">
                        {e.isCorrect ? (
                          <p className="text-sm text-zinc-300">{e.rule}. Reaction time was {(e.reactionMs / 1000).toFixed(1)} s.</p>
                        ) : (
                          <div className={`rounded border p-4 ${e.critical ? "border-hostile bg-hostile/10" : "border-zinc-700"}`}>
                            <h3 className="font-head text-base font-semibold text-hostile">Why this was wrong</h3>
                            <p className="mt-1 text-sm text-zinc-200">{e.whyWrong}</p>
                            {e.eventType === "ENGAGEMENT" && !e.critical && (
                              <p className="mt-2 text-sm text-zinc-400">Better choice: {e.optimalActions.map(label).join(" or ")}.</p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!rows.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-500">No events match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
