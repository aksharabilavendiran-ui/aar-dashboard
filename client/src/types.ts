export type Grade = "S" | "A" | "B" | "C" | "FAIL";

export interface AarEvent {
  id: string; t: number; eventType: "DETECTION" | "CLASSIFICATION" | "ENGAGEMENT";
  targetType: string; chosenAction: string; isCorrect: boolean; scoreDelta: number; rule: string;
  whyWrong: string | null; optimalActions: string[]; reactionMs: number; autonomous: boolean; collateralRisk: number; critical: boolean;
}
export interface Advice { title: string; severity: "critical" | "warning" | "info"; advice: string }
export interface Aar {
  session: {
    id: string; scenarioName: string; environmentType: string; weatherCondition: string; threatType: string; startTime: string;
    totalScore: number; timeToDetectMs: number; classificationAcc: number; mitigationAccuracy: number; collateralRiskScore: number;
    trainee: { name: string; rank: string; unit: string; serviceId: string };
  };
  grade: Grade;
  benchmark: { ttdMs: number; classificationAcc: number; mitigationAccuracy: number; collateralRiskScore: number };
  telemetry: { t: number; droneCount: number; stressIndex: number }[];
  events: AarEvent[];
  mistakes: AarEvent[];
  remediation: Advice[];
}
export interface TraineeRow { id: string; serviceId: string; name: string; rank: string; unit: string; sessionCount: number; avgScore: number; avgTtdMs: number; avgMitigation: number }
export interface SessionRow { id: string; scenarioName: string; environmentType: string; weatherCondition: string; threatType: string; startTime: string; totalScore: number; trainee: { name: string; rank: string } }
