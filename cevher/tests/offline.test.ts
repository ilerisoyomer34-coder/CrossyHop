import { describe, expect, it } from 'vitest';
import { D, dmin } from '../src/core/BigNum';
import { debugSetAutoRun, startBarrierBlast } from '../src/state/actions';
import { FLAG_CLOCK_REWOUND, type GameState } from '../src/state/GameState';
import { chainFlows } from '../src/state/selectors';
import { runGreedyBot } from '../src/sim/bots/runBot';
import {
  applyOffline,
  automatedIncomePerSec,
  calculateOffline,
} from '../src/sim/OfflineCalculator';
import { runSimulation, stepSimulation } from '../src/sim/Simulation';
import { MINE, cfg, elevatorOf, expectClose, freshState, mine, patchMine } from './helpers';

const HOUR = 3_600_000;
const T0 = 1_700_000_000_000; // arbitrary wall-clock origin

/** Mid-game state with five shafts, every unit automated (debug flag ≙ managers). */
function automatedState(): GameState {
  const run = runGreedyBot(cfg, { untilShafts: 5, maxSeconds: 1800, mode: 'auto' });
  return run.state;
}

describe('offline income (GDD 5.7)', () => {
  it('is zero when no link is automated (Phase 0 without managers)', () => {
    const state = patchMine(freshState(), (m) => ({ ...m, cash: D(100) }));
    const report = calculateOffline(state, T0, T0 + HOUR, cfg);
    expect(report.totalEarned.eq(0)).toBe(true);
    expect(report.elapsedMs).toBe(HOUR);
    expect(mine(applyOffline(state, report)).cash.eq(100)).toBe(true);
  });

  it('pays min(automated links) × efficiency × time when everything is automated', () => {
    const state = automatedState();
    const flows = chainFlows(state, MINE, cfg);
    const perSec = dmin(dmin(flows.shafts, flows.elevator), flows.logistics);
    expect(perSec.gt(0)).toBe(true);
    expectClose(automatedIncomePerSec(state, MINE, cfg), perSec);

    const report = calculateOffline(state, T0, T0 + HOUR, cfg);
    const expected = perSec.mul(cfg.econ.offline.baseEfficiency * 3600);
    expectClose(report.totalEarned, expected);
    expectClose(report.earnedByMine[MINE] ?? D(0), expected);
    expect(report.capped).toBe(false);

    const after = applyOffline(state, report);
    expectClose(mine(after).cash, mine(state).cash.add(expected));
    expectClose(mine(after).earnedThisRun, mine(state).earnedThisRun.add(expected));
    expectClose(after.stats.totalEarned, state.stats.totalEarned.add(expected));
    // The simulation clock does not jump.
    expect(after.time).toBe(state.time);
  });

  it('applies the offline cap', () => {
    const state = automatedState();
    const capMs = cfg.econ.offline.baseCapHours * HOUR;
    const report = calculateOffline(state, T0, T0 + 5 * HOUR, cfg);
    expect(report.capped).toBe(true);
    expect(report.creditedMs).toBe(capMs);
    expectClose(
      report.totalEarned,
      automatedIncomePerSec(state, MINE, cfg).mul(cfg.econ.offline.baseEfficiency * (capMs / 1000)),
    );
  });

  it('pays nothing when a single link is manual', () => {
    // Shafts and logistics run on their own, the elevator does not.
    let state = freshState();
    state = patchMine(state, (m) => ({
      ...m,
      shafts: m.shafts.map((s) => ({ ...s, managerId: 'test' })),
      logistics: { ...m.logistics, managerId: 'test' },
    }));
    expect(calculateOffline(state, T0, T0 + HOUR, cfg).totalEarned.eq(0)).toBe(true);
    state = patchMine(state, (m) => ({
      ...m,
      elevators: [{ ...elevatorOf(m), managerId: 'test' }, ...m.elevators.slice(1)],
    }));
    expect(calculateOffline(state, T0, T0 + HOUR, cfg).totalEarned.gt(0)).toBe(true);
  });

  it('grants nothing and flags the save when the clock went backwards', () => {
    const state = debugSetAutoRun(freshState(), true).state;
    const report = calculateOffline(state, T0, T0 - HOUR, cfg);
    expect(report).toMatchObject({ clockRewound: true, elapsedMs: 0, creditedMs: 0 });
    expect(report.totalEarned.eq(0)).toBe(true);
    const after = applyOffline(state, report);
    expect(after.flags[FLAG_CLOCK_REWOUND]).toBe(true);
    expect(mine(after).cash.eq(mine(state).cash)).toBe(true);
  });

  it('matches a frame-by-frame simulation of 2 hours within ±1 %', () => {
    // Warm up so the buffers are in steady state, then compare 2 h of real simulation against the
    // analytic formula at 100 % efficiency (the simulation has no efficiency factor).
    const warm = runSimulation(automatedState(), 120_000, 250, cfg).state;
    const before = mine(warm).cash;
    const simulated = mine(runSimulation(warm, 2 * HOUR, 250, cfg).state).cash.sub(before);
    const analytic = automatedIncomePerSec(warm, MINE, cfg).mul(2 * 3600);
    expect(analytic.gt(1e4)).toBe(true);
    expectClose(simulated, analytic, 0.01);
  });
});

describe('real-time timers while away', () => {
  function blastingState(): GameState {
    // Five open shafts and enough cash to light the first barrier (60 s blast).
    let state = runGreedyBot(cfg, { untilShafts: 5, maxSeconds: 1800, mode: 'tap' }).state;
    state = patchMine(state, (m) => ({ ...m, barrier: null, cash: D(1e9) }));
    const lit = startBarrierBlast(state, MINE, cfg);
    expect(lit.ok).toBe(true);
    return lit.state;
  }

  it('keeps a barrier blast burning while the game is closed', () => {
    const state = blastingState();
    const barrier = mine(state).barrier;
    expect(barrier).not.toBeNull();
    const remaining = (barrier?.endsAt ?? 0) - state.time;

    const partly = applyOffline(state, calculateOffline(state, T0, T0 + remaining / 2, cfg));
    expect(mine(partly).barrier?.endsAt).toBeCloseTo(state.time + remaining / 2);

    const done = applyOffline(state, calculateOffline(state, T0, T0 + 10 * HOUR, cfg));
    expect(mine(done).barrier?.endsAt).toBe(done.time);
    const next = stepSimulation(done, 50, cfg);
    expect(mine(next.state).barrier).toBeNull();
    expect(next.events.some((e) => e.type === 'barrierCleared')).toBe(true);
  });

  it('does not touch the barrier when the clock was rewound', () => {
    const state = blastingState();
    const after = applyOffline(state, calculateOffline(state, T0, T0 - HOUR, cfg));
    expect(mine(after).barrier).toEqual(mine(state).barrier);
  });
});
