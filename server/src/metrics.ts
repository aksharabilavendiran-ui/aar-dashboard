export interface MetricEvent {
  eventType: string;
  targetType: string;
  isCorrect: boolean;
  details: any;
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

export function computeMetrics(events: MetricEvent[]) {
  const det = events.filter((e) => e.eventType === "DETECTION" && !e.details?.missed);
  const cls = events.filter((e) => e.eventType === "CLASSIFICATION");
  const eng = events.filter((e) => e.eventType === "ENGAGEMENT");

  const timeToDetectMs = det.length
    ? Math.round(det.reduce((s, e) => s + (e.details?.reactionMs ?? 0), 0) / det.length)
    : 0;
  const classificationAcc = pct(cls.filter((e) => e.isCorrect).length, cls.length);
  const mitigationAccuracy = pct(eng.filter((e) => e.isCorrect).length, eng.length);

  const risks = eng.map((e) => e.details?.collateralRisk ?? 0);
  const friendlyHits = eng.filter((e) => e.targetType !== "HOSTILE_FPV").length;
  const avgRisk = risks.length ? risks.reduce((a, b) => a + b, 0) / risks.length : 0;
  const collateralRiskScore = Math.round(Math.min(10, avgRisk + friendlyHits * 3) * 10) / 10;

  return { timeToDetectMs, classificationAcc, mitigationAccuracy, collateralRiskScore };
}

export type Grade = "S" | "A" | "B" | "C" | "FAIL";

export function gradeFor(m: { classificationAcc: number; mitigationAccuracy: number; collateralRiskScore: number }): Grade {
  const composite = 0.35 * m.classificationAcc + 0.45 * m.mitigationAccuracy + 0.2 * (10 - m.collateralRiskScore) * 10;
  if (composite >= 92) return "S";
  if (composite >= 80) return "A";
  if (composite >= 68) return "B";
  if (composite >= 55) return "C";
  return "FAIL";
}
