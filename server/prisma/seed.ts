import { PrismaClient, Prisma } from "@prisma/client";
import { scoreEvent, optimalActionsFor, Action, TargetType } from "../src/scoring";
import { computeMetrics } from "../src/metrics";

const prisma = new PrismaClient();
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
const J = (v: unknown) => v as Prisma.InputJsonValue;

const trainees = [
  ["Capt.", "Arjun Mehta", "Para SF"], ["Maj.", "Kavita Rao", "Air Defence"], ["Lt.", "Ravi Nair", "Signals"], ["Capt.", "Sana Qureshi", "Armoured"],
  ["Lt.", "Vikram Singh", "Infantry"], ["Maj.", "Anita Desai", "Air Defence"], ["Capt.", "Tarun Bose", "Engineers"], ["Lt.", "Meera Iyer", "Signals"],
  ["Sub.", "Harpreet Gill", "Infantry"], ["Capt.", "Dev Malhotra", "Para SF"],
];

const scenarios = [
  { name: "Urban High-Rise", env: "URBAN", w: ["CLEAR", "NIGHT", "HEAVY_RAIN"] },
  { name: "Desert Outpost", env: "DESERT", w: ["CLEAR", "NIGHT"] },
  { name: "Foggy Forest", env: "RURAL", w: ["FOG", "HEAVY_RAIN"] },
];
const threats = ["SINGLE_RECON", "FPV_KAMIKAZE", "SWARM"];

async function main() {
  await prisma.telemetry.deleteMany(); await prisma.eventLog.deleteMany();
  await prisma.session.deleteMany(); await prisma.trainee.deleteMany();

  const rows = [] as { id: string; skill: number }[];
  for (let i = 0; i < trainees.length; i++) {
    const [rank, name, unit] = trainees[i];
    const t = await prisma.trainee.create({ data: { serviceId: `IN-${40100 + i * 7}`, rank, name, unit } });
    rows.push({ id: t.id, skill: rnd(0.45, 0.9) });
  }

  for (let n = 0; n < 50; n++) {
    const tr = rows[n % rows.length];
    const sc = pick(scenarios); const weather = pick(sc.w); const threat = pick(threats);
    const progress = Math.floor(n / rows.length) / 5; // later sessions are a bit better
    const skill = Math.min(0.97, tr.skill + progress * 0.08);
    const adverse = weather !== "CLEAR" ? 0.12 : 0;
    const duration = 180_000;
    const targets = threat === "SWARM" ? 6 : threat === "FPV_KAMIKAZE" ? 4 : 3;

    const session = await prisma.session.create({
      data: {
        traineeId: tr.id, scenarioName: sc.name, environmentType: sc.env, weatherCondition: weather, threatType: threat,
        startTime: new Date(Date.now() - (50 - n) * 86_400_000 * 0.9), endTime: new Date(),
      },
    });

    const events: Prisma.EventLogCreateManyInput[] = [];
    let total = 0;
    for (let k = 0; k < targets; k++) {
      const roll = Math.random();
      const targetType: TargetType = roll < 0.7 ? "HOSTILE_FPV" : roll < 0.85 ? "FRIENDLY_RECON" : "CIVILIAN_COMMERCIAL";
      const autonomous = targetType === "HOSTILE_FPV" && Math.random() < 0.4;
      const spawn = 8_000 + (k * (duration - 40_000)) / targets + rnd(0, 6000);
      const prox = sc.env === "URBAN" ? rnd(60, 400) : rnd(200, 1500);
      let t = spawn;
      const push = (eventType: "DETECTION" | "CLASSIFICATION" | "ENGAGEMENT", chosen: Action, reactionMs: number, extra: any = {}) => {
        const r = scoreEvent({ eventType, targetType, chosenAction: chosen, reactionMs, autonomous, civilianProximityM: prox, ...extra });
        total += r.scoreDelta;
        events.push({
          sessionId: session.id, timestampMs: Math.round(t), eventType, targetType, chosenAction: chosen, isCorrect: r.isCorrect, penaltyPoints: r.penaltyPoints,
          details: J({ scoreDelta: r.scoreDelta, rule: r.rule, whyWrong: r.whyWrong ?? null, optimalActions: r.optimalActions, collateralRisk: r.collateralRisk,
            reactionMs: Math.round(reactionMs), autonomous, missed: !!extra.missed, classifiedAs: extra.classifiedAs ?? null, civilianProximityM: Math.round(prox), targetId: `T-${k + 1}` }),
        });
      };

      // Detection: slower for autonomous drones (no RF signature), slower still in bad weather.
      const base = 1800 + (1 - skill) * 4500 + (autonomous ? 1400 + adverse * 4000 : 0) + adverse * 1500;
      if (Math.random() < (1 - skill) * 0.12 + adverse * 0.05) { push("DETECTION", "NONE", 0, { missed: true }); continue; }
      const detMs = base * rnd(0.8, 1.25); t = spawn + detMs;
      push("DETECTION", "NONE", detMs);

      const clsOk = Math.random() < skill - adverse * 0.3;
      const wrongLabel = pick((["HOSTILE_FPV", "FRIENDLY_RECON", "CIVILIAN_COMMERCIAL"] as TargetType[]).filter((x) => x !== targetType));
      t += rnd(600, 1800);
      push("CLASSIFICATION", "NONE", t - spawn, { classifiedAs: clsOk ? targetType : wrongLabel });

      // Engagement: friendly engaged mostly after a misclassification.
      const engageIt = targetType === "HOSTILE_FPV" || (!clsOk && Math.random() < 0.55);
      if (!engageIt) continue;
      const optimal = optimalActionsFor(autonomous);
      const wrong = (["RF_JAM", "KINETIC_FIRE", "NET_INTERCEPT", "GPS_SPOOF"] as Action[]).filter((a) => !optimal.includes(a));
      const mitOk = Math.random() < skill - adverse * 0.2;
      t += rnd(900, 3500) + (1 - skill) * 6000 * Math.random();
      push("ENGAGEMENT", mitOk || targetType !== "HOSTILE_FPV" ? pick(optimal) : pick(wrong), t - spawn);
    }
    events.sort((a, b) => a.timestampMs - b.timestampMs);

    const tel: Prisma.TelemetryCreateManyInput[] = [];
    for (let ms = 0; ms <= duration; ms += 5000) {
      const active = events.filter((e) => e.timestampMs <= ms).length;
      const droneCount = Math.max(0, Math.round(targets * Math.sin((ms / duration) * Math.PI) * rnd(0.8, 1.4) + (threat === "SWARM" ? 2 : 0)));
      const recentErr = events.filter((e) => !e.isCorrect && e.timestampMs <= ms && ms - e.timestampMs < 15_000).length;
      const stress = Math.max(0, Math.min(1, 0.15 + droneCount * 0.08 + recentErr * 0.18 + adverse + rnd(-0.05, 0.05) + active * 0.005));
      tel.push({ sessionId: session.id, timestampMs: ms, droneCount, stressIndex: Math.round(stress * 100) / 100, rawMetrics: J({ rf: rnd(0.3, 1), acoustic: rnd(0.3, 1), eoir: rnd(0.2, 1) - adverse }) });
    }

    const m = computeMetrics(events as any);
    await prisma.eventLog.createMany({ data: events });
    await prisma.telemetry.createMany({ data: tel });
    await prisma.session.update({ where: { id: session.id }, data: { ...m, totalScore: total } });
  }
  console.log("Seeded 10 trainees and 50 sessions");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
