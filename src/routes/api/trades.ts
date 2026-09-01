import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/trades")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { z } = await import("zod");
        const { PAGE_SIZE_DEFAULT, PAGE_SIZES } = await import("@/lib/config");
        const { ensureSeeded } = await import("@/lib/trades/seed");
        const { listTrades, symbolCounts } = await import("@/lib/trades/repo");

        const querySchema = z.object({
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce
            .number()
            .int()
            .refine((n) => (PAGE_SIZES as readonly number[]).includes(n), "invalid pageSize")
            .default(PAGE_SIZE_DEFAULT),
          search: z.string().max(80).default(""),
          symbol: z.string().max(32).default(""),
          sortBy: z
            .enum(["tradeId", "client", "symbol", "quantity", "price", "timestamp"])
            .default("timestamp"),
          sortDir: z.enum(["asc", "desc"]).default("desc"),
        });

        try {
          await ensureSeeded();
          const url = new URL(request.url);
          const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
          if (!parsed.success) {
            return Response.json(
              { error: "Invalid query", details: parsed.error.issues.map((i) => i.message) },
              { status: 400 },
            );
          }
          const [result, bySymbol] = await Promise.all([
            listTrades(parsed.data),
            symbolCounts(),
          ]);
          return Response.json({ ...result, bySymbol });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to load trades";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
