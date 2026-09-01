import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatClock, formatQty } from "@/lib/utils";
import type { LivePull } from "@/hooks/use-sse";
import type { PullJob } from "@/types/trades";

type Props = {
  live: LivePull | null;
  recent: PullJob[];
};

export function PullStatusCard({ live, recent }: Props) {
  const lastCompleted = recent.find((j) => j.status === "COMPLETED");
  const display = live ?? (lastCompleted ? fromJob(lastCompleted) : null);

  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <CardTitle>Pull status</CardTitle>
        <StatusBadge status={display?.status} />
      </div>

      {!display ? (
        <p className="text-sm text-muted">
          No pull running. Existing trades are already on the blotter. Start a pull to fetch the
          mock BSE tape in the background.
        </p>
      ) : (
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Row label="Job ID" value={shortId(display.jobId)} mono />
          <Row
            label="Started"
            value={display.startedAt ? formatClock(display.startedAt) : "—"}
          />
          <Row label="Phase" value={phaseLabel(display.phase, display.status)} />
          <Row
            label="Records"
            value={
              display.status === "COMPLETED"
                ? `${formatQty(display.recordsInserted ?? 0)} new / ${formatQty(display.recordsFetched ?? 0)} fetched`
                : display.status === "RUNNING"
                  ? "Processing…"
                  : display.status === "FAILED"
                    ? "—"
                    : "Queued"
            }
          />
        </dl>
      )}

      {display?.status === "COMPLETED" && (
        <div className="flex items-start gap-2 rounded-md border border-success/20 bg-success/8 px-3 py-2 text-sm text-success">
          <Check className="mt-0.5 size-4 shrink-0" />
          <p>
            Pull completed. {formatQty(display.recordsInserted ?? 0)} new trades stored
            {display.recordsDuplicate
              ? `, ${formatQty(display.recordsDuplicate)} duplicates skipped`
              : ""}
            . Blotter updated over SSE — no refresh.
          </p>
        </div>
      )}

      {display?.status === "FAILED" && (
        <div className="flex items-start gap-2 rounded-md border border-danger/20 bg-danger/8 px-3 py-2 text-sm text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <p>{display.errorMessage ?? "Pull failed."}</p>
        </div>
      )}

      {display?.status === "RUNNING" && (
        <div className="flex items-center gap-2 text-sm text-warn">
          <LoaderCircle className="size-4 animate-spin" />
          Worker is calling Mock BSE. This tab stays usable.
        </div>
      )}
    </Card>
  );
}

function fromJob(job: PullJob): LivePull {
  return {
    jobId: job.id,
    status: job.status,
    phase: job.status === "COMPLETED" ? "done" : null,
    recordsFetched: job.recordsFetched,
    recordsInserted: job.recordsInserted,
    recordsDuplicate: job.recordsDuplicate,
    errorMessage: job.errorMessage,
    startedAt: job.startedAt,
  };
}

function StatusBadge({ status }: { status?: string }) {
  if (status === "RUNNING" || status === "PENDING")
    return (
      <Badge tone="warn">
        <span className="pulse-dot" data-state="busy" />
        {status}
      </Badge>
    );
  if (status === "COMPLETED") return <Badge tone="success">COMPLETED</Badge>;
  if (status === "FAILED") return <Badge tone="danger">FAILED</Badge>;
  return <Badge>IDLE</Badge>;
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.14em] text-subtle">{label}</dt>
      <dd className={mono ? "mt-1 font-mono text-sm text-fg" : "mt-1 text-sm text-fg"}>{value}</dd>
    </div>
  );
}

function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function phaseLabel(phase: string | null, status: string) {
  if (status === "COMPLETED") return "Persisted + notified";
  if (status === "FAILED") return "Failed";
  if (phase === "calling_bse") return "Calling Mock BSE";
  if (phase === "persisting") return "Writing trades";
  if (phase === "queued") return "Queued";
  return status;
}
