import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { D, type Decimal } from '../src/core/BigNum';
import { debugSetAutoRun, startBarrierBlast, tapUnit, updateSettings } from '../src/state/actions';
import { STATE_VERSION, type GameState, type PlayMode } from '../src/state/GameState';
import { unitAutomated } from '../src/state/selectors';
import { readSave, writeSave } from '../src/state/save/SaveManager';
import { SaveError } from '../src/state/save/SaveError';
import { encodeState } from '../src/state/save/serialize';
import { isAutomated, worksOffline } from '../src/sim/automation';
import { minerCycleStart } from '../src/sim/ShaftSystem';
import { runGreedyBot } from '../src/sim/bots/runBot';
import { applyOffline, calculateOffline } from '../src/sim/OfflineCalculator';
import { runSimulation } from '../src/sim/Simulation';
import { cfg, freshState, MINE, mine, patchMine } from './helpers';

const HOUR = 3_600_000;

function withMode(state: GameState, playMode: PlayMode): GameState {
  const r = updateSettings(state, { playMode });
  expect(r.ok).toBe(true);
  return r.state;
}

/** Five open shafts, levelled up a little, plenty of cash; played in tap mode. */
function midGame(): GameState {
  return runGreedyBot(cfg, { untilShafts: 5, maxSeconds: 1800, mode: 'tap' }).state;
}

/** Ore anywhere in the chain plus cash from sales (sale multiplier is 1 in Phase 0). */
function oreInMine(state: GameState): Decimal {
  const m = mine(state);
  let total = m.cash.add(m.surfaceStock).add(m.elevator.load);
  for (const s of m.shafts) total = total.add(s.stored);
  for (const c of m.logistics.carriers) total = total.add(c.load);
  return total;
}

function allIdle(state: GameState): boolean {
  const m = mine(state);
  return (
    m.shafts.every((s) => s.autoSince === null && s.manualCycleEndsAt === null) &&
    m.elevator.phase.kind === 'idle' &&
    m.logistics.carriers.every((c) => c.phase.kind === 'idle')
  );
}

