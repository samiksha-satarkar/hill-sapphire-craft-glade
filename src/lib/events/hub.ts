/**
 * In-process SSE fan-out. Multiple dashboard tabs subscribe here.
 *
 * Honest limitation: listeners live in this Node process. Horizontal API
 * replicas would need Redis pub/sub (or equivalent) to share events.
 */

export type PullEventType =
  | "connected"
  | "pull.started"
  | "pull.progress"
  | "pull.completed"
  | "pull.failed";

export type PullEvent = {
  type: PullEventType;
  payload: Record<string, unknown>;
};

type Listener = (event: PullEvent) => void;

const g = globalThis as typeof globalThis & {
  __tradeDeskListeners__?: Set<Listener>;
};

function listeners(): Set<Listener> {
  g.__tradeDeskListeners__ ??= new Set();
  return g.__tradeDeskListeners__;
}

export function subscribe(listener: Listener): () => void {
  listeners().add(listener);
  return () => {
    listeners().delete(listener);
  };
}

export function publish(event: PullEvent): void {
  for (const listener of listeners()) {
    try {
      listener(event);
    } catch {
      // A broken subscriber must not block the others.
    }
  }
}

export function subscriberCount(): number {
  return listeners().size;
}

export function encodeSse(event: PullEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;
}
