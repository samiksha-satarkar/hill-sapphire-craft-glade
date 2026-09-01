export const JOB_STATUSES = ["PENDING", "RUNNING", "COMPLETED", "FAILED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

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

export type PullJobRow = {
  id: string;
  status: string;
  started_at: Date | string | null;
  completed_at: Date | string | null;
  failed_at: Date | string | null;
  error_message: string | null;
  records_fetched: number;
  records_inserted: number;
  records_duplicate: number;
  created_at: Date | string;
};

function iso(value: Date | string | null): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

export function mapJob(row: PullJobRow): PullJob {
  return {
    id: row.id,
    status: row.status as JobStatus,
    startedAt: iso(row.started_at),
    completedAt: iso(row.completed_at),
    failedAt: iso(row.failed_at),
    errorMessage: row.error_message,
    recordsFetched: Number(row.records_fetched) || 0,
    recordsInserted: Number(row.records_inserted) || 0,
    recordsDuplicate: Number(row.records_duplicate) || 0,
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
  };
}
