import { Router } from "express";
import { z } from "zod";
import { prisma } from "./db";
import { scoreEvent } from "./scoring";
import { computeMetrics, gradeFor } from "./metrics";
import { buildRemediation } from "./remediation";
import { broadcast } from "./websocket";

export const router = Router();
const wrap = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res)).catch(next);

const target = z.enum(["HOSTILE_FPV", "FRIENDLY_RECON", "CIVILIAN_COMMERCIAL"]);
const action = z.enum(["RF_JAM", "KINETIC_FIRE", "NET_INTERCEPT", "GPS_SPOOF", "NONE"]);

const eventSchema = z.object({
  sessionId: z.string(),
  timestampMs: z.number().int().nonnegative(),
  eventType: z.enum(["DETECTION", "CLASSIFICATION", "ENGAGEMENT"]),
  targetType: target,
  chosenAction: action.default("NONE"),
  reactionMs: z.number().nonnegative(),
  autonomous: z.boolean().optional(),
  missed: z.boolean().optional(),
  classifiedAs: target.optional(),
  civilianProximityM: z.number().optional(),
  targetId: z.string().optional(),
});

// ---- Telemetry ingestion (Unity / Unreal) -------------------------------------------------
router.post("/telemetry/event", wrap(async (req: any, res: any) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const e = parsed.data;

  const session = await prisma.session.findUnique({ where: { id: e.sessionId } });
  if (!session) return res.status(404).json({ error: "Unknown sessionId" });

  const result = scoreEvent(e);
  const saved = await prisma.$transaction(async (tx) => {
    const row = await tx.eventLog.create({
      data: {
        sessionId: e.sessionId, timestampMs: e.timestampMs, eventType: e.eventType, targetType: e.targetType,
        chosenAction: e.chosenAction, isCorrect: result.isCorrect, penaltyPoints: result.penaltyPoints,
        details: {
          scoreDelta: result.scoreDelta, rule: result.rule, whyWrong: result.whyWrong ?? null,
          optimalActions: result.optimalActions, collateralRisk: result.collateralRisk,
          reactionMs: e.reactionMs, autonomous: !!e.autonomous, missed: !!e.missed,
          classifiedAs: e.classifiedAs ?? null, civilianProximityM: e.civilianProximityM ?? null, targetId: e.targetId ?? null,
        },
      },
    });
    const s = await tx.session.update({ where: { id: e.sessionId }, data: { totalScore: { increment: result.scoreDelta } } });
    return { row, totalScore: s.totalScore };
  });

  broadcast({ type: "event", payload: { ...saved.row, scoreDelta: result.scoreDelta, rule: result.rule, totalScore: saved.totalScore } });
  res.status(201).json({ eventId: saved.row.id, ...result, totalScore: saved.totalScore });
}));

// Raw frame from the simulator: stored for the timeline and relayed to live clients.
const frameSchema = z.object({
  sessionId: z.string(),
  timestampMs: z.number().int().nonnegative(),
  droneCount: z.number().int().nonnegative(),
  stressIndex: z.number().min(0).max(1),
  drones: z.array(z.any()).default([]),
  sensors: z.any().optional(),
  threatCount: z.number().optional(),
});
router.post("/telemetry/frame", wrap(async (req: any, res: any) => {
  const p = frameSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const f = p.data;
  await prisma.telemetry.create({
    data: { sessionId: f.sessionId, timestampMs: f.timestampMs, droneCount: f.droneCount, stressIndex: f.stressIndex, rawMetrics: { drones: f.drones, sensors: f.sensors ?? null } },
  });
  broadcast({ type: "frame", payload: { ...f, threatCount: f.threatCount ?? f.droneCount } });
  res.status(201).json({ ok: true });
}));

// ---- Sessions -----------------------------------------------------------------------------
const sessionSchema = z.object({
  traineeId: z.string(),
  scenarioName: z.string().min(1),
  environmentType: z.enum(["URBAN", "RURAL", "DESERT"]),
  weatherCondition: z.enum(["CLEAR", "HEAVY_RAIN", "FOG", "NIGHT"]),
  threatType: z.enum(["SINGLE_RECON", "FPV_KAMIKAZE", "SWARM"]),
});
router.post("/sessions", wrap(async (req: any, res: any) => {
  const p = sessionSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  res.status(201).json(await prisma.session.create({ data: p.data }));
}));

