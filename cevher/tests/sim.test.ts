import { describe, expect, it } from 'vitest';
import { D, ZERO, type Decimal } from '../src/core/BigNum';
import { debugSetAutoRun, startBarrierBlast, tapUnit, unlockNextShaft } from '../src/state/actions';
import { idleCarrier, newShaft } from '../src/state/factory';
import type { GameState } from '../src/state/GameState';
import { chainFlows, quoteUnlock } from '../src/state/selectors';
import { runSimulation, stepSimulation } from '../src/sim/Simulation';
import { cfg, deepFreeze, expectClose, freshState, MINE, mine, patchMine } from './helpers';

const eco = cfg.economy;

/** Builds an automated mine with the given levels. */
function automatedMine(shaftLevels: number[], elevator: number, logistics: number): GameState {
  let state = debugSetAutoRun(freshState(), true).state;
  state = patchMine(state, (m) => ({
    ...m,
    shafts: shaftLevels.map((level) => ({ ...newShaft(), level })),
    elevator: { ...m.elevator, level: elevator },
    logistics: {
      level: logistics,
      carriers: Array.from({ length: eco.carrierCount(logistics) }, () => idleCarrier(0)),
    },
  }));
  return state;
}

/** Measures cash per second over `seconds` after a warm-up. */
function measureIncome(state: GameState, warmupSec: number, seconds: number): Decimal {
  const warm = runSimulation(state, warmupSec * 1000, 50, cfg).state;
  const start = mine(warm).cash;
  const end = runSimulation(warm, seconds * 1000, 50, cfg).state;
  return mine(end).cash.sub(start).div(seconds);
}

describe('chain throughput equals min(links) — the bottleneck formula holds in the real simulation', () => {
  const cases: [string, number[], number, number][] = [
    ['shafts', [30, 30, 30, 30, 30, 30, 30, 30, 30, 30], 400, 400],
    ['elevator (1 shaft)', [200], 30, 400],
    ['elevator (5 shafts)', [100, 100, 100, 100, 100], 120, 400],
    ['elevator (10 shafts, uneven crates)', [400, 1, 1, 1, 1, 1, 1, 1, 1, 1], 100, 900],
    ['logistics', [60, 60, 60, 60, 60, 60, 60, 60, 60, 60], 900, 260],
  ];

  it.each(cases)('%s bottleneck', (link, shafts, elevator, logistics) => {
    const state = automatedMine(shafts, elevator, logistics);
    const flows = chainFlows(state, MINE, cfg);
    expect(link.startsWith(flows.bottleneck)).toBe(true);
    const measured = measureIncome(state, 90, 300);
    expectClose(measured, flows.income, 0.015);
  });
});

