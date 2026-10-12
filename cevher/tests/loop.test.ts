import { describe, expect, it } from 'vitest';
import { GameLoop, type FrameScheduler } from '../src/core/GameLoop';

class FakeScheduler implements FrameScheduler {
  callbacks: ((now: number) => void)[] = [];
  request(cb: (now: number) => void): number {
    this.callbacks.push(cb);
    return this.callbacks.length;
  }
  cancel(): void {
    this.callbacks = [];
  }
}

function makeLoop(overrides: Partial<{ maxStepsPerFrame: number; maxCatchUpMs: number }> = {}) {
  let now = 0;
  const updates: number[] = [];
  const renders: number[] = [];
  const loop = new GameLoop({
    stepMs: 50,
    maxStepsPerFrame: overrides.maxStepsPerFrame ?? 10,
    maxCatchUpMs: overrides.maxCatchUpMs ?? 6000,
    frameBudgetMs: 1e9,
    update: (dt) => updates.push(dt),
    render: (alpha) => renders.push(alpha),
    timer: { now: () => now },
    scheduler: new FakeScheduler(),
  });
  const frame = (dt: number): void => {
    now += dt;
    loop.frame(now);
  };
  return { loop, updates, renders, frame, setNow: (t: number) => (now = t) };
}

describe('GameLoop (fixed 20 Hz step)', () => {
  it('runs one 50 ms step per 50 ms of real time and interpolates in between', () => {
    const { loop, updates, renders, frame } = makeLoop();
    loop.start();
    for (let i = 0; i < 40; i++) frame(25);
    expect(updates.length).toBe(20);
    expect(updates.every((d) => d === 50)).toBe(true);
    expect(renders).toHaveLength(40);
    expect(renders.every((a) => a >= 0 && a <= 1)).toBe(true);
  });

  it('runs at most maxStepsPerFrame steps per frame and catches up later', () => {
    const { loop, updates, frame } = makeLoop();
    loop.start();
    frame(1000); // 20 steps due
    expect(updates.length).toBe(10);
    frame(0);
    expect(updates.length).toBe(20);
  });

  it('drops backlog beyond the catch-up window', () => {
    const { loop, updates, frame } = makeLoop({ maxStepsPerFrame: 1000, maxCatchUpMs: 1000 });
    loop.start();
    frame(10_000);
    expect(updates.length).toBe(20);
    expect(loop.stats.droppedMs).toBe(9000);
  });

  it('scales simulated time (debug ×100)', () => {
    const { loop, updates, frame } = makeLoop();
    loop.setTimeScale(100);
    loop.start();
    for (let i = 0; i < 40; i++) frame(25);
    // one real second at ×100 = 100 simulated seconds = 2000 steps
    expect(updates.length).toBe(2000);
  });

  it('does not advance while paused but keeps rendering', () => {
    const { loop, updates, renders, frame } = makeLoop();
    loop.start();
    loop.setPaused(true);
    frame(500);
    expect(updates.length).toBe(0);
    expect(renders.length).toBe(1);
  });

  it('can carry over a short hidden period on start', () => {
    const { loop, updates, frame } = makeLoop({ maxStepsPerFrame: 1000 });
    loop.start(3000);
    frame(0);
    expect(updates.length).toBe(60);
  });
});
