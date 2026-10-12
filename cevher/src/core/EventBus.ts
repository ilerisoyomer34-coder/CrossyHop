/** Minimal strongly typed publish/subscribe bus. */
export type Listener<P> = (payload: P) => void;

export class EventBus<M extends object> {
  private readonly listeners = new Map<keyof M, Set<Listener<never>>>();

  /** Subscribes to an event type; returns an unsubscribe function. */
  on<K extends keyof M>(type: K, listener: Listener<M[K]>): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }

  emit<K extends keyof M>(type: K, payload: M[K]): void {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const listener of [...set]) {
      try {
        (listener as Listener<M[K]>)(payload);
      } catch (err) {
        // A faulty listener (render/audio) must never break the simulation.
        console.error(`[EventBus] listener for "${String(type)}" threw`, err);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
