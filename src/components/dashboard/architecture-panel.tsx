import { Card, CardTitle } from "@/components/ui/card";
import type { LivePull } from "@/hooks/use-sse";

const STEPS = [
  { id: "post", label: "POST /api/pulls", hint: "202 in milliseconds" },
  { id: "job", label: "Job row", hint: "PENDING → RUNNING" },
  { id: "bse", label: "Worker → BSE", hint: "Holds the slow HTTP" },
  { id: "db", label: "Postgres upsert", hint: "Unique tradeId" },
  { id: "sse", label: "SSE event", hint: "push, no poll" },
] as const;

export function ArchitecturePanel({ live }: { live: LivePull | null }) {
  const active = activeStep(live);

  return (
    <Card className="flex h-full flex-col gap-4">
      <div>
        <CardTitle>Why this shape</CardTitle>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          A BSE full pull can take 15 minutes. The network kills HTTP held open past 30 seconds. The
          browser therefore never waits on BSE — it asks the receptionist to start a job, hangs up,
          and listens for a completion event.
        </p>
      </div>
      <ol className="space-y-2">
        {STEPS.map((step, i) => {
          const on = step.id === active;
          const done = isDone(step.id, active, live?.status);
          return (
            <li
              key={step.id}
              className={`flex items-center gap-3 rounded-md border px-3 py-2 transition-colors duration-200 ${
                on
                  ? "border-warn/30 bg-warn/8"
                  : done
                    ? "border-success/20 bg-success/5"
                    : "border-border bg-bg"
              }`}
            >
              <span className="font-mono text-xs text-subtle tabular">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">{step.label}</p>
                <p className="text-xs text-subtle">{step.hint}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function activeStep(live: LivePull | null): (typeof STEPS)[number]["id"] | null {
  if (!live) return null;
  if (live.status === "PENDING") return "job";
  if (live.status === "RUNNING" && live.phase === "persisting") return "db";
  if (live.status === "RUNNING") return "bse";
  if (live.status === "COMPLETED") return "sse";
  return "post";
}

function isDone(
  id: (typeof STEPS)[number]["id"],
  active: ReturnType<typeof activeStep>,
  status?: string,
) {
  if (status === "COMPLETED") return true;
  const order = STEPS.map((s) => s.id);
  if (!active) return false;
  return order.indexOf(id) < order.indexOf(active);
}