describe('manual operation', () => {
  it('one tap runs exactly one dig cycle that deposits P × cycle into the crate', () => {
    let state = tapUnit(freshState(), MINE, { kind: 'shaft', index: 0 }, cfg).state;
    const cycleMs = eco.shaftCycleMs();
    state = runSimulation(state, cycleMs - 50, 50, cfg).state;
    expect(mine(state).shafts[0]?.stored.eq(0)).toBe(true);
    state = runSimulation(state, 100, 50, cfg).state;
    expectClose(
      mine(state).shafts[0]?.stored ?? ZERO,
      eco.shaftProduction(1, 1).mul(cycleMs / 1000),
    );
    // no second cycle without another tap
    const later = runSimulation(state, cycleMs * 3, 50, cfg).state;
    expectClose(mine(later).shafts[0]?.stored ?? ZERO, mine(state).shafts[0]?.stored ?? ZERO);
  });

  it('a busy unit rejects taps; an automated unit ignores them', () => {
    const tapped = tapUnit(freshState(), MINE, { kind: 'shaft', index: 0 }, cfg);
    expect(tapped.ok).toBe(true);
    const again = tapUnit(tapped.state, MINE, { kind: 'shaft', index: 0 }, cfg);
    expect(again.ok ? 'ok' : again.reason).toBe('busy');
    const auto = debugSetAutoRun(freshState(), true).state;
    const r = tapUnit(auto, MINE, { kind: 'elevator' }, cfg);
    expect(r.ok ? 'ok' : r.reason).toBe('automated');
  });

  it('the elevator trip with a full cage lasts 4 s + 0.6 s per open shaft', () => {
    // Fill every crate so the cage leaves full, then time the trip from tap to unload.
    let state = patchMine(freshState(), (m) => ({
      ...m,
      shafts: Array.from({ length: 5 }, () => ({ ...newShaft(), stored: D('1e30') })),
    }));
    state = tapUnit(state, MINE, { kind: 'elevator' }, cfg).state;
    const capacity = eco.elevatorCapacity(1);
    let unloadedAt: number | null = null;
    for (let i = 0; i < 2000 && unloadedAt === null; i++) {
      const r = stepSimulation(state, 10, cfg);
      state = r.state;
      const e = r.events.find((ev) => ev.type === 'elevatorUnloaded');
      if (e && e.type === 'elevatorUnloaded') {
        unloadedAt = e.at;
        expectClose(e.amount, capacity);
      }
    }
    expect(unloadedAt).toBeCloseTo((4 + 0.6 * 5) * 1000, 6);
  });

  it('carriers sell the depot stock and cash rises by the sale value', () => {
    let state = patchMine(freshState(), (m) => ({ ...m, surfaceStock: D(5) }));
    state = tapUnit(state, MINE, { kind: 'logistics' }, cfg).state;
    const { state: after, events } = runSimulation(state, eco.logisticsCycleMs() + 1000, 50, cfg);
    const sales = events.filter((e) => e.type === 'saleCompleted');
    expect(sales).toHaveLength(1);
    expectClose(mine(after).cash, 5);
    expect(mine(after).surfaceStock.eq(0)).toBe(true);
    expectClose(after.stats.totalEarned, 5);
  });

  it('tapping logistics with an empty depot reports it instead of selling nothing silently', () => {
    const state = tapUnit(freshState(), MINE, { kind: 'logistics' }, cfg).state;
    const { events } = runSimulation(state, 2000, 50, cfg);
    expect(events.some((e) => e.type === 'depotEmpty')).toBe(true);
  });

  it('the full loop produces the first sale: shaft → elevator → carriers → cash', () => {
    let state = freshState();
    state = tapUnit(state, MINE, { kind: 'shaft', index: 0 }, cfg).state;
    state = runSimulation(state, eco.shaftCycleMs(), 50, cfg).state;
    state = tapUnit(state, MINE, { kind: 'elevator' }, cfg).state;
    state = runSimulation(state, eco.elevatorTripMs(1, 1), 50, cfg).state;
    expect(mine(state).surfaceStock.gt(0)).toBe(true);
    state = tapUnit(state, MINE, { kind: 'logistics' }, cfg).state;
    state = runSimulation(state, eco.logisticsCycleMs() + 500, 50, cfg).state;
    expect(mine(state).cash.gte(eco.shaftUpgradeCost(1, 1))).toBe(true);
  });
});

describe('rock barrier', () => {
  function fiveShafts(): GameState {
    return patchMine(freshState(), (m) => ({
      ...m,
      cash: D('1e9'),
      shafts: Array.from({ length: 5 }, () => newShaft()),
    }));
  }

  it('blocks shaft 6 until the free 60 s blast is done', () => {
    let state = fiveShafts();
    expect(quoteUnlock(state, MINE, cfg).status).toBe('barrier');
    const blocked = unlockNextShaft(state, MINE, cfg);
    expect(blocked.ok ? 'ok' : blocked.reason).toBe('blocked');

    const blast = startBarrierBlast(state, MINE, cfg);
    expect(blast.ok).toBe(true);
    state = blast.state;
    expect(mine(state).cash.eq(D('1e9'))).toBe(true); // first barrier is free
    expect(quoteUnlock(state, MINE, cfg).status).toBe('blasting');

    state = runSimulation(state, 59_950, 50, cfg).state;
    expect(quoteUnlock(state, MINE, cfg).status).toBe('blasting');
    const { state: done, events } = runSimulation(state, 100, 50, cfg);
    expect(events.some((e) => e.type === 'barrierCleared')).toBe(true);
    expect(quoteUnlock(done, MINE, cfg).status).toBe('available');
    expect(unlockNextShaft(done, MINE, cfg).ok).toBe(true);
  });
});

describe('determinism and purity', () => {
  it('never mutates the input state', () => {
    let state = automatedMine([30, 20, 10], 60, 60);
    state = runSimulation(state, 30_000, 50, cfg).state;
    const frozen = deepFreeze(state);
    expect(() => runSimulation(frozen, 20_000, 50, cfg)).not.toThrow();
    expect(() => tapUnit(frozen, MINE, { kind: 'shaft', index: 0 }, cfg)).not.toThrow();
  });

  it('is deterministic for identical inputs', () => {
    const a = runSimulation(automatedMine([40, 30], 50, 50), 120_000, 50, cfg).state;
    const b = runSimulation(automatedMine([40, 30], 50, 50), 120_000, 50, cfg).state;
    expect(mine(a).cash.eq(mine(b).cash)).toBe(true);
    expect(a.time).toBe(b.time);
  });

  it('gives (almost) the same result for 50 ms and 250 ms steps', () => {
    const fine = runSimulation(automatedMine([45, 35, 25], 80, 80), 600_000, 50, cfg).state;
    const coarse = runSimulation(automatedMine([45, 35, 25], 80, 80), 600_000, 250, cfg).state;
    expectClose(mine(coarse).cash, mine(fine).cash, 0.01);
  });
});