describe('play mode setting', () => {
  it('starts a new game in tap mode', () => {
    const state = freshState();
    expect(state.settings.playMode).toBe('tap');
    expect(unitAutomated(state, MINE, { kind: 'shaft', index: 0 })).toBe(false);
    expect(unitAutomated(state, MINE, { kind: 'elevator' })).toBe(false);
    expect(unitAutomated(state, MINE, { kind: 'logistics' })).toBe(false);
  });

  it('automatic mode runs every unit while open, but not offline', () => {
    const state = withMode(freshState(), 'auto');
    const m = mine(state);
    for (const unit of [m.shafts[0], m.elevator, m.logistics]) {
      expect(unit && isAutomated(state, unit)).toBe(true);
      expect(unit && worksOffline(state, unit)).toBe(false);
    }
  });

  it('the debug manager simulation still counts as offline-capable', () => {
    const state = debugSetAutoRun(freshState(), true).state;
    expect(worksOffline(state, mine(state).elevator)).toBe(true);
  });

  it('earns without a single tap in automatic mode', () => {
    const state = withMode(freshState(), 'auto');
    const after = runSimulation(state, 60_000, 50, cfg);
    expect(mine(after.state).cash.gt(0)).toBe(true);
    expect(after.events.some((e) => e.type === 'saleCompleted')).toBe(true);
    expect(after.state.stats.taps).toBe(0);
  });

  it('produces exactly as fast as the manager-driven automation (same speed, no penalty)', () => {
    const start = midGame();
    const auto = runSimulation(withMode(start, 'auto'), 10 * 60_000, 50, cfg).state;
    const managers = runSimulation(debugSetAutoRun(start, true).state, 10 * 60_000, 50, cfg).state;
    expect(mine(auto).cash.gt(mine(start).cash)).toBe(true);
    expect(JSON.stringify(encodeState(auto).mines)).toBe(
      JSON.stringify(encodeState(managers).mines),
    );
  });

  it('a manual dig cycle and an automatic one take the same time and yield the same ore', () => {
    const cycleMs = cfg.economy.shaftCycleMs();
    const tapped = tapUnit(freshState(), MINE, { kind: 'shaft', index: 0 }, cfg).state;
    const manual = runSimulation(tapped, cycleMs, 50, cfg).state;
    // Automatic: the single miner (offset 0) completes its first cycle after one cycle time.
    const auto = runSimulation(withMode(freshState(), 'auto'), cycleMs, 50, cfg).state;
    const manualOre = mine(manual).shafts[0]?.stored ?? D(0);
    const autoOre = mine(auto).shafts[0]?.stored ?? D(0);
    expect(manualOre.gt(0)).toBe(true);
    expect(autoOre.eq(manualOre)).toBe(true);
  });

  it('switching back to tap mode lets running trips finish, then everything rests', () => {
    let state = runSimulation(withMode(midGame(), 'auto'), 120_000, 50, cfg).state;
    expect(allIdle(state)).toBe(false);
    state = withMode(state, 'tap');
    state = runSimulation(state, 120_000, 50, cfg).state;
    expect(allIdle(state)).toBe(true);
    const cash = mine(state).cash;
    const later = runSimulation(state, 120_000, 50, cfg).state;
    expect(mine(later).cash.eq(cash)).toBe(true);
  });

  it('switching to tap mode lets every miner finish the cycle it is in (no ore lost)', () => {
    const cycleMs = cfg.economy.shaftCycleMs();
    // One shaft with several miners, automated long enough for all of them to be mid-cycle.
    let state = patchMine(freshState(), (m) => ({
      ...m,
      shafts: m.shafts.map((s) => ({ ...s, level: 120 })),
    }));
    const miners = cfg.economy.minerCount(120);
    expect(miners).toBeGreaterThan(3);
    state = runSimulation(withMode(state, 'auto'), 3 * cycleMs + 1234, 50, cfg).state;
    const switchAt = state.time;
    const oreAtSwitch = oreInMine(state);
    const shaft0 = mine(state).shafts[0];
    expect(shaft0?.autoSince).not.toBeNull();
    // Cycles that are running at the switch (one per miner whose chain has started).
    const running = Array.from({ length: miners }, (_, j) =>
      shaft0 ? minerCycleStart(shaft0, j, switchAt, cycleMs) : null,
    ).filter((start) => start !== null).length;
    expect(running).toBe(miners);

    state = withMode(state, 'tap');
    const step = runSimulation(state, 50, 50, cfg).state;
    // Nobody snaps home: miners are still mid-cycle right after the switch...
    const after = mine(step).shafts[0];
    const posed = Array.from({ length: miners }, (_, j) =>
      after ? minerCycleStart(after, j, step.time, cycleMs) : null,
    ).filter((start) => start !== null).length;
    expect(posed).toBe(miners);
    // ...tapping is refused while they finish...
    expect(tapUnit(step, MINE, { kind: 'shaft', index: 0 }, cfg).ok).toBe(false);

    // ...and exactly one more load per miner arrives, then the shaft rests and can be tapped.
    const done = runSimulation(step, 2 * cycleMs, 50, cfg).state;
    const load = cfg.economy.shaftLoadPerMiner(1, 120, 1);
    // Elevator and carriers only move ore (and sell it 1:1), so any increase came from the miners.
    const delivered = oreInMine(done).sub(oreAtSwitch);
    expect(delivered.div(load).toNumber()).toBeCloseTo(miners, 6);
    expect(mine(done).shafts[0]?.autoSince).toBeNull();
    expect(mine(done).shafts[0]?.autoUntil).toBeNull();
    expect(tapUnit(done, MINE, { kind: 'shaft', index: 0 }, cfg).ok).toBe(true);
  });

  it('switching back to automatic while miners wind down continues the loop seamlessly', () => {
    const cycleMs = cfg.economy.shaftCycleMs();
    const base = patchMine(withMode(freshState(), 'auto'), (m) => ({
      ...m,
      shafts: m.shafts.map((s) => ({ ...s, level: 60 })),
    }));
    const warm = runSimulation(base, 2 * cycleMs + 700, 50, cfg).state;
    const steady = runSimulation(warm, 4 * cycleMs, 50, cfg).state;

    let toggled = runSimulation(withMode(warm, 'tap'), 300, 50, cfg).state;
    expect(mine(toggled).shafts[0]?.autoUntil).not.toBeNull();
    toggled = runSimulation(withMode(toggled, 'auto'), 4 * cycleMs - 300, 50, cfg).state;
    expect(mine(toggled).shafts[0]?.autoUntil).toBeNull();
    // A short detour to tap mode never creates ore; at most it loses cycles that began meanwhile.
    const a = mine(steady).shafts[0]?.stored ?? D(0);
    const b = mine(toggled).shafts[0]?.stored ?? D(0);
    expect(b.lte(a)).toBe(true);
    expect(b.gt(0)).toBe(true);
  });

  it('switching to automatic mode lets a running manual cycle finish first', () => {
    const tapped = tapUnit(freshState(), MINE, { kind: 'shaft', index: 0 }, cfg).state;
    const endsAt = mine(tapped).shafts[0]?.manualCycleEndsAt;
    expect(endsAt).not.toBeNull();
    const next = runSimulation(withMode(tapped, 'auto'), 50, 50, cfg).state;
    expect(mine(next).shafts[0]?.autoSince).toBe(endsAt);
  });

  it('tapping an automated unit is refused (nothing to do)', () => {
    const state = withMode(freshState(), 'auto');
    const r = tapUnit(state, MINE, { kind: 'elevator' }, cfg);
    expect(r.ok).toBe(false);
  });
});