router.get("/sessions", wrap(async (_req: any, res: any) => {
  const rows = await prisma.session.findMany({ orderBy: { startTime: "desc" }, take: 50, include: { trainee: true } });
  res.json(rows);
}));

router.post("/sessions/:id/finish", wrap(async (req: any, res: any) => {
  const events = await prisma.eventLog.findMany({ where: { sessionId: req.params.id } });
  const m = computeMetrics(events as any);
  res.json(await prisma.session.update({ where: { id: req.params.id }, data: { ...m, endTime: new Date() } }));
}));

// ---- Analytics ----------------------------------------------------------------------------
router.get("/trainees", wrap(async (_req: any, res: any) => {
  const trainees = await prisma.trainee.findMany({ include: { sessions: true }, orderBy: { name: "asc" } });
  res.json(trainees.map((t) => {
    const n = t.sessions.length;
    const avg = (k: "totalScore" | "timeToDetectMs" | "mitigationAccuracy") => (n ? Math.round(t.sessions.reduce((s, x) => s + x[k], 0) / n) : 0);
    return { id: t.id, serviceId: t.serviceId, name: t.name, rank: t.rank, unit: t.unit, sessionCount: n, avgScore: avg("totalScore"), avgTtdMs: avg("timeToDetectMs"), avgMitigation: avg("mitigationAccuracy") };
  }));
}));

router.get("/trainees/:id/stats", wrap(async (req: any, res: any) => {
  const t = await prisma.trainee.findUnique({ where: { id: req.params.id }, include: { sessions: { orderBy: { startTime: "asc" } } } });
  if (!t) return res.status(404).json({ error: "Trainee not found" });
  const s = t.sessions;
  const mean = (f: (x: (typeof s)[number]) => number) => (s.length ? Math.round((s.reduce((a, x) => a + f(x), 0) / s.length) * 10) / 10 : 0);
  res.json({
    trainee: { id: t.id, serviceId: t.serviceId, name: t.name, rank: t.rank, unit: t.unit },
    totals: { sessions: s.length, totalScore: s.reduce((a, x) => a + x.totalScore, 0), avgScore: mean((x) => x.totalScore), avgTtdMs: mean((x) => x.timeToDetectMs) },
    accuracyOverTime: s.map((x) => ({
      sessionId: x.id, date: x.startTime, scenarioName: x.scenarioName, environmentType: x.environmentType, weatherCondition: x.weatherCondition,
      totalScore: x.totalScore, timeToDetectMs: x.timeToDetectMs, classificationAcc: x.classificationAcc, mitigationAccuracy: x.mitigationAccuracy,
      collateralRiskScore: x.collateralRiskScore, grade: gradeFor(x),
    })),
  });
}));

router.get("/sessions/:id/aar", wrap(async (req: any, res: any) => {
  const s = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: { trainee: true, events: { orderBy: { timestampMs: "asc" } }, telemetryLogs: { orderBy: { timestampMs: "asc" } } },
  });
  if (!s) return res.status(404).json({ error: "Session not found" });

  const events = s.events.map((e) => {
    const d = (e.details ?? {}) as any;
    return {
      id: e.id, t: e.timestampMs / 1000, eventType: e.eventType, targetType: e.targetType, chosenAction: e.chosenAction,
      isCorrect: e.isCorrect, scoreDelta: d.scoreDelta ?? 0, rule: d.rule ?? "", whyWrong: d.whyWrong ?? null,
      optimalActions: d.optimalActions ?? [], reactionMs: d.reactionMs ?? 0, autonomous: !!d.autonomous, collateralRisk: d.collateralRisk ?? 0,
      critical: e.eventType === "ENGAGEMENT" && e.targetType !== "HOSTILE_FPV",
    };
  });
  const { telemetryLogs, events: _ev, ...session } = s;
  res.json({
    session,
    grade: gradeFor(s),
    benchmark: { ttdMs: 2500, classificationAcc: 90, mitigationAccuracy: 85, collateralRiskScore: 3 },
    telemetry: telemetryLogs.map((x) => ({ t: x.timestampMs / 1000, droneCount: x.droneCount, stressIndex: x.stressIndex })),
    events,
    mistakes: events.filter((e) => !e.isCorrect),
    remediation: buildRemediation(s, s.events as any),
  });
}));
