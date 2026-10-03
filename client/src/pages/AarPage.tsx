import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Gauge, Target, ShieldCheck, TriangleAlert } from "lucide-react";
import { api, gradeColor, label } from "../api";
import { Aar } from "../types";
import MetricCard from "../components/MetricCard";
import Timeline from "../components/Timeline";
import EventTable from "../components/EventTable";
import Remediation from "../components/Remediation";

export default function AarPage() {
  const { sessionId } = useParams();
  const [data, setData] = useState<Aar | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setData(null); setError(""); setSelected(null);
    api<Aar>(`/sessions/${sessionId}/aar`).then(setData).catch((e) => setError(e.message));
  }, [sessionId]);

  if (error) return <p className="text-hostile">{error} <Link className="underline" to="/aar">Back to sessions</Link></p>;
  if (!data) return <p className="text-zinc-500">Loading session…</p>;

  const { session: s, benchmark: b } = data;
  const gc = gradeColor(data.grade);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <header className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="text-sm text-zinc-400">{s.trainee.rank} · {s.trainee.unit} · {s.trainee.serviceId}</div>
          <h1 className="font-head text-3xl font-bold text-zinc-100">{s.trainee.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {[s.scenarioName, label(s.environmentType), label(s.weatherCondition), label(s.threatType)].map((t) => (
              <span key={t} className="rounded border border-zinc-700 px-2 py-0.5 text-zinc-300">{t}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-right">
            <div className="text-sm text-zinc-400">Total score</div>
            <div className="font-head text-4xl font-bold tabular-nums text-zinc-100">{s.totalScore.toLocaleString()}</div>
          </div>
          <div className="text-center" aria-label={`Grade ${data.grade}`}>
            <div className="text-sm text-zinc-400">Grade</div>
            <div className="font-head text-6xl font-bold leading-none" style={{ color: gc }}>{data.grade}</div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Time to detect" icon={<Gauge className="h-5 w-5" />} value={(s.timeToDetectMs / 1000).toFixed(2)} unit="s avg"
          benchmark={`Benchmark ${(b.ttdMs / 1000).toFixed(1)} s · ${s.timeToDetectMs <= b.ttdMs ? "faster" : "slower"} by ${Math.abs(s.timeToDetectMs - b.ttdMs)} ms`}
          good={s.timeToDetectMs <= b.ttdMs} ratio={Math.min(1, b.ttdMs / Math.max(1, s.timeToDetectMs))} />
        <MetricCard title="Classification accuracy" icon={<Target className="h-5 w-5" />} value={s.classificationAcc.toFixed(0)} unit="%"
          benchmark={`Benchmark ${b.classificationAcc}% · hostile vs neutral vs friendly`} good={s.classificationAcc >= b.classificationAcc} ratio={s.classificationAcc / 100} />
        <MetricCard title="Mitigation efficiency" icon={<ShieldCheck className="h-5 w-5" />} value={s.mitigationAccuracy.toFixed(0)} unit="%"
          benchmark={`Benchmark ${b.mitigationAccuracy}% · correct soft or hard kill`} good={s.mitigationAccuracy >= b.mitigationAccuracy} ratio={s.mitigationAccuracy / 100} />
        <MetricCard title="Collateral damage index" icon={<TriangleAlert className="h-5 w-5" />} value={s.collateralRiskScore.toFixed(1)} unit="/ 10"
          benchmark={`Target ${b.collateralRiskScore} or lower · based on civilian proximity`} good={s.collateralRiskScore <= b.collateralRiskScore} ratio={1 - s.collateralRiskScore / 10} />
      </section>

      <Timeline data={data} selectedId={selected} onSelect={setSelected} />

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3">
        <div className="2xl:col-span-2"><EventTable events={data.events} selectedId={selected} onSelect={setSelected} /></div>
        <Remediation items={data.remediation} />
      </div>
    </div>
  );
}