describe('automatic mode while the game is closed', () => {
  it('earns nothing offline (production stops with the game)', () => {
    const state = withMode(midGame(), 'auto');
    const report = calculateOffline(state, 0, 2 * HOUR, cfg);
    expect(report.totalEarned.eq(0)).toBe(true);
    expect(mine(applyOffline(state, report)).cash.eq(mine(state).cash)).toBe(true);
  });

  it('still lets a barrier blast burn down while away', () => {
    let state = patchMine(midGame(), (m) => ({ ...m, barrier: null, cash: D(1e9) }));
    state = withMode(startBarrierBlast(state, MINE, cfg).state, 'auto');
    const after = applyOffline(state, calculateOffline(state, 0, 2 * HOUR, cfg));
    expect(mine(after).barrier?.endsAt).toBe(after.time);
  });
});

describe('save schema v2 (play mode)', () => {
  const fixture = readFileSync(new URL('./fixtures/save-v1.txt', import.meta.url), 'utf8').trim();

  it('migrates a real v1 save from game 0.2.0 and keeps everything else', () => {
    expect(STATE_VERSION).toBe(2);
    expect((JSON.parse(fixture) as { v: number }).v).toBe(1);
    const { state } = readSave(fixture, cfg);
    expect(state.version).toBe(2);
    expect(state.settings).toEqual({ locale: 'en', notation: 'scientific', playMode: 'tap' });
    expect(mine(state).shafts).toHaveLength(5);
    expect(mine(state).shafts.every((sh) => sh.autoUntil === null)).toBe(true);
    expect(mine(state).cash.eq(D('123456.75'))).toBe(true);
    expect(mine(state).barrier).toEqual({ afterShaft: 5, endsAt: 294_250 });
    expect(state.time).toBe(234_250);
    // The migrated game keeps running and the barrier clears on time.
    const later = runSimulation(state, 60_000, 50, cfg).state;
    expect(mine(later).barrier).toBeNull();
    expect(mine(later).clearedBarriers).toContain(5);
  });

  it('writes v2 and round-trips the play mode', () => {
    const state = withMode(freshState(), 'auto');
    const raw = writeSave(state, 7);
    expect((JSON.parse(raw) as { v: number }).v).toBe(2);
    expect(readSave(raw, cfg).state.settings.playMode).toBe('auto');
  });

  it('rejects an unknown play mode', () => {
    const state = {
      ...freshState(),
      settings: { locale: 'tr', notation: 'short', playMode: 'turbo' },
    };
    const raw = writeSave(state as unknown as GameState, 7);
    expect(() => readSave(raw, cfg)).toThrow(SaveError);
  });
});
