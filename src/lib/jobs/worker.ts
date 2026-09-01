import { BSE_TRADE_COUNT, getBseApiUrl, getBseDelayMs } from "@/lib/config";
import { generateTrades } from "@/lib/bse/generate";
import { validateBseResponse } from "@/lib/bse/schema";
import { publish } from "@/lib/events/hub";
import { log } from "@/lib/logger";
import { upsertTrades } from "@/lib/trades/repo";
import { markCompleted, markFailed, markRunning } from "./repo";

const g = globalThis as typeof globalThis & {
  __tradeDeskInflight__?: Set<string>;
};

function inflight(): Set<string> {
  g.__tradeDeskInflight__ ??= new Set();
  return g.__tradeDeskInflight__;
}

/**
 * Hand the job to the worker and return immediately.
 * The HTTP request that created the job must never await this.
 */
export function enqueuePull(jobId: string): void {
  if (inflight().has(jobId)) return;
  inflight().add(jobId);
  void processPull(jobId).finally(() => {
    inflight().delete(jobId);
  });
}

export async function processPull(jobId: string): Promise<void> {
  const started = Date.now();
  log.info("pull job started", { jobId });

  const running = await markRunning(jobId);
  if (!running) {
    log.warn("pull job was not PENDING; skip", { jobId });
    return;
  }

  publish({
    type: "pull.started",
    payload: { jobId, status: "RUNNING", startedAt: running.startedAt },
  });
  publish({
    type: "pull.progress",
    payload: { jobId, phase: "calling_bse" },
  });

  try {
    const trades = await fetchBseTrades();
    log.info("BSE request completed", {
      jobId,
      recordsFetched: trades.length,
      durationMs: Date.now() - started,
    });

    publish({
      type: "pull.progress",
      payload: { jobId, phase: "persisting", recordsFetched: trades.length },
    });

    const { inserted, duplicate } = await upsertTrades(trades);
    log.info("trades persisted", { jobId, inserted, duplicate, recordsFetched: trades.length });

    const completed = await markCompleted(jobId, {
      fetched: trades.length,
      inserted,
      duplicate,
    });
    if (!completed) {
      throw new Error("Failed to mark job COMPLETED");
    }

    log.info("pull job completed", {
      jobId,
      recordsFetched: trades.length,
      recordsInserted: inserted,
      durationMs: Date.now() - started,
    });

    publish({
      type: "pull.completed",
      payload: {
        jobId,
        status: "COMPLETED",
        recordsFetched: trades.length,
        recordsInserted: inserted,
        recordsDuplicate: duplicate,
        durationMs: Date.now() - started,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown worker error";
    log.error("pull job failed", { jobId, error: message, durationMs: Date.now() - started });
    await markFailed(jobId, message);
    publish({
      type: "pull.failed",
      payload: { jobId, status: "FAILED", errorMessage: message },
    });
  }
}

async function fetchBseTrades() {
  const url = getBseApiUrl();
  const delayMs = getBseDelayMs();
  const timeoutMs = delayMs + 30_000;

  log.info("BSE request started", { url, delayMs });

  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      throw new Error(`BSE API returned HTTP ${res.status}`);
    }
    const json: unknown = await res.json();
    const validated = validateBseResponse(json);
    if (!validated.ok) throw new Error(validated.error);
    return validated.trades;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isNetwork =
      message.includes("fetch") ||
      message.includes("ECONNREFUSED") ||
      message.includes("network") ||
      message.includes("Failed to parse") ||
      (err instanceof TypeError && message.includes("fetch"));

    if (!isNetwork) throw err;

    // Loopback to this same process can fail on some serverless hosts.
    // Fall back to the in-process mock with the SAME delay so the demo
    // still represents a long-running BSE pull, not a fake UI timer.
    log.warn("BSE HTTP unreachable; using in-process mock with configured delay", {
      url,
      delayMs,
      error: message,
    });
    await sleep(delayMs);
    return generateTrades(BSE_TRADE_COUNT, 1);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
