import type { PullJob, PullsResponse, SortBy, SortDir, TradesResponse } from "@/types/trades";

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(res.ok ? "Invalid JSON from API" : `Request failed (${res.status})`);
  }
  if (!res.ok) {
    const err =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request failed (${res.status})`;
    const extra = Object.assign(new Error(err), { status: res.status, body });
    throw extra;
  }
  return body as T;
}

export async function fetchTrades(params: {
  page: number;
  pageSize: number;
  search: string;
  symbol: string;
  sortBy: SortBy;
  sortDir: SortDir;
}): Promise<TradesResponse> {
  const q = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    search: params.search,
    symbol: params.symbol,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
  });
  const res = await fetch(`/api/trades?${q.toString()}`);
  return readJson<TradesResponse>(res);
}

export async function fetchPulls(): Promise<PullsResponse> {
  const res = await fetch("/api/pulls");
  return readJson<PullsResponse>(res);
}

export async function startPull(): Promise<{ jobId: string; status: string }> {
  const res = await fetch("/api/pulls", { method: "POST" });
  return readJson<{ jobId: string; status: string }>(res);
}

export async function fetchJob(jobId: string): Promise<PullJob> {
  const res = await fetch(`/api/pulls/${jobId}`);
  return readJson<PullJob>(res);
}

export async function fetchHealth(): Promise<{
  ok: boolean;
  bseDelayMs: number;
  db: string;
  sseSubscribers: number;
}> {
  const res = await fetch("/health");
  return readJson(res);
}
