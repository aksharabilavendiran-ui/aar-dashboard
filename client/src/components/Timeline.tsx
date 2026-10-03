import { useMemo } from "react";
import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import { Aar } from "../types";

const GREEN = "#10B981", RED = "#EF4444", AMBER = "#F59E0B";

function Marker(p: any) {
  const { cx, cy, payload, selectedId, onSelect } = p;
  if (cx == null || cy == null) return null;
  const c = payload.isCorrect ? GREEN : RED;
  const sel = payload.id === selectedId;
  return (
    <g style={{ cursor: "pointer" }} onClick={() => onSelect(payload.id)}>
      <circle cx={cx} cy={cy} r={sel ? 11 : 8} fill="#09090b" stroke={c} strokeWidth={sel ? 3 : 2} />
      {payload.isCorrect ? (
        <path d={`M${cx - 3.5} ${cy} l2.5 3 l5 -6`} stroke={c} strokeWidth={2} fill="none" />
      ) : (
        <path d={`M${cx - 3.5} ${cy - 3.5} l7 7 M${cx + 3.5} ${cy - 3.5} l-7 7`} stroke={c} strokeWidth={2} fill="none" />
      )}
    </g>
  );
}

function Tip({ active, label, payload }: any) {
  if (!active || !payload?.length) return null;
  const drones = payload.find((x: any) => x.dataKey === "droneCount");
  const stress = payload.find((x: any) => x.dataKey === "stressIndex");
  if (!drones && !stress) return null;
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs">
      <div className="mb-1 font-semibold text-zinc-100">{label}s into session</div>
      {drones && <div style={{ color: AMBER }}>Active drones: {drones.value}</div>}
      {stress && <div className="text-zinc-300">Stress index: {Number(stress.value).toFixed(2)}</div>}
    </div>
  );
}

export default function Timeline({ data, selectedId, onSelect }: { data: Aar; selectedId: string | null; onSelect: (id: string) => void }) {
  const points = useMemo(
    () =>
      data.events.map((e) => {
        const nearest = data.telemetry.reduce((b, x) => (Math.abs(x.t - e.t) < Math.abs(b.t - e.t) ? x : b), data.telemetry[0] ?? { t: 0, droneCount: 0 });
        return { id: e.id, t: Math.round(e.t * 10) / 10, y: nearest.droneCount, isCorrect: e.isCorrect };
      }),
    [data]
  );

  return (
    <div className="panel p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="panel-title">Session timeline</h2>
        <div className="flex gap-4 text-xs text-zinc-400">
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: GREEN }} />Correct action</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: RED }} />Error or misidentification</span>
        </div>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer>
          <ComposedChart data={data.telemetry} margin={{ top: 12, right: 8, left: -12, bottom: 4 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={[0, "dataMax"]} tickFormatter={(s) => `${s}s`} stroke="#71717a" fontSize={12} />
            <YAxis yAxisId="d" allowDecimals={false} stroke={AMBER} fontSize={12} label={{ value: "Drones", angle: -90, position: "insideLeft", fill: AMBER, fontSize: 12, dx: 18 }} />
            <YAxis yAxisId="s" orientation="right" domain={[0, 1]} stroke="#a1a1aa" fontSize={12} />
            <Tooltip content={<Tip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line yAxisId="d" type="stepAfter" dataKey="droneCount" name="Active drones" stroke={AMBER} strokeWidth={2} dot={false} />
            <Line yAxisId="s" type="monotone" dataKey="stressIndex" name="Player stress index" stroke="#d4d4d8" strokeDasharray="5 4" strokeWidth={2} dot={false} />
            <Scatter yAxisId="d" data={points} dataKey="y" name="Decisions" legendType="none" shape={(p: any) => <Marker {...p} selectedId={selectedId} onSelect={onSelect} />} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-zinc-500">Select a marker to open that decision in the log below.</p>
    </div>
  );
}
