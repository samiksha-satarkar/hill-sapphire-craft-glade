import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/pulls")({
  server: {
    handlers: {
      GET: async () => {
        const { getActiveJob, listRecentJobs } = await import("@/lib/jobs/repo");
        const { ensureSeeded } = await import("@/lib/trades/seed");
        try {
          await ensureSeeded();
          const [active, recent] = await Promise.all([getActiveJob(), listRecentJobs(8)]);
          return Response.json({ active, recent });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to list pulls";
          return Response.json({ error: message }, { status: 500 });
        }
      },
      POST: async () => {
        const { failStaleJobs, getActiveJob, insertPendingJob } = await import("@/lib/jobs/repo");
        const { enqueuePull } = await import("@/lib/jobs/worker");
        const { log } = await import("@/lib/logger");
        const { ensureSeeded } = await import("@/lib/trades/seed");
        try {
          await ensureSeeded();
          await failStaleJobs();

          const active = await getActiveJob();
          if (active) {
            return Response.json(
              {
                error: "A pull is already in progress",
                jobId: active.id,
                status: active.status,
              },
              { status: 409 },
            );
          }

          const jobId = crypto.randomUUID();
          const job = await insertPendingJob(jobId);
          log.info("pull job created", { jobId, status: job.status });
          enqueuePull(jobId);

          return Response.json(
            { jobId: job.id, status: job.status },
            { status: 202, headers: { "cache-control": "no-store" } },
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to start pull";
          const conflict = /unique|duplicate key|pull_jobs_one_active/i.test(message);
          if (conflict) {
            const { getActiveJob } = await import("@/lib/jobs/repo");
            const active = await getActiveJob();
            return Response.json(
              {
                error: "A pull is already in progress",
                jobId: active?.id ?? null,
                status: active?.status ?? "RUNNING",
              },
              { status: 409 },
            );
          }
          log.error("failed to create pull", { error: message });
          return Response.json({ error: "Failed to start pull" }, { status: 500 });
        }
      },
    },
  },
});
