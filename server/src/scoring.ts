export type EventType = "DETECTION" | "CLASSIFICATION" | "ENGAGEMENT";
export type TargetType = "HOSTILE_FPV" | "FRIENDLY_RECON" | "CIVILIAN_COMMERCIAL";
export type Action = "RF_JAM" | "KINETIC_FIRE" | "NET_INTERCEPT" | "GPS_SPOOF" | "NONE";

export interface ScoringInput {
  eventType: EventType;
  targetType: TargetType;
  chosenAction: Action;
  /** ms between the threat appearing and this player action */
  reactionMs: number;
  /** true when the drone has no RF control link (fibre-optic / pre-programmed) */
  autonomous?: boolean;
  /** detection events: the player never noticed the target */
  missed?: boolean;
  /** classification events: what the player labelled the target */
  classifiedAs?: TargetType;
  civilianProximityM?: number;
}

export interface ScoringResult {
  isCorrect: boolean;
  scoreDelta: number;
  penaltyPoints: number;
  rule: string;
  whyWrong?: string;
  optimalActions: Action[];
  collateralRisk: number;
}

export const FAST_MS = 3000;
export const SLOW_MS = 8000;

export function optimalActionsFor(autonomous: boolean): Action[] {
  // Autonomous drones ignore RF jamming and GPS spoofing: use a hard kill or a net.
  return autonomous ? ["NET_INTERCEPT", "KINETIC_FIRE"] : ["RF_JAM", "GPS_SPOOF"];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const pretty = (s: string) => s.toLowerCase().replace(/_/g, " ");

export function collateralFor(action: Action, proximityM = 1000): number {
  const base = Math.max(0, Math.min(10, 10 - proximityM / 40));
  if (action === "KINETIC_FIRE") return round1(base);
  if (action === "NONE") return 0;
  return round1(base * 0.3);
}

/** Decision tree that turns one player decision into a score change. */
export function scoreEvent(i: ScoringInput): ScoringResult {
  const autonomous = !!i.autonomous;
  const optimal = optimalActionsFor(autonomous);
  const collateralRisk = collateralFor(i.chosenAction, i.civilianProximityM);
  const base = { optimalActions: optimal, collateralRisk };

  if (i.eventType === "DETECTION") {
    if (i.missed) {
      return { ...base, isCorrect: false, scoreDelta: -100, penaltyPoints: 100, rule: "Missed detection",
        whyWrong: `The ${pretty(i.targetType)} was never flagged. Check every sensor channel (RF, acoustic, EO/IR) during a scan, not just the one that is easiest to read.` };
    }
    const fast = i.reactionMs < FAST_MS;
    return { ...base, isCorrect: true, scoreDelta: fast ? 25 : 10, penaltyPoints: 0, rule: fast ? "Fast detection" : "Slow detection" };
  }

  if (i.eventType === "CLASSIFICATION") {
    if (i.classifiedAs === i.targetType) {
      return { ...base, isCorrect: true, scoreDelta: 50, penaltyPoints: 0, rule: "Correct classification" };
    }
    return { ...base, isCorrect: false, scoreDelta: -100, penaltyPoints: 100, rule: "Misidentification",
      whyWrong: `The target was a ${pretty(i.targetType)} but it was labelled ${pretty(i.classifiedAs ?? "unknown")}. Compare flight pattern, RF signature and visual profile before committing to a label.` };
  }

  // ENGAGEMENT
  if (i.targetType !== "HOSTILE_FPV") {
    return { ...base, isCorrect: false, scoreDelta: -500, penaltyPoints: 500, rule: "Friendly or civilian engaged (critical failure)",
      whyWrong: `A ${pretty(i.targetType)} was engaged with ${pretty(i.chosenAction)}. Engaging a non-hostile aircraft is a critical rules-of-engagement failure. Confirm identity before any mitigation.` };
  }
  if (!optimal.includes(i.chosenAction)) {
    const why = autonomous
      ? `This drone had no RF control link, so ${pretty(i.chosenAction)} had no effect. Autonomous drones need a net intercept or a kinetic hard kill.`
      : `This drone was RF-controlled. ${pretty(i.chosenAction)} was the wrong tool for it. RF jamming or GPS spoofing would have worked without the collateral risk.`;
    return { ...base, isCorrect: false, scoreDelta: -150, penaltyPoints: 150, rule: "Incorrect mitigation", whyWrong: why };
  }
  if (i.reactionMs < FAST_MS) return { ...base, isCorrect: true, scoreDelta: 250, penaltyPoints: 0, rule: "Optimal mitigation under 3 s" };
  if (i.reactionMs > SLOW_MS) return { ...base, isCorrect: true, scoreDelta: 50, penaltyPoints: 0, rule: "Delayed mitigation over 8 s" };
  return { ...base, isCorrect: true, scoreDelta: 150, penaltyPoints: 0, rule: "Correct mitigation" };
}
