/**
 * Keeps the last two distinct phases of a moving unit so the renderer, which draws one simulation
 * step behind for interpolation, can always find the phase that contains the render time.
 */
export interface TimedPhase {
  startAt: number;
  endAt: number;
}

export class PhaseTracker<P extends TimedPhase> {
  private previous: P | null = null;
  private current: P | null = null;

  observe(phase: P): void {
    if (phase === this.current) return;
    this.previous = this.current;
    this.current = phase;
  }

  /** Phase active at time `t` (falls back to the oldest known phase). */
  sample(t: number): P | null {
    const cur = this.current;
    if (cur && t >= cur.startAt) return cur;
    return this.previous ?? cur;
  }
}

/** Normalised progress of `t` within a phase, clamped to [0, 1]. */
export function phaseProgress(phase: TimedPhase, t: number): number {
  if (!Number.isFinite(phase.endAt) || phase.endAt <= phase.startAt)
    return t >= phase.startAt ? 1 : 0;
  return Math.min(1, Math.max(0, (t - phase.startAt) / (phase.endAt - phase.startAt)));
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}
