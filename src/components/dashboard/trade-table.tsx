import { ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatInr, formatQty, formatTradeTime } from "@/lib/utils";
import type { SortBy, SortDir, TradeRecord } from "@/types/trades";

type Props = {
  rows: TradeRecord[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  symbol: string;
  symbols: string[];
  sortBy: SortBy;
  sortDir: SortDir;
  loading: boolean;
  error: string | null;
  onSearch: (v: string) => void;
  onSymbol: (v: string) => void;
  onSort: (col: SortBy) => void;
  onPage: (page: number) => void;
};

const COLUMNS: Array<{ key: SortBy; label: string; align?: "right" }> = [
  { key: "tradeId", label: "Trade ID" },
  { key: "client", label: "Client" },
  { key: "symbol", label: "Symbol" },
  { key: "quantity", label: "Quantity", align: "right" },
  { key: "price", label: "Price", align: "right" },
  { key: "timestamp", label: "Timestamp" },
];

export function TradeTable(props: Props) {
  const pages = Math.max(1, Math.ceil(props.total / props.pageSize));
  const empty = !props.loading && props.rows.length === 0 && !props.error;

  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium tracking-wide text-muted">Blotter</h2>
          <p className="mt-0.5 text-xs text-subtle">
            {props.total.toLocaleString("en-IN")} trades · server-side filter & sort
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <label className="sr-only" htmlFor="trade-search">
            Search trades
          </label>
          <Input
            id="trade-search"
            value={props.search}
            onChange={(e) => props.onSearch(e.target.value)}
            placeholder="Search ID, client, symbol"
            className="sm:w-64"
          />
          <label className="sr-only" htmlFor="symbol-filter">
            Symbol
          </label>
          <select
            id="symbol-filter"
            value={props.symbol}
            onChange={(e) => props.onSymbol(e.target.value)}
            className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg"
          >
            <option value="">All symbols</option>
            {props.symbols.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="tape-scroll overflow-x-auto">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="border-b border-border bg-bg/80 text-[11px] uppercase tracking-[0.12em] text-subtle">
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.key} className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => props.onSort(col.key)}
                    className={`inline-flex items-center gap-1 hover:text-fg ${
                      col.align === "right" ? "w-full justify-end" : ""
                    }`}
                  >
                    {col.label}
                    <ChevronsUpDown
                      className={`size-3 ${props.sortBy === col.key ? "text-accent" : "text-subtle"}`}
                    />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.loading && props.rows.length === 0 && <LoadingRows />}
            {props.error && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-danger">
                  {props.error}
                </td>
              </tr>
            )}
            {empty && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-sm font-medium text-fg">No trades match</p>
                  <p className="mt-1 text-sm text-muted">Clear search or symbol filter.</p>
                </td>
              </tr>
            )}
            {props.rows.map((row) => (
              <tr key={row.tradeId} className="border-b border-border/70 last:border-0 hover:bg-surface-2/60">
                <td className="px-4 py-3 font-mono text-xs text-fg">{row.tradeId}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{row.client}</td>
                <td className="px-4 py-3 font-medium text-fg">{row.symbol}</td>
                <td className="px-4 py-3 text-right font-mono tabular text-fg">
                  {formatQty(row.quantity)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular text-fg">
                  {formatInr(row.price)}
                </td>
                <td className="px-4 py-3 text-muted">{formatTradeTime(row.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
        <p className="text-xs text-subtle">
          Page {props.page} of {pages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={props.page <= 1}
            onClick={() => props.onPage(props.page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
            Prev
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={props.page >= pages}
            onClick={() => props.onPage(props.page + 1)}
            aria-label="Next page"
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border/70">
          {Array.from({ length: 6 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
