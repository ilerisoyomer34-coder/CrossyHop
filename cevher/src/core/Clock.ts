/**
 * Time sources. The simulation never reads the system clock directly: wall-clock time is injected
 * through a {@link Clock} (save timestamps, offline gaps) and frame time through a
 * {@link FrameTimer} (game loop). Tests swap in manual implementations.
 */
export interface Clock {
  /** Wall-clock time in epoch milliseconds. */
  now(): number;
}

export const systemClock: Clock = {
  now: () => Date.now(),
};

export class ManualClock implements Clock {
  constructor(private current = 0) {}

  now(): number {
    return this.current;
  }

  advance(ms: number): void {
    this.current += ms;
  }

  set(ms: number): void {
    this.current = ms;
  }
}

/** Monotonic high-resolution timer for frame timing. */
export interface FrameTimer {
  now(): number;
}

export const performanceTimer: FrameTimer = {
  now: () => performance.now(),
};
