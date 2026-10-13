/**
 * Autosave scheduling (GDD 13.6): every `intervalMs`, `debounceMs` after the last important action,
 * and immediately on `flush()` (tab hidden, page closing, reset, import).
 */
export interface AutoSaveOptions {
  intervalMs: number;
  debounceMs: number;
}

export class AutoSave {
  private interval: ReturnType<typeof setInterval> | null = null;
  private pending: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly saveNow: () => void,
    private readonly options: AutoSaveOptions,
  ) {}

  start(): void {
    if (this.interval !== null) return;
    this.interval = setInterval(() => this.flush(), this.options.intervalMs);
  }

  stop(): void {
    if (this.interval !== null) clearInterval(this.interval);
    this.interval = null;
    this.cancelPending();
  }

  /** Debounced save: runs `debounceMs` after the most recent call. */
  schedule(): void {
    this.cancelPending();
    this.pending = setTimeout(() => this.flush(), this.options.debounceMs);
  }

  /** Saves right away and drops any pending debounced save. */
  flush(): void {
    this.cancelPending();
    this.saveNow();
  }

  private cancelPending(): void {
    if (this.pending !== null) clearTimeout(this.pending);
    this.pending = null;
  }
}
