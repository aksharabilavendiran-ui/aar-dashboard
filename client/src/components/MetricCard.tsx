import { ReactNode } from "react";

interface Props { title: string; value: string; unit?: string; benchmark: string; good: boolean; ratio: number; icon: ReactNode }

/** ratio: 0-1 share of the bar that is filled (already oriented so that more fill = better) */
export default function MetricCard({ title, value, unit, benchmark, good, ratio, icon }: Props) {
  const c = good ? "#10B981" : "#F59E0B";
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>{title}</span>
        <span style={{ color: c }}>{icon}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-head text-4xl font-bold text-zinc-100">{value}</span>
        {unit && <span className="text-sm text-zinc-500">{unit}</span>}
      </div>
      <div className="mt-3 h-1.5 rounded bg-zinc-800" role="presentation">
        <div className="h-1.5 rounded" style={{ width: `${Math.max(4, Math.min(100, ratio * 100))}%`, background: c }} />
      </div>
      <div className="mt-2 text-xs text-zinc-500">{benchmark}</div>
    </div>
  );
}
