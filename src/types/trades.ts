export type TradeRecord = {
  tradeId: string;
  client: string;
  symbol: string;
  quantity: number;
  price: number;
  timestamp: string;
};

export type TradeStats = {
  totalTrades: number;
  totalQuantity: number;
  averagePrice: number;
  uniqueClients: number;
  uniqueSymbols: number;
};

export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export type PullJob = {
  id: string;
  status: JobStatus;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  recordsFetched: number;
  recordsInserted: number;
  recordsDuplicate: number;
  createdAt: string;
};

export type TradesResponse = {
  data: TradeRecord[];
  page: number;
  pageSize: number;
  total: number;
  stats: TradeStats;
  symbols: string[];
  bySymbol: Array<{ symbol: string; count: number }>;
};

export type PullsResponse = {
  active: PullJob | null;
  recent: PullJob[];
};

export type SortBy = "tradeId" | "client" | "symbol" | "quantity" | "price" | "timestamp";
export type SortDir = "asc" | "desc";
