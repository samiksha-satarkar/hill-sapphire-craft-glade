# Assessment checklist

| Requirement                    | Implementation | Verified |
| ------------------------------ | -------------- | -------- |
| Mock BSE API                   | `GET /getTrades` in `src/routes/getTrades.ts` | pending |
| GET /getTrades                 | Holds `BSE_DELAY_MS`, returns `{ trades }` | pending |
| Few thousand records           | 3,500 generated; 2,000 seeded | pending |
| Trade ID                       | `TRD000001` form | pending |
| Client                         | `CLIENT001`–`CLIENT048` | pending |
| Symbol                         | RELIANCE, TCS, INFY, HDFCBANK, … | pending |
| Quantity                       | Positive lot sizes | pending |
| Price                          | `numeric(12,2)` | pending |
| Timestamp                      | timestamptz / ISO-8601 | pending |
| Configurable delay             | `BSE_DELAY_MS` default 5000 | pending |
| 15-minute scenario             | `BSE_DELAY_MS=900000` documented | pending |
| Dashboard                      | `src/routes/index.tsx` blotter | pending |
| Existing trades visible        | Auto-seed on first `/api/trades` | pending |
| Dashboard remains usable       | Search/filter/page during RUNNING | pending |
| Async pull                     | `POST /api/pulls` → 202 | pending |
| Background worker              | `enqueuePull` / `processPull` | pending |
| 30-second limitation solved    | Browser request does not wait on BSE | pending |
| Automatic updates              | SSE `pull.completed` → query invalidate | pending |
| No refresh                     | EventSource + TanStack Query | pending |
| No polling                     | No `setInterval` / `refetchInterval` for jobs | pending |
| No cron                        | User-triggered only; stale heal on POST | pending |
| PostgreSQL persistence         | `migrations/0002_trades.sql` | pending |
| Duplicate protection           | Unique `trade_id` + `ON CONFLICT DO NOTHING` | pending |
| Error handling                 | FAILED job + SSE + 409/4xx/5xx | pending |
| README                         | `/README.md` | pending |
| Setup instructions             | README Setup / Running | pending |
| Architecture diagram           | `docs/architecture.md` mermaid | pending |
| Architecture explanation       | same | pending |
| Tests                          | `npm test` generator, schema, jobs, SSE | pending |
| Video walkthrough instructions | `docs/demo-script.md` | pending |

Verified column is filled only after the corresponding scenario actually runs.
