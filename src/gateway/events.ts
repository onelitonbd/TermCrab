/** Tiny in-process event bus bridging agent runs -> SSE clients + UIs. */

export type BusEvent = Record<string, unknown> & { type: string; ts?: number };

type Handler = (ev: BusEvent) => void;

class EventBus {
  private handlers = new Set<Handler>();

  subscribe(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  emit(ev: BusEvent): void {
    const payload = { ts: Date.now(), ...ev };
    for (const h of this.handlers) {
      try {
        h(payload);
      } catch {
        /* a broken subscriber must not kill the run */
      }
    }
  }

  get size(): number {
    return this.handlers.size;
  }
}

export const bus = new EventBus();
