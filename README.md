# BSE Trade Ingestion & Live Dashboard

A live blotter that pulls trade data from a mock Bombay Stock Exchange API.

A full BSE pull can take **15 minutes**. The network **kills any HTTP connection held open longer than 30 seconds**. This system is built around that constraint: the browser never waits on the exchange.

## Overview

The dashboard opens immediately on trades that are already stored. Clicking **Start Pull** creates a background job and returns `202 Accepted` in milliseconds. A worker then calls Mock BSE (which can delay for 5 seconds in the demo, or 15 minutes in the assessment simulation), upserts trades, and pushes `pull.completed` over **Server-Sent Events**. The blotter updates without a refresh, without polling, and without a cron job.

## Why this architecture?

Incorrect:

```
Browser → POST /pull → backend → BSE (15 min) → response
```

That HTTP request dies at 30 seconds. The pull never finishes. The UI hangs.

Correct:

```
Browser → POST /api/pulls → job created → 202 Accepted → browser request ends

Worker → GET /getTrades (holds the slow connection) → Postgres upsert → SSE event → dashboard
```

The original browser request is already gone. SSE is a *different*, lightweight connection used only for notifications — it is not the BSE call.

## Features

- Asynchronous ingestion: `POST /api/pulls` returns `202` with a job id
- Dedicated background worker (receptionist vs processing employee)
- Mock BSE API at `GET /getTrades` with a few thousand realistic Indian-market trades
- PostgreSQL persistence with unique `tradeId` and bulk upsert
- Server-Sent Events (`GET /api/events`) — no polling loop, no cron, no scheduler
- Live dashboard: search, symbol filter, sort, pagination, stats
- Concurrent-pull policy: one in-flight job at a time (`409 Conflict`)
- Configurable delay (`BSE_DELAY_MS=5000` demo, `900000` = 15 minutes)
- Duplicate protection across overlapping pulls
- Health endpoint and job status API

## Architecture

```mermaid
flowchart LR
    Browser[React Dashboard]
    API[API Server]
    Worker[Background Worker]
    DB[(PostgreSQL)]
    BSE[Mock BSE /getTrades]
    SSE[SSE Event Stream]

    Browser -->|GET /api/trades| API
    Browser -->|POST /api/pulls 202| API
    Browser -->|GET /api/events| SSE
    API -->|create job| DB
    API -->|enqueue, do not await| Worker
    Worker -->|GET /getTrades| BSE
    Worker -->|upsert trades| DB
    Worker --> SSE
    SSE --> Browser
    API --> DB
```

Full write-up: [docs/architecture.md](docs/architecture.md). Interview answers: [docs/interview-notes.md](docs/interview-notes.md). Walkthrough: [docs/demo-script.md](docs/demo-script.md).

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, TanStack Router / Query |
| Backend | TanStack Start server routes (Node.js) |
| Database | PostgreSQL (Neon in production, PGLite embedded in preview) |
| Real-time | Server-Sent Events |
| Jobs | PostgreSQL-backed job row + in-process worker, triggered on enqueue |
| Validation | Zod |
| Styling | Tailwind CSS v4 |

**Queue honesty:** Redis + BullMQ is the production scale-up (retries, crash recovery, multiple workers). This submission uses a PostgreSQL job table and an in-process worker so the evaluator can run a single process. Jobs *are* persisted; the worker itself is not a distributed consumer. See architecture trade-offs.

## Prerequisites

- Node.js 22+
- npm 10+
- Optional: Docker, if you want a real Postgres instead of the embedded engine

## Setup

```bash
git clone <repo>
cd <repo>
cp .env.example .env   # optional; defaults already work
npm install
npm run db:migrate     # applied automatically on preview boot as well
npm run dev
```

The blotter seeds ~2,000 trades on first request. Open the app and the tape is already there.

Optional real Postgres:

```bash
docker compose up -d postgres
DATABASE_URL=postgres://trades:trades@localhost:5432/trades npm run dev
```

## Environment variables

| Variable | Default | Meaning |
| --- | --- | --- |
| `BSE_DELAY_MS` | `5000` | Mock BSE hold time. Use `900000` for the 15-minute scenario. |
| `BSE_API_URL` | `http://127.0.0.1:8080/getTrades` | Worker fetch target |
| `DATABASE_URL` | unset | Real Postgres. Unset → embedded Postgres. |
| `PORT` | `8080` | HTTP port |

