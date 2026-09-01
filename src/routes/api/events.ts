import { createFileRoute } from "@tanstack/react-router";
import type { PullEvent } from "@/lib/events/hub";

/**
 * Server-Sent Events stream. Lightweight notifications only —
 * this connection is NOT the 15-minute BSE request.
 */
export const Route = createFileRoute("/api/events")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const hub = await import("@/lib/events/hub");
        const { log } = await import("@/lib/logger");
        const encoder = new TextEncoder();
        let cleanup = () => {};

        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const send = (event: PullEvent) => {
              try {
                controller.enqueue(encoder.encode(hub.encodeSse(event)));
              } catch {
                cleanup();
              }
            };

            const unsub = hub.subscribe(send);
            const heartbeat = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));
              } catch {
                cleanup();
              }
            }, 15_000);

            cleanup = () => {
              unsub();
              clearInterval(heartbeat);
            };

            send({
              type: "connected",
              payload: { ok: true, ts: new Date().toISOString() },
            });

            request.signal.addEventListener("abort", () => {
              cleanup();
              try {
                controller.close();
              } catch {
                /* already closed */
              }
            });
            log.info("SSE client connected");
          },
          cancel() {
            cleanup();
            log.info("SSE client disconnected");
          },
        });

        return new Response(stream, {
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache, no-transform",
            connection: "keep-alive",
            "x-accel-buffering": "no",
          },
        });
      },
    },
  },
});
