import { createFileRoute } from "@tanstack/react-router";

/**
 * Mock BSE Exchange API.
 * Holds the HTTP connection for BSE_DELAY_MS (default 5s, 900000 = 15 min).
 * The dashboard never calls this. Only the background worker does.
 */
export const Route = createFileRoute("/getTrades")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { BSE_TRADE_COUNT, getBseDelayMs } = await import("@/lib/config");
        const { generateTrades } = await import("@/lib/bse/generate");
        const { log } = await import("@/lib/logger");

        const url = new URL(request.url);
        const limitRaw = url.searchParams.get("limit");
        const limit = limitRaw ? Number(limitRaw) : BSE_TRADE_COUNT;
        const count =
          Number.isFinite(limit) && limit > 0
            ? Math.min(Math.floor(limit), 8_000)
            : BSE_TRADE_COUNT;

        const delayMs = getBseDelayMs();
        log.info("mock BSE /getTrades accepted", { delayMs, count });
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        const trades = generateTrades(count, 1);
        log.info("mock BSE /getTrades responding", { count: trades.length, delayMs });
        return Response.json({ trades }, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
