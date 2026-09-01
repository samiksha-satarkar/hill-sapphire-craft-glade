import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/pulls/$jobId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { getJob } = await import("@/lib/jobs/repo");
        try {
          const job = await getJob(params.jobId);
          if (!job) {
            return Response.json({ error: "Job not found" }, { status: 404 });
          }
          return Response.json(job);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to load job";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
