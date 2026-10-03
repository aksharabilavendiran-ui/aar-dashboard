# AAR Dashboard: AI-enabled drone and counter-drone trainer (SIH26247)

Full-stack after-action review dashboard. React + Vite + Tailwind + Recharts on the front, Express + ws + Prisma + PostgreSQL on the back.

## Run it

```bash
docker compose up -d                 # PostgreSQL on :5432 (or point DATABASE_URL at your own)

cd server
npm install
npx prisma db push                   # create tables
npm run db:seed                      # 10 trainees, 50 sessions
npm run dev                          # API :5001, WS ws://localhost:5001/live-telemetry

cd ../client
npm install
npm run dev                          # http://localhost:5173
```

Set `SIM_LIVE=false` in `server/.env` to stop the built-in synthetic drone feed once a real Unity/Unreal client streams to the server.

## API

| Method | Route                         | Purpose                                                         |
| ------ | ----------------------------- | --------------------------------------------------------------- |
| POST   | `/api/v1/telemetry/event`     | Score one decision, store it, broadcast it                      |
| POST   | `/api/v1/telemetry/frame`     | Store a telemetry frame (drone count, stress) and relay it live |
| POST   | `/api/v1/sessions`            | Create a session (Scenario builder uses this)                   |
| POST   | `/api/v1/sessions/:id/finish` | Recompute session metrics and set the end time                  |
| GET    | `/api/v1/sessions`            | Recent sessions                                                 |
| GET    | `/api/v1/trainees`            | Roster with averages                                            |
| GET    | `/api/v1/trainees/:id/stats`  | Aggregates and per-session accuracy over time                   |
| GET    | `/api/v1/sessions/:id/aar`    | Timeline, mistakes, grade, remediation                          |

## Scoring decision tree (`server/src/scoring.ts`)

From the brief: friendly or civilian engaged -500; incorrect mitigation -150; optimal mitigation under 3 s +250; delayed (over 8 s) +50.

Assumptions I added where the brief was silent: correct mitigation between 3 and 8 s +150; fast detection +25, slow +10, missed -100; correct classification +50, misidentification -100. "Optimal" means RF jam or GPS spoof for RF-controlled drones, and net intercept or kinetic fire for autonomous drones. Grade thresholds are in `server/src/metrics.ts`. All of these are constants you can tune.
# aar-dashboard
