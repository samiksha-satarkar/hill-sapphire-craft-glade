-- BSE trade blotter + pull job tracking.
-- Unowned rows (no user accounts): world-readable dashboard data.

create table if not exists trades (
  id          bigserial primary key,
  trade_id    text not null,
  client      text not null,
  symbol      text not null,
  quantity    integer not null,
  price       numeric(12, 2) not null,
  traded_at   timestamptz not null,
  created_at  timestamptz not null default now(),
  constraint trades_trade_id_unique unique (trade_id),
  constraint trades_quantity_positive check (quantity > 0),
  constraint trades_price_positive check (price > 0)
);

create index if not exists trades_symbol_idx on trades (symbol);
create index if not exists trades_traded_at_idx on trades (traded_at desc);
create index if not exists trades_client_idx on trades (client);
create index if not exists trades_symbol_traded_at_idx on trades (symbol, traded_at desc);

create table if not exists pull_jobs (
  id                  text primary key,
  status              text not null,
  started_at          timestamptz,
  completed_at        timestamptz,
  failed_at           timestamptz,
  error_message       text,
  records_fetched     integer not null default 0,
  records_inserted    integer not null default 0,
  records_duplicate   integer not null default 0,
  created_at          timestamptz not null default now(),
  constraint pull_jobs_status_check
    check (status in ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
  constraint pull_jobs_fetched_nonneg check (records_fetched >= 0),
  constraint pull_jobs_inserted_nonneg check (records_inserted >= 0)
);

create index if not exists pull_jobs_status_idx on pull_jobs (status);
create index if not exists pull_jobs_created_at_idx on pull_jobs (created_at desc);

-- At most one in-flight pull: the 30s/15min architecture does not need
-- concurrent BSE pulls for this assessment, and overlapping upserts would
-- make job accounting (inserted vs duplicate) racey.
create unique index if not exists pull_jobs_one_active
  on pull_jobs ((true))
  where status in ('PENDING', 'RUNNING');
