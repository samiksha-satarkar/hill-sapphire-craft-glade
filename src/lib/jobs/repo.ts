import { getSql } from "@/lib/db";
import { getStaleJobMs } from "@/lib/config";
import { log } from "@/lib/logger";
import { mapJob, type PullJob, type PullJobRow } from "./types";

export async function insertPendingJob(id: string): Promise<PullJob> {
  const sql = await getSql();
  const rows = await sql.query<PullJobRow>(
    `insert into pull_jobs (id, status) values ($1, 'PENDING') returning *`,
    [id],
  );
  const row = rows[0];
  if (!row) throw new Error("Failed to create pull job");
  return mapJob(row);
}

export async function getJob(id: string): Promise<PullJob | null> {
  const sql = await getSql();
  const rows = await sql.query<PullJobRow>(`select * from pull_jobs where id = $1`, [id]);
  return rows[0] ? mapJob(rows[0]) : null;
}

export async function getActiveJob(): Promise<PullJob | null> {
  const sql = await getSql();
  const rows = await sql.query<PullJobRow>(
    `select * from pull_jobs
     where status in ('PENDING', 'RUNNING')
     order by created_at desc
     limit 1`,
  );
  return rows[0] ? mapJob(rows[0]) : null;
}

export async function listRecentJobs(limit = 8): Promise<PullJob[]> {
  const sql = await getSql();
  const rows = await sql.query<PullJobRow>(
    `select * from pull_jobs order by created_at desc limit $1`,
    [limit],
  );
  return rows.map(mapJob);
}

export async function failStaleJobs(): Promise<number> {
  const sql = await getSql();
  const cutoff = new Date(Date.now() - getStaleJobMs()).toISOString();
  const rows = await sql.query<{ id: string }>(
    `update pull_jobs
     set status = 'FAILED',
         failed_at = now(),
         error_message = 'Job exceeded expected BSE window and was marked stale'
     where status in ('PENDING', 'RUNNING')
       and created_at < $1
     returning id`,
    [cutoff],
  );
  if (rows.length > 0) {
    log.warn("stale pull jobs failed", { count: rows.length });
  }
  return rows.length;
}

export async function markRunning(id: string): Promise<PullJob | null> {
  const sql = await getSql();
  const rows = await sql.query<PullJobRow>(
    `update pull_jobs
     set status = 'RUNNING', started_at = now()
     where id = $1 and status = 'PENDING'
     returning *`,
    [id],
  );
  return rows[0] ? mapJob(rows[0]) : null;
}

export async function markCompleted(
  id: string,
  stats: { fetched: number; inserted: number; duplicate: number },
): Promise<PullJob | null> {
  const sql = await getSql();
  const rows = await sql.query<PullJobRow>(
    `update pull_jobs
     set status = 'COMPLETED',
         completed_at = now(),
         records_fetched = $2,
         records_inserted = $3,
         records_duplicate = $4
     where id = $1 and status = 'RUNNING'
     returning *`,
    [id, stats.fetched, stats.inserted, stats.duplicate],
  );
  return rows[0] ? mapJob(rows[0]) : null;
}

export async function markFailed(id: string, errorMessage: string): Promise<PullJob | null> {
  const sql = await getSql();
  const rows = await sql.query<PullJobRow>(
    `update pull_jobs
     set status = 'FAILED',
         failed_at = now(),
         error_message = $2
     where id = $1 and status in ('PENDING', 'RUNNING')
     returning *`,
    [id, errorMessage.slice(0, 500)],
  );
  return rows[0] ? mapJob(rows[0]) : null;
}
