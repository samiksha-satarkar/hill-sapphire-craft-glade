import { getSql } from "@/lib/db";
import type { GeneratedTrade } from "@/lib/bse/generate";

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

export type TradeListQuery = {
  page: number;
  pageSize: number;
  search: string;
  symbol: string;
  sortBy: "tradeId" | "client" | "symbol" | "quantity" | "price" | "timestamp";
  sortDir: "asc" | "desc";
};

export type TradeListResult = {
  data: TradeRecord[];
  page: number;
  pageSize: number;
  total: number;
  stats: TradeStats;
  symbols: string[];
};

type TradeRow = {
  trade_id: string;
  client: string;
  symbol: string;
  quantity: number;
  price: string | number;
  traded_at: Date | string;
};

const SORT_COLUMNS: Record<TradeListQuery["sortBy"], string> = {
  tradeId: "trade_id",
  client: "client",
  symbol: "symbol",
  quantity: "quantity",
  price: "price",
  timestamp: "traded_at",
};

function iso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

function mapTrade(row: TradeRow): TradeRecord {
  return {
    tradeId: row.trade_id,
    client: row.client,
    symbol: row.symbol,
    quantity: Number(row.quantity),
    price: Number(row.price),
    timestamp: iso(row.traded_at),
  };
}

export async function countTrades(): Promise<number> {
  const sql = await getSql();
  const rows = await sql.query<{ n: number }>(`select count(*)::int as n from trades`);
  return Number(rows[0]?.n ?? 0);
}

/**
 * Bulk upsert. Unique(trade_id) + ON CONFLICT DO NOTHING means a trade that
 * already exists is never duplicated, even across overlapping BSE pulls.
 *
 * Inserts are batched. Each batch is a single statement (atomic). A later
 * batch failure cannot un-insert earlier batches, but the operation is
 * idempotent: retrying the same pull inserts only the missing ids.
 */
export async function upsertTrades(
  trades: GeneratedTrade[],
): Promise<{ inserted: number; duplicate: number }> {
  if (trades.length === 0) return { inserted: 0, duplicate: 0 };

  const sql = await getSql();
  const CHUNK = 200;
  let inserted = 0;

  for (let i = 0; i < trades.length; i += CHUNK) {
    const chunk = trades.slice(i, i + CHUNK);
    const values: unknown[] = [];
    const placeholders: string[] = [];
    chunk.forEach((t, idx) => {
      const b = idx * 6;
      placeholders.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6})`);
      values.push(t.tradeId, t.client, t.symbol, t.quantity, t.price.toFixed(2), t.timestamp);
    });
    const rows = await sql.query<{ trade_id: string }>(
      `insert into trades (trade_id, client, symbol, quantity, price, traded_at)
       values ${placeholders.join(",")}
       on conflict (trade_id) do nothing
       returning trade_id`,
      values,
    );
    inserted += rows.length;
  }

  return { inserted, duplicate: trades.length - inserted };
}

export async function listTrades(query: TradeListQuery): Promise<TradeListResult> {
  const sql = await getSql();
  const sortCol = SORT_COLUMNS[query.sortBy];
  const sortDir = query.sortDir === "asc" ? "ASC" : "DESC";

  const params: unknown[] = [];
  const where: string[] = [];

  if (query.search.trim()) {
    params.push(`%${query.search.trim()}%`);
    const p = `$${params.length}`;
    where.push(`(trade_id ilike ${p} or client ilike ${p} or symbol ilike ${p})`);
  }
  if (query.symbol.trim()) {
    params.push(query.symbol.trim().toUpperCase());
    where.push(`symbol = $${params.length}`);
  }

  const whereSql = where.length ? `where ${where.join(" and ")}` : "";

  const countRows = await sql.query<{ n: number }>(
    `select count(*)::int as n from trades ${whereSql}`,
    params,
  );
  const total = Number(countRows[0]?.n ?? 0);

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const pageParams = [...params, query.pageSize, (query.page - 1) * query.pageSize];

  const rows = await sql.query<TradeRow>(
    `select trade_id, client, symbol, quantity, price, traded_at
     from trades
     ${whereSql}
     order by ${sortCol} ${sortDir}, trade_id asc
     limit $${limitIdx} offset $${offsetIdx}`,
    pageParams,
  );

  const statsRows = await sql.query<{
    total_trades: number;
    total_quantity: number;
    average_price: string | number | null;
    unique_clients: number;
    unique_symbols: number;
  }>(
    `select
       count(*)::int as total_trades,
       coalesce(sum(quantity), 0)::bigint as total_quantity,
       avg(price) as average_price,
       count(distinct client)::int as unique_clients,
       count(distinct symbol)::int as unique_symbols
     from trades`,
  );
  const s = statsRows[0];

  const symbolRows = await sql.query<{ symbol: string }>(
    `select distinct symbol from trades order by symbol`,
  );

  return {
    data: rows.map(mapTrade),
    page: query.page,
    pageSize: query.pageSize,
    total,
    stats: {
      totalTrades: Number(s?.total_trades ?? 0),
      totalQuantity: Number(s?.total_quantity ?? 0),
      averagePrice: s?.average_price == null ? 0 : Number(s.average_price),
      uniqueClients: Number(s?.unique_clients ?? 0),
      uniqueSymbols: Number(s?.unique_symbols ?? 0),
    },
    symbols: symbolRows.map((r) => r.symbol),
  };
}

export async function symbolCounts(): Promise<Array<{ symbol: string; count: number }>> {
  const sql = await getSql();
  const rows = await sql.query<{ symbol: string; count: number }>(
    `select symbol, count(*)::int as count
     from trades
     group by symbol
     order by count desc, symbol asc`,
  );
  return rows.map((r) => ({ symbol: r.symbol, count: Number(r.count) }));
}
