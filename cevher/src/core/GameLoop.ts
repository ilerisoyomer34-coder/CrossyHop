/**
 * Fixed-timestep game loop (GDD 13.3).
 *
 * - The simulation advances in fixed steps of `stepMs` simulated milliseconds (20 Hz by default).
 * - Rendering runs once per display frame and receives an interpolation factor `alpha` in [0, 1]
 *   describing how far real time has progressed into the next, not yet simulated, step.
 * - At most `maxStepsPerFrame × timeScale` steps run per frame and the update work per frame is
 *   bounded by `frameBudgetMs`; any backlog beyond `maxCatchUpMs` (scaled) is dropped
 *   (overload protection — the game slows down instead of freezing).
 *
 * The loop is DOM-agnostic: the frame scheduler and timer are injectable, which keeps it testable.
 */
import { performanceTimer, type FrameTimer } from './Clock';

export interface FrameScheduler {
  request(callback: (now: number) => void): number;
  cancel(handle: number): void;
}

export const animationFrameScheduler: FrameScheduler = {
  request: (cb) => requestAnimationFrame(cb),
  cancel: (handle) => cancelAnimationFrame(handle),
};

export interface GameLoopOptions {
  stepMs: number;
  maxStepsPerFrame: number;
  maxCatchUpMs: number;
  frameBudgetMs: number;
  update: (stepMs: number) => void;
  render: (alpha: number, frameDtMs: number) => void;
  timer?: FrameTimer;
  scheduler?: FrameScheduler;
}

export interface LoopStats {
  /** Exponential moving average of frames per second. */
  fps: number;
  /** Last frame's real duration in ms. */
  frameMs: number;
  /** Simulation steps executed in the last frame. */
  steps: number;
  /** Simulated milliseconds dropped so far by overload protection. */
  droppedMs: number;
  /** Real milliseconds spent in update() during the last frame. */
  updateMs: number;
}

/** Hard ceiling on steps per frame regardless of time scale (protects against runaway loops). */
const ABSOLUTE_MAX_STEPS = 20_000;

export class GameLoop {
  private readonly opts: Required<GameLoopOptions>;
  private accumulator = 0;
  private last = 0;
  private handle: number | null = null;
  private running = false;
  private scale = 1;
  private pausedFlag = false;

  readonly stats: LoopStats = { fps: 60, frameMs: 16.7, steps: 0, droppedMs: 0, updateMs: 0 };

  constructor(options: GameLoopOptions) {
    this.opts = {
      timer: performanceTimer,
      scheduler: animationFrameScheduler,
      ...options,
    };
    if (!(this.opts.stepMs > 0)) throw new Error('GameLoop: stepMs must be > 0');
  }

  get timeScale(): number {
    return this.scale;
  }

  /** Debug time acceleration (×1, ×10, ×100, ×1000). */
  setTimeScale(scale: number): void {
    this.scale = Math.max(0, scale);
  }

  get paused(): boolean {
    return this.pausedFlag;
  }

  /** While paused the simulation does not advance, but rendering continues. */
  setPaused(paused: boolean): void {
    this.pausedFlag = paused;
    if (paused) this.accumulator = 0;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Starts (or resumes) the loop. `catchUpMs` adds real time that elapsed while the loop was
   * stopped and should still be simulated (short tab hides); it is processed over the next frames.
   */
  start(catchUpMs = 0): void {
    if (this.running) return;
    this.running = true;
    this.last = this.opts.timer.now();
    this.accumulator += Math.max(0, catchUpMs) * this.scale;
    this.schedule();
  }

  stop(): void {
    this.running = false;
    if (this.handle !== null) {
      this.opts.scheduler.cancel(this.handle);
      this.handle = null;
    }
  }

  /** Executes one frame. Public so tests (and the scheduler) can drive the loop. */
  frame(now: number): void {
    const { stepMs, maxStepsPerFrame, maxCatchUpMs, frameBudgetMs, update, render, timer } =
      this.opts;
    const frameDt = Math.max(0, now - this.last);
    this.last = now;

    if (!this.pausedFlag) this.accumulator += frameDt * this.scale;

    const maxBacklog = Math.max(maxCatchUpMs, stepMs) * Math.max(1, this.scale);
    if (this.accumulator > maxBacklog) {
      this.stats.droppedMs += this.accumulator - maxBacklog;
      this.accumulator = maxBacklog;
    }

    const maxSteps = Math.min(
      ABSOLUTE_MAX_STEPS,
      Math.max(1, Math.ceil(maxStepsPerFrame * Math.max(1, this.scale))),
    );
    const started = timer.now();
    let steps = 0;
    while (this.accumulator >= stepMs && steps < maxSteps) {
      update(stepMs);
      this.accumulator -= stepMs;
      steps++;
      // Frame budget guard: check every 16 steps to keep timer calls cheap.
      if ((steps & 15) === 0 && timer.now() - started > frameBudgetMs) break;
    }
    this.stats.updateMs = timer.now() - started;
    this.stats.steps = steps;
    this.stats.frameMs = frameDt;
    if (frameDt > 0) {
      const instantFps = 1000 / frameDt;
      this.stats.fps += (instantFps - this.stats.fps) * 0.1;
    }

    const alpha = Math.min(1, this.accumulator / stepMs);
    render(alpha, frameDt);
  }

  private schedule(): void {
    this.handle = this.opts.scheduler.request((now) => {
      this.handle = null;
      if (!this.running) return;
      this.frame(now);
      if (this.running) this.schedule();
    });
  }
}
