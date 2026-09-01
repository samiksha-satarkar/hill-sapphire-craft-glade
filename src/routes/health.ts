import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/health")({
  server: {
    handlers: {
      GET: async () => {
        const { dbSource } = await import("@/lib/db");
        const { getBseDelayMs } = await import("@/lib/config");
        const { subscriberCount } = await import("@/lib/events/hub");
        return Response.json({
          ok: true,
          service: "bse-trade-desk",
          db: dbSource,
          bseDelayMs: getBseDelayMs(),
          sseSubscribers: subscriberCount(),
        });
      },
    },
  },
});
