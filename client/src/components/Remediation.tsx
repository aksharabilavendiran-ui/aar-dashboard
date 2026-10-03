import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import { Advice } from "../types";

const style = {
  critical: { icon: AlertOctagon, color: "text-hostile", border: "border-l-hostile" },
  warning: { icon: AlertTriangle, color: "text-caution", border: "border-l-caution" },
  info: { icon: Info, color: "text-friendly", border: "border-l-friendly" },
} as const;

export default function Remediation({ items }: { items: Advice[] }) {
  return (
    <div className="panel p-4">
      <h2 className="panel-title">Instructor remediation</h2>
      <ul className="mt-3 space-y-3">
        {items.map((a, i) => {
          const s = style[a.severity];
          const Icon = s.icon;
          return (
            <li key={i} className={`rounded border border-zinc-800 border-l-4 ${s.border} bg-zinc-950 p-3`}>
              <div className={`flex items-center gap-2 font-head font-semibold ${s.color}`}><Icon className="h-4 w-4" />{a.title}</div>
              <p className="mt-1 text-sm text-zinc-300">{a.advice}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
