import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatInr, formatQty } from "@/lib/utils";
import type { TradeStats } from "@/types/trades";

const ITEMS: Array<{
  key: keyof TradeStats;
  label: string;
  format: (n: number) => string;
}> = [
  { key: "totalTrades", label: "Total trades", format: formatQty },
  { key: "totalQuantity", label: "Total quantity", format: formatQty },
  { key: "averagePrice", label: "Average price", format: (n) => formatInr(n, 2) },
  { key: "uniqueClients", label: "Unique clients", format: formatQty },
  { key: "uniqueSymbols", label: "Unique symbols", format: formatQty },
];

export function StatsRow({ stats, loading }: { stats?: TradeStats; loading: boolean }) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {ITEMS.map((item) => (
        <Card key={item.key} className="rounded-lg p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-subtle">
            {item.label}
          </p>
          {loading && !stats ? (
            <Skeleton className="mt-2 h-7 w-24" />
          ) : (
            <p className="mt-2 font-mono text-xl font-medium tabular tracking-tight text-fg">
              {item.format(stats?.[item.key] ?? 0)}
            </p>
          )}
        </Card>
      ))}
    </section>
  );
}
