export interface Advice { title: string; severity: "critical" | "warning" | "info"; advice: string }

type Ev = { eventType: string; targetType: string; chosenAction: string; isCorrect: boolean; details: any };
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function buildRemediation(
  session: { environmentType: string; weatherCondition: string; timeToDetectMs: number; collateralRiskScore: number },
  events: Ev[]
): Advice[] {
  const out: Advice[] = [];
  const weather = session.weatherCondition.toLowerCase().replace("_", " ");
  const eng = events.filter((e) => e.eventType === "ENGAGEMENT");

  const friendly = eng.filter((e) => e.targetType !== "HOSTILE_FPV");
  if (friendly.length) {
    out.push({ title: "Friendly or civilian aircraft engaged", severity: "critical",
      advice: `${friendly.length} non-hostile aircraft were engaged. Run the identification-before-engagement drill: confirm IFF, transponder and flight profile before any mitigation is selected.` });
  }

  const autoEng = eng.filter((e) => e.details?.autonomous && e.targetType === "HOSTILE_FPV");
  const autoBad = autoEng.filter((e) => !e.isCorrect);
  if (autoBad.length) {
    out.push({ title: "Wrong response to autonomous drones", severity: "warning",
      advice: `${autoBad.length} of ${autoEng.length} autonomous drones were met with RF or GPS countermeasures that cannot affect them. Practise recognising drones with no RF signature and switching to net or kinetic intercept.` });
  }

  const dets = events.filter((e) => e.eventType === "DETECTION" && !e.details?.missed);
  const autoReact = avg(dets.filter((e) => e.details?.autonomous).map((e) => e.details?.reactionMs ?? 0));
  const rfReact = avg(dets.filter((e) => !e.details?.autonomous).map((e) => e.details?.reactionMs ?? 0));
  if (autoReact && rfReact && autoReact > rfReact * 1.2) {
    const lag = Math.round(((autoReact - rfReact) / rfReact) * 100);
    const adverse = session.weatherCondition !== "CLEAR";
    out.push({ title: "Slow to spot drones without RF signatures", severity: "warning",
      advice: `Trainee showed a ${lag}% lag in identifying autonomous drones lacking RF signatures${adverse ? ` under ${weather} conditions` : ""}. Recommend synthetic drills on acoustic-only detection${adverse ? " with EO/IR degraded" : ""}.` });
  }

  const missed = events.filter((e) => e.eventType === "DETECTION" && e.details?.missed).length;
  if (missed) out.push({ title: "Missed detections", severity: "warning", advice: `${missed} threats were never flagged. Rehearse a fixed scan order across RF, acoustic and EO/IR channels.` });

  const cls = events.filter((e) => e.eventType === "CLASSIFICATION");
  const clsBad = cls.filter((e) => !e.isCorrect).length;
  if (cls.length && clsBad / cls.length > 0.25) {
    out.push({ title: "Frequent misidentification", severity: "warning", advice: `${clsBad} of ${cls.length} classifications were wrong. Use the visual-profile flashcard set for FPV, recon and commercial airframes.` });
  }

  if (session.timeToDetectMs > 3500) {
    out.push({ title: "Detection time above benchmark", severity: "info", advice: `Average time-to-detect was ${(session.timeToDetectMs / 1000).toFixed(1)} s against a 2.5 s benchmark. Add short-fuse detection drills with randomised spawn bearings.` });
  }

  if (session.collateralRiskScore >= 5) {
    out.push({ title: "High collateral risk", severity: session.environmentType === "URBAN" ? "critical" : "warning",
      advice: `Collateral index reached ${session.collateralRiskScore}. In ${session.environmentType.toLowerCase()} terrain prefer non-kinetic mitigation whenever civilians are within 300 m.` });
  }

  if (!out.length) out.push({ title: "No remedial action needed", severity: "info", advice: "Performance met every benchmark. Raise scenario difficulty: swarm threats in fog or at night." });
  return out;
}
