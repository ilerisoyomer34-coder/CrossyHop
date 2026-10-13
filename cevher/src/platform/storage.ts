/**
 * Key-value storage abstraction (GDD 13.6). `localStorage` today; Capacitor Preferences or a cloud
 * save can implement the same interface later without touching the save code.
 *
 * Browsers may refuse storage at any time (private mode, quota, blocked site data, sandboxed
 * iframes), so every call is guarded and reports failure instead of throwing.
 */
export interface KeyValueStore {
  /** Returns the stored text, or null when missing or unreadable. */
  get(key: string): string | null;
  /** Stores the text; false when the platform refused (quota, blocked storage). */
  set(key: string, value: string): boolean;
  remove(key: string): void;
  /** False when writes are known not to persist (the game warns the player). */
  readonly persistent: boolean;
}

export class MemoryStore implements KeyValueStore {
  readonly persistent: boolean;
  private readonly data = new Map<string, string>();

  constructor(persistent = true) {
    this.persistent = persistent;
  }

  get(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  set(key: string, value: string): boolean {
    this.data.set(key, value);
    return true;
  }

  remove(key: string): void {
    this.data.delete(key);
  }
}

class WebStorageStore implements KeyValueStore {
  readonly persistent = true;

  constructor(private readonly storage: Storage) {}

  get(key: string): string | null {
    try {
      return this.storage.getItem(key);
    } catch {
      return null;
    }
  }

  set(key: string, value: string): boolean {
    try {
      this.storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  remove(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch {
      // Nothing to do: the entry is unreachable anyway.
    }
  }
}

/**
 * `localStorage` when it is usable (probed with a write), otherwise an in-memory store flagged as
 * non-persistent so the game keeps running and can tell the player that progress will not survive.
 */
export function createBrowserStore(probeKey = '__cevher_probe__'): KeyValueStore {
  try {
    const storage = globalThis.localStorage;
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return new WebStorageStore(storage);
  } catch {
    return new MemoryStore(false);
  }
}
