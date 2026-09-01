import { Activity, LoaderCircle, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SseStatus } from "@/hooks/use-sse";

type Props = {
  sseStatus: SseStatus;
  pulling: boolean;
  onStartPull: () => void;
  delayMs: number | null;
};

export function DashboardHeader({ sseStatus, pulling, onStartPull, delayMs }: Props) {
  const live = sseStatus === "live";
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-11 items-center justify-center rounded-md border border-border bg-surface-2">
          <Activity className="size-5 text-accent" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-subtle">
            Bombay Stock Exchange
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">Trade Desk</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Async BSE ingestion. The blotter never waits on a 15-minute exchange pull.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-2">
          <span
            className="pulse-dot"
            data-state={live ? "on" : sseStatus === "reconnecting" ? "busy" : "off"}
            aria-hidden
          />
          <Radio className="size-3.5 text-muted" />
          <span className="text-xs font-medium text-fg">
            {live ? "SSE live" : sseStatus === "reconnecting" ? "Reconnecting" : "Connecting"}
          </span>
        </div>
        {delayMs != null && (
          <Badge tone="neutral" className="hidden sm:inline-flex">
            BSE delay {formatDelay(delayMs)}
          </Badge>
        )}
        <Button
          onClick={onStartPull}
          disabled={pulling}
          aria-busy={pulling}
          className="min-w-[148px]"
        >
          {pulling ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Pulling
            </>
          ) : (
            "Start Pull"
          )}
        </Button>
      </div>
    </header>
  );
}

function formatDelay(ms: number): string {
  if (ms >= 60_000) return `${Math.round(ms / 60000)} min`;
  if (ms >= 1000) return `${Math.round(ms / 1000)}s`;
  return `${ms}ms`;
}