Do not commit `.env`. Copy `.env.example`.

## Running

```bash
npm run dev          # API + dashboard + mock BSE + worker + SSE
npm run build        # production build
npm run typecheck
npm run lint
npm test
```

There is no separate cron process. There is no worker daemon to start. `POST /api/pulls` hands the job to the worker in-process and returns.

## API documentation

### `GET /health`

```json
{ "ok": true, "service": "bse-trade-desk", "db": "pglite", "bseDelayMs": 5000, "sseSubscribers": 1 }
```

### `GET /getTrades` (Mock BSE)

Holds the connection for `BSE_DELAY_MS`, then returns ~3,500 trades:

```json
{
  "trades": [
    {
      "tradeId": "TRD000001",
      "client": "CLIENT001",
      "symbol": "RELIANCE",
      "quantity": 100,
      "price": 1450.5,
      "timestamp": "2026-08-03T03:45:00.000Z"
    }
  ]
}
```

The dashboard never calls this endpoint. Only the worker does.

### `GET /api/trades`

Query: `page`, `pageSize` (`10|25|50`), `search`, `symbol`, `sortBy`, `sortDir`.

Returns `{ data, page, pageSize, total, stats, symbols, bySymbol }`.

### `POST /api/pulls`

`202 Accepted`

```json
{ "jobId": "c3f1…", "status": "PENDING" }
```

`409 Conflict` if a `PENDING` or `RUNNING` job already exists.

### `GET /api/pulls`

`{ active, recent }`

### `GET /api/pulls/:jobId`

Job row, or `404`.

### `GET /api/events`

SSE stream. Events: `connected`, `pull.started`, `pull.progress`, `pull.completed`, `pull.failed`. Heartbeat comments every 15s. This is **not** the BSE request.

## Demo

1. Open the dashboard. Existing trades appear immediately.
2. Note **SSE live** in the header.
3. Click **Start Pull**. The button disables; status becomes `RUNNING`. The POST already returned.
4. Search, filter, paginate — the blotter stays usable while the worker waits on Mock BSE.
5. When BSE finishes, the worker upserts and the dashboard receives `pull.completed`. New trades appear. No refresh.

Default delay is **5 seconds**. To simulate 15 minutes set `BSE_DELAY_MS=900000` and restart.

## Testing

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Unit tests cover tape generation, BSE payload validation, job state transitions, SSE encoding/fan-out, and number formatting.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Start Pull returns 409 | A pull is already in flight | Wait for COMPLETED/FAILED, or wait for stale-job recovery (`delay + 60s`) |
| SSE shows Reconnecting | Proxy or tab sleep dropped the stream | EventSource reconnects on its own; blotter refetches once on open |
| No new trades after pull | Unique `tradeId` overlap | Expected: seed is TRD000001–TRD002000, BSE is TRD000001–TRD003500. ~1,500 are new; the rest are skipped |
| Pull stays RUNNING forever | Worker process died | Next Start Pull fails stale jobs older than `BSE_DELAY_MS + 60s` |
| `/getTrades` feels slow | That **is** the mock delay | Lower `BSE_DELAY_MS` |

## Architecture decision

Asynchronous processing + SSE is the whole point of the assessment. The 30-second network limit and the 15-minute BSE pull cannot share one HTTP request. A job, a worker, persistent storage, and a push channel can.

Polling (`setInterval` asking "is it finished?") is forbidden and unnecessary. Cron is forbidden — pulls are user-triggered.

## Future improvements

Not implemented, not claimed:

- Redis + BullMQ for durable multi-process workers and retries
- Redis pub/sub so SSE works across multiple API instances
- Observability (OpenTelemetry traces, job duration histograms)
- AuthN/Z if this blotter became a real desk product
- Incremental BSE cursors instead of a full tape each pull

## Docs

- [docs/architecture.md](docs/architecture.md)
- [docs/demo-script.md](docs/demo-script.md)
- [docs/interview-notes.md](docs/interview-notes.md)
- [docs/assessment-checklist.md](docs/assessment-checklist.md)
