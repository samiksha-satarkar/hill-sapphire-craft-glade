import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArchitecturePanel } from "@/components/dashboard/architecture-panel";
import { DashboardHeader } from "@/components/dashboard/header";
import { PullStatusCard } from "@/components/dashboard/pull-status";
import { StatsRow } from "@/components/dashboard/stats-row";
import { SymbolBars } from "@/components/dashboard/symbol-bars";
import { TradeTable } from "@/components/dashboard/trade-table";
import { jobToLive, usePullStream } from "@/hooks/use-sse";
import { fetchHealth, fetchPulls, fetchTrades, startPull } from "@/services/api";
import type { SortBy, SortDir } from "@/types/trades";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [symbol, setSymbol] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { sseStatus, live, setLive } = usePullStream();

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    staleTime: 60_000,
  });

  const tradesQuery = useQuery({
    queryKey: ["trades", page, search, symbol, sortBy, sortDir],
    queryFn: () =>
      fetchTrades({
        page,
        pageSize: 25,
        search,
        symbol,
        sortBy,
        sortDir,
      }),
    placeholderData: keepPreviousData,
  });

  const pullsQuery = useQuery({
    queryKey: ["pulls"],
    queryFn: fetchPulls,
  });

  useEffect(() => {
    const active = pullsQuery.data?.active;
    if (!active) return;
    if (live && (live.status === "RUNNING" || live.status === "PENDING")) return;
    if (live?.jobId === active.id && live.status === active.status) return;
    setLive(jobToLive(active));
  }, [pullsQuery.data, live, setLive]);

  const pullMutation = useMutation({
    mutationFn: startPull,
    onSuccess: (data) => {
      setLive({
        jobId: data.jobId,
        status: data.status === "RUNNING" ? "RUNNING" : "PENDING",
        phase: "queued",
        recordsFetched: null,
        recordsInserted: null,
        recordsDuplicate: null,
        errorMessage: null,
        startedAt: new Date().toISOString(),
      });
      toast("Pull accepted", {
        description: `Job ${data.jobId.slice(0, 8)}… is running in the worker. This tab did not wait.`,
      });
    },
    onError: (err: unknown) => {
      const e = err as Error & {
        status?: number;
        body?: { jobId?: string; status?: string; error?: string };
      };
      if (e.status === 409) {
        toast("Pull already running", { description: e.body?.error ?? e.message });
        if (e.body?.jobId) {
          setLive({
            jobId: e.body.jobId,
            status: e.body.status === "PENDING" ? "PENDING" : "RUNNING",
            phase: "calling_bse",
            recordsFetched: null,
            recordsInserted: null,
            recordsDuplicate: null,
            errorMessage: null,
            startedAt: new Date().toISOString(),
          });
        }
        return;
      }
      toast.error(e.message || "Could not start pull");
    },
  });

  const pulling = live?.status === "RUNNING" || live?.status === "PENDING" || pullMutation.isPending;
  const trades = tradesQuery.data;

  function onSort(col: SortBy) {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir(col === "timestamp" || col === "price" || col === "quantity" ? "desc" : "asc");
    }
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <DashboardHeader
          sseStatus={sseStatus}
          pulling={pulling}
          onStartPull={() => pullMutation.mutate()}
          delayMs={healthQuery.data?.bseDelayMs ?? null}
        />

        <StatsRow stats={trades?.stats} loading={tradesQuery.isLoading} />

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <PullStatusCard live={live} recent={pullsQuery.data?.recent ?? []} />
          </div>
          <div className="lg:col-span-1">
            <ArchitecturePanel live={live} />
          </div>
          <div className="lg:col-span-1">
            <SymbolBars rows={trades?.bySymbol ?? []} loading={tradesQuery.isLoading} />
          </div>
        </div>

        <TradeTable
          rows={trades?.data ?? []}
          total={trades?.total ?? 0}
          page={page}
          pageSize={25}
          search={search}
          symbol={symbol}
          symbols={trades?.symbols ?? []}
          sortBy={sortBy}
          sortDir={sortDir}
          loading={tradesQuery.isFetching}
          error={tradesQuery.error ? tradesQuery.error.message : null}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
          onSymbol={(v) => {
            setSymbol(v);
            setPage(1);
          }}
          onSort={onSort}
          onPage={setPage}
        />

        <footer className="flex flex-col gap-1 pb-4 text-xs text-subtle sm:flex-row sm:justify-between">
          <p>No polling. No cron. Duplicate trade IDs are rejected by a unique constraint.</p>
          <p>Worker holds the BSE connection. The browser holds only SSE.</p>
        </footer>
      </div>
    </main>
  );
}
