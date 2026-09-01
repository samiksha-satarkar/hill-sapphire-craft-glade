import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  rows: Array<{ symbol: string; count: number }>;
  loading: boolean;
};

export function SymbolBars({ rows, loading }: Props) {
  const max = rows[0]?.count ?? 1;
  const top = rows.slice(0, 8);

  return (
    <Card className="flex h-full flex-col gap-4">
      <CardTitle>Tape by symbol</CardTitle>
      {loading && top.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : top.length === 0 ? (
        <p className="text-sm text-muted">No trades yet.</p>
      ) : (
        <ul className="space-y-2">
          {top.map((row) => (
            <li key={row.symbol} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3">
              <span className="truncate font-mono text-xs text-fg">{row.symbol}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent/80"
                  style={{ width: `${Math.max(6, (row.count / max) * 100)}%` }}
                />
              </div>
              <span className="font-mono text-xs tabular text-muted">{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
