# Interview notes

## Q1: Why not keep the HTTP request open?

Because the network terminates HTTP connections after 30 seconds, while the BSE operation can take 15 minutes. A synchronous `Browser → API → BSE → response` path will be killed. The user sees a timeout; the work is lost.

## Q2: How did you solve it?

Asynchronous job processing. `POST /api/pulls` inserts a `PENDING` row, enqueues the worker, and returns `202 Accepted { jobId, status }` immediately. The worker then performs the long BSE HTTP call, independent of the original request.

## Q3: How does the frontend know the pull completed?

Server-Sent Events. The dashboard opens `GET /api/events` once. After persistence the worker publishes `pull.completed`. The client listens for that named event and refetches the blotter. The SSE connection is not the BSE connection.

## Q4: Why not polling?

Polling is explicitly prohibited and creates a stream of "is it finished?" requests. It is slower to notice completion, harder on the API, and hides the fact that the server already knows. SSE is a push.

We also do not use `refetchInterval`, `setInterval`, or a timeout that pretends the pull finished. The only timers are (a) Mock BSE's configured delay — that **is** the work — and (b) an SSE keepalive comment so proxies do not drop the stream.

## Q5: Why SSE instead of WebSockets?

The communication requirement is server→browser notification: started, progress, completed, failed. SSE is one-way, uses ordinary HTTP, and reconnects natively. WebSockets are bidirectional and more moving parts. They would work; they are not a better fit.

## Q6: Why PostgreSQL?

Trades are structured relational data. We need persistence across requests, a unique constraint on `trade_id`, numeric price/quantity, timestamps, indexes for dashboard filters, and a job table with checked status values. That is a relational workload.

## Q7: What happens if the worker fails?

The job is marked `FAILED`, an error message is stored (not a stack trace), and `pull.failed` is published.

If the **process** crashes mid-fetch, the row can remain `RUNNING`. There is no BullMQ stalled-job recovery here. On the next Start Pull we fail jobs older than `BSE_DELAY_MS + 60s` and then accept a new one. That is on-demand healing, not a cron.

This is the honest limitation of an in-process worker. Redis + BullMQ would persist the queue, restart consumers, and retry with backoff.

## Q8: What happens if the same trade appears twice?

`trades.trade_id` is unique. Inserts use `ON CONFLICT (trade_id) DO NOTHING`. Pull 2 that repeats TRD002/TRD003 does not create a second row. The job reports `recordsFetched`, `recordsInserted`, and `recordsDuplicate`.

The seed generator and the BSE generator share indices, so the overlap is real, not cosmetic.

## Q9: How would you scale this?

- **Workers:** Redis + BullMQ, N consumers, retry/backoff, isolated process so API deploys do not kill in-flight fetches
- **API:** stateless horizontal scale
- **SSE:** Redis pub/sub (or a dedicated gateway) so events cross processes
- **Database:** the existing unique index and `(symbol, traded_at)` lookups; partitioning by month if the tape grows huge
- **Observability:** structured logs already carry `jobId` / counts / duration; add traces and a queue-depth metric
- **BSE:** cursor/incremental pulls so we are not fetching 15 minutes of full tape forever

## Q10: Why block a second concurrent pull?

Overlapping upserts make "inserted vs duplicate" accounting racey, and one BSE pull already saturates the assessment scenario. A partial unique index on in-flight jobs plus a 409 response makes the policy visible and safe. If product needed concurrency, we would shard by date range and still upsert by `trade_id`.

## Q11: Why is the mock a real HTTP endpoint?

So the worker actually performs an external call. `GET /getTrades` sleeps `BSE_DELAY_MS` and returns JSON. The dashboard does not call it. If loopback is unavailable (some serverless hosts), the worker falls back to the same generator **with the same delay** — still a long-running job, still not a fake UI timer.

## Q12: How do you validate external data?

Zod schema: required fields, positive integer quantity, positive finite price, ISO-8601 timestamp, bounded array. Invalid payloads fail the job before upsert.
