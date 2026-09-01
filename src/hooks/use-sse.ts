import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { JobStatus, PullJob } from "@/types/trades";

export type SseStatus = "connecting" | "live" | "reconnecting";

export type LivePull = {
  jobId: string;
  status: JobStatus;
  phase: string | null;
  recordsFetched: number | null;
  recordsInserted: number | null;
  recordsDuplicate: number | null;
  errorMessage: string | null;
  startedAt: string | null;
};

/**
 * One EventSource. No polling. Native EventSource reconnect is used on drop.
 * On reconnect we refetch trades/jobs once so a missed event is recovered.
 */
export function usePullStream() {
  const queryClient = useQueryClient();
  const [sseStatus, setSseStatus] = useState<SseStatus>("connecting");
  const [live, setLive] = useState<LivePull | null>(null);
  const openedOnce = useRef(false);

  useEffect(() => {
    const es = new EventSource("/api/events");

    const onConnected = () => {
      setSseStatus("live");
      if (openedOnce.current) {
        void queryClient.invalidateQueries({ queryKey: ["trades"] });
        void queryClient.invalidateQueries({ queryKey: ["pulls"] });
      }
      openedOnce.current = true;
    };

    es.addEventListener("connected", onConnected);
    es.onopen = onConnected;

    es.addEventListener("pull.started", (ev) => {
      const data = parse(ev);
      setLive((prev) => ({
        jobId: String(data.jobId ?? ""),
        status: "RUNNING",
        phase: "calling_bse",
        recordsFetched: null,
        recordsInserted: null,
        recordsDuplicate: null,
        errorMessage: null,
        startedAt:
          typeof data.startedAt === "string"
            ? data.startedAt
            : (prev?.startedAt ?? new Date().toISOString()),
      }));
      void queryClient.invalidateQueries({ queryKey: ["pulls"] });
    });

    es.addEventListener("pull.progress", (ev) => {
      const data = parse(ev);
      setLive((prev) => ({
        jobId: String(data.jobId ?? prev?.jobId ?? ""),
        status: "RUNNING",
        phase: typeof data.phase === "string" ? data.phase : (prev?.phase ?? null),
        recordsFetched:
          typeof data.recordsFetched === "number"
            ? data.recordsFetched
            : (prev?.recordsFetched ?? null),
        recordsInserted: prev?.recordsInserted ?? null,
        recordsDuplicate: prev?.recordsDuplicate ?? null,
        errorMessage: null,
        startedAt: prev?.startedAt ?? null,
      }));
    });

    es.addEventListener("pull.completed", (ev) => {
      const data = parse(ev);
      setLive((prev) => ({
        jobId: String(data.jobId ?? prev?.jobId ?? ""),
        status: "COMPLETED",
        phase: "done",
        recordsFetched: num(data.recordsFetched),
        recordsInserted: num(data.recordsInserted),
        recordsDuplicate: num(data.recordsDuplicate),
        errorMessage: null,
        startedAt: prev?.startedAt ?? null,
      }));
      void queryClient.invalidateQueries({ queryKey: ["trades"] });
      void queryClient.invalidateQueries({ queryKey: ["pulls"] });
    });

    es.addEventListener("pull.failed", (ev) => {
      const data = parse(ev);
      setLive((prev) => ({
        jobId: String(data.jobId ?? prev?.jobId ?? ""),
        status: "FAILED",
        phase: "failed",
        recordsFetched: prev?.recordsFetched ?? null,
        recordsInserted: prev?.recordsInserted ?? null,
        recordsDuplicate: prev?.recordsDuplicate ?? null,
        errorMessage: typeof data.errorMessage === "string" ? data.errorMessage : "Pull failed",
        startedAt: prev?.startedAt ?? null,
      }));
      void queryClient.invalidateQueries({ queryKey: ["pulls"] });
    });

    es.onerror = () => {
      setSseStatus("reconnecting");
    };

    return () => {
      es.close();
    };
  }, [queryClient]);

  return { sseStatus, live, setLive };
}

function parse(ev: Event): Record<string, unknown> {
  const msg = ev as MessageEvent<string>;
  try {
    return JSON.parse(msg.data) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function num(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

export function jobToLive(job: PullJob): LivePull {
  return {
    jobId: job.id,
    status: job.status,
    phase:
      job.status === "RUNNING"
        ? "calling_bse"
        : job.status === "PENDING"
          ? "queued"
          : job.status === "COMPLETED"
            ? "done"
            : "failed",
    recordsFetched: job.recordsFetched || null,
    recordsInserted: job.recordsInserted || null,
    recordsDuplicate: job.recordsDuplicate || null,
    errorMessage: job.errorMessage,
    startedAt: job.startedAt,
  };
}
