import type { JobStatus } from "./types";

const ALLOWED: Record<JobStatus, readonly JobStatus[]> = {
  PENDING: ["RUNNING"],
  RUNNING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return ALLOWED[from].includes(to);
}

export function assertTransition(from: JobStatus, to: JobStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid pull job transition ${from} → ${to}`);
  }
}
