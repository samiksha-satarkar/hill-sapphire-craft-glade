# Demo script (3–5 minutes)

Record this as the video walkthrough. Speak to the constraint first, then prove it in the UI.

## 0:00–0:30 — The problem

> We ingest BSE trades. A full pull can take 15 minutes. Our network kills HTTP connections after 30 seconds. If the dashboard called BSE on the request path, the connection would die and the UI would hang. That architecture is invalid.

Show, if useful, the incorrect sequence on a whiteboard / architecture panel:

`Browser → POST /pull → BSE 15 min → response` — this is what we did **not** build.

## 0:30–1:00 — Architecture

Open the **Why this shape** card on the dashboard.

> Receptionist and employee. `POST /api/pulls` inserts a job and returns 202 immediately. The worker, not the tab, calls Mock BSE. When persistence finishes, we push `pull.completed` on SSE. SSE is a notification channel. It is not the 15-minute HTTP call.

Point at: `POST /api/pulls` → job → worker → BSE → Postgres → SSE.

## 1:00–2:00 — Existing trades

Reload the dashboard.

- Header reads **SSE live**
- Stats show ~2,000 seeded trades, quantity, average price, clients, symbols
- Blotter is filled. Scroll, change page, search `RELIANCE`, sort by price

> The app opened on data that was already pulled. Nobody waited on BSE to see a tape.

## 2:00–2:30 — Start pull

Click **Start Pull**.

Call out immediately:

- Button goes to **Pulling** / disabled
- Status: **RUNNING**, a job id, phase **Calling Mock BSE**
- Network panel (if shown): `POST /api/pulls` is **202** and already finished
- There is **no** long-running `GET /getTrades` from the browser

> The receptionist already hung up. The worker is the one waiting.

## 2:30–3:00 — Dashboard stays responsive

While status is RUNNING:

- Type in search
- Change symbol filter
- Paginate
- Click a sort header

> The blotter is not blocked. That is the product requirement.

## 3:00–3:30 — Worker / API

If logs are visible:

```
pull job created
pull job started
BSE request started
```

Optional: a second tab on the same dashboard also shows RUNNING — SSE fans out.

Clicking Start Pull again returns **409** — one in-flight pull.

## 3:30–4:00 — Completion

When Mock BSE returns (5 seconds in the demo):

- Status: **COMPLETED**
- Records: new vs fetched, duplicates skipped
- Stats tick up (unique trades move from 2,000 toward 3,500)
- New ids such as `TRD002001` appear

> Those ~1,500 new rows are the non-overlapping tail of the BSE tape. The first 2,000 ids already existed; the unique constraint dropped them.

## 4:00–4:30 — SSE-driven update

Network panel: `GET /api/events` is the open stream. You should see `pull.completed` — **not** a timer in the frontend, **not** `setInterval`.

> The UI did not poll. It was told.

## 4:30–5:00 — Why this solves the 30-second limit

> If we set `BSE_DELAY_MS=900000`, Mock BSE holds for 15 minutes. The browser still got 202 in milliseconds. The worker holds the slow connection. The network can kill idle *browser* HTTP; it does not kill the independent worker. That is the system-design decision this project exists to demonstrate.

Close on the three nos: no refresh, no polling, no cron.
