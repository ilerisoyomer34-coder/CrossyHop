import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { D, ZERO } from '../src/core/BigNum';
import economyJson from '../src/data/economy.json';
import {
  buyElevatorLevels,
  debugAddCash,
  debugSetAutoRun,
  debugUnlockAllShafts,
  tapUnit,
  unlockNextShaft,
} from '../src/state/actions';
import { idleCarrier } from '../src/state/factory';
import { STATE_VERSION, type GameState } from '../src/state/GameState';
import { chainFlows, quoteUnlock } from '../src/state/selectors';
import { readSave, writeSave } from '../src/state/save/SaveManager';
import { SaveError } from '../src/state/save/SaveError';
import { encodeState } from '../src/state/save/serialize';
import { runGreedyBot } from '../src/sim/bots/runBot';
import { createGameConfig, mineDef, oreForShaft } from '../src/sim/GameConfig';
import { automatedIncomePerSec } from '../src/sim/OfflineCalculator';
import { runSimulation } from '../src/sim/Simulation';
import { relayThroughput, startsZone, zoneCount, zoneOfShaft, zoneView } from '../src/sim/zones';
import { cfg, elevatorOf, expectClose, freshState, MINE, mine, patchMine } from './helpers';

const eco = cfg.economy;

/** All 36 shafts open (barriers cleared), every unit at a decent level, automated. */
function fullMine(): GameState {
  let state = debugUnlockAllShafts(freshState(), MINE, cfg).state;
  state = debugSetAutoRun(state, true).state;
  return patchMine(state, (m) => ({
    ...m,
    shafts: m.shafts.map((s) => ({ ...s, level: 50 })),
    elevators: m.elevators.map((e) => ({ ...e, level: 400 })),
    logistics: {
      level: 900,
      carriers: Array.from({ length: eco.carrierCount(900) }, () => idleCarrier(0)),
    },
  }));
}

/** Ore anywhere in the chain plus cash (sale multiplier is 1). */
function oreInMine(state: GameState) {
  const m = mine(state);
  let total = m.cash.add(m.surfaceStock);
  for (const s of m.shafts) total = total.add(s.stored);
  for (const e of m.elevators) total = total.add(e.load);
  for (const st of m.stations) total = total.add(st);
  for (const c of m.logistics.carriers) total = total.add(c.load);
  return total;
}

describe('deep mine content', () => {
  const def = mineDef(cfg, MINE);

  it('goes 36 floors deep with the ore order the player asked for', () => {
    expect(def.shaftCount).toBe(36);
    const ores = Array.from({ length: 36 }, (_, i) => oreForShaft(def, i + 1));
    const runs: [string, number][] = [];
    for (const ore of ores) {
      const last = runs.at(-1);
      if (last && last[0] === ore) last[1]++;
      else runs.push([ore, 1]);
    }
    expect(runs).toEqual([
      ['coal', 3],
      ['copper', 3],
      ['iron', 4],
      ['gold', 3],
      ['diamond', 4],
      ['ruby', 3],
      ['emerald', 3],
      ['sapphire', 3],
      ['opal', 3],
      ['blackOpal', 3],
      ['fireStone', 3],
      ['magma', 1],
    ]);
  });

  it('has a rock barrier every 5 floors, at most 2 hours long', () => {
    const barriers = cfg.econ.barriers;
    expect(barriers.map((b) => b.afterShaft)).toEqual([5, 10, 15, 20, 25, 30, 35]);
    expect(barriers.map((b) => b.durationSec)).toEqual([60, 900, 3600, 7200, 7200, 7200, 7200]);
  });

  it('keeps the GDD unlock costs up to floor 10 and grows gentler below it', () => {
    expectClose(eco.shaftUnlockCost(10), 60 * 9 ** 8);
    const g = cfg.econ.shaft.deepUnlock.growth;
    expect(g).toBeLessThan(cfg.econ.shaft.unlockGrowth);
    expectClose(eco.shaftUnlockCost(11), 60 * 9 ** 8 * g);
    expectClose(eco.shaftUnlockCost(36), 60 * 9 ** 8 * g ** 26);
  });

  it('keeps transport flows unchanged below the deep milestone level', () => {
    // 3^floor(L/25) up to level 249, the stronger deep multiplier only past it.
    expectClose(eco.logisticsFlow(249), 6 * 249 * 3 ** 9);
    const deep = cfg.econ.logistics.deepMilestone;
    expectClose(eco.logisticsFlow(300), 6 * 300 * 3 ** 10 * deep.mult ** 2);
  });
});

describe('elevator zones', () => {
  it('maps shafts to zones of ten', () => {
    expect([0, 9, 10, 19, 20, 35].map((i) => zoneOfShaft(cfg, i))).toEqual([0, 0, 1, 1, 2, 3]);
    expect([1, 10, 11, 20, 21, 36].map((n) => zoneCount(cfg, n))).toEqual([1, 1, 2, 2, 3, 4]);
    expect([0, 9, 10, 11, 20, 30].map((i) => startsZone(cfg, i))).toEqual([
      false,
      false,
      true,
      false,
      true,
      true,
    ]);
  });

  it('describes each zone route: shafts plus the station below while a deeper zone is open', () => {
    const m = mine(fullMine());
    expect(m.elevators).toHaveLength(4);
    expect(m.stations).toHaveLength(3);
    expect(zoneView(cfg, m, 0)).toEqual({
      zone: 0,
      first: 0,
      count: 10,
      hasStationBelow: true,
      deepestStop: 11,
    });
    expect(zoneView(cfg, m, 3)).toEqual({
      zone: 3,
      first: 30,
      count: 6,
      hasStationBelow: false,
      deepestStop: 6,
    });
  });

  it('opening floor 11 builds elevator 2 and the first transfer station', () => {
    let state = debugUnlockAllShafts(freshState(), MINE, cfg).state;
    state = patchMine(state, (m) => ({
      ...m,
      shafts: m.shafts.slice(0, 10),
      shaftUnlockedAt: m.shaftUnlockedAt.slice(0, 10),
      elevators: m.elevators.slice(0, 1),
      stations: [],
    }));
    expect(quoteUnlock(state, MINE, cfg).newElevator).toBe(1);
    state = debugAddCash(state, MINE, D('1e40')).state;
    const r = unlockNextShaft(state, MINE, cfg);
    expect(r.ok).toBe(true);
    expect(mine(r.state).elevators).toHaveLength(2);
    expect(elevatorOf(mine(r.state), 1).level).toBe(1);
    expect(mine(r.state).stations.map((s) => s.toNumber())).toEqual([0]);
    expect(r.events.some((e) => e.type === 'elevatorBuilt' && e.index === 1)).toBe(true);
    // Floor 12 does not build another one.
    expect(quoteUnlock(r.state, MINE, cfg).newElevator).toBeNull();
  });

  it('deep elevators have their own levels and zone-scaled prices', () => {
    // Cash just above the price so the difference stays exact in Decimal precision.
    const price = eco.elevatorUpgradeCost(400, eco.elevatorZoneCostScale(2));
    const state = debugAddCash(fullMine(), MINE, price.mul(1.5)).state;
    const before = mine(state).cash;
    const r = buyElevatorLevels(state, MINE, 1, cfg, 2);
    expect(r.ok).toBe(true);
    expect(elevatorOf(mine(r.state), 2).level).toBe(401);
    expect(elevatorOf(mine(r.state), 0).level).toBe(400);
    const paid = before.sub(mine(r.state).cash);
    expectClose(paid, eco.elevatorUpgradeCost(400, eco.elevatorZoneCostScale(2)));
    expect(buyElevatorLevels(state, MINE, 1, cfg, 9).ok).toBe(false);
  });
});

describe('relay transport', () => {
  it('computes the relay throughput and the elevator that limits it', () => {
    const P = [D(10), D(100), D(1000)];
    expect(relayThroughput(P, [D(2000), D(2000), D(2000)])).toMatchObject({ binding: null });
    expect(relayThroughput(P, [D(2000), D(2000), D(2000)]).delivered.eq(1110)).toBe(true);
    // The deepest elevator is weak: zones above still deliver in full.
    const deep = relayThroughput(P, [D(2000), D(2000), D(50)]);
    expect(deep.delivered.eq(160)).toBe(true);
    expect(deep.binding).toBe(2);
    // A middle elevator limits the relay: the surface elevator has room to spare.
    const middle = relayThroughput(P, [D(500), D(50), D(2000)]);
    expect(middle.delivered.eq(60)).toBe(true);
    expect(middle.binding).toBe(1);
    // The surface elevator binds first when it cannot carry what arrives.
    expect(relayThroughput(P, [D(40), D(50), D(2000)]).binding).toBe(0);
  });

  it('moves deep ore up through every station to the surface and sells it', () => {
    let state = fullMine();
    const start = oreInMine(state);
    const cashBefore = mine(state).cash;
    state = runSimulation(state, 120_000, 50, cfg).state;
    const m = mine(state);
    expect(m.cash.gt(cashBefore)).toBe(true);
    // Ore is conserved: only miners create it, transport just moves (and sells it 1:1).
    const produced = oreInMine(state).sub(start);
    expect(produced.gt(0)).toBe(true);
    // Every elevator has been working (each phase starts after the mine was opened at t = 0).
    for (const e of m.elevators) expect(e.phase.startAt).toBeGreaterThan(0);
  });

  it('a saturated deep elevator delivers exactly its GDD flow into its station', () => {
    // Zone 2's elevator is the limit; measure what it hands to station 1 per second.
    let state = fullMine();
    state = patchMine(state, (m) => ({
      ...m,
      elevators: m.elevators.map((e, z) => (z === 2 ? { ...e, level: 60 } : e)),
      // Plenty of ore waiting in zone 2 so the elevator always fills up.
      shafts: m.shafts.map((s, i) => (i >= 20 && i < 30 ? { ...s, stored: D('1e300') } : s)),
    }));
    state = runSimulation(state, 60_000, 50, cfg).state; // warm-up
    const e2 = chainFlows(state, MINE, cfg).elevators[2] ?? ZERO;
    // Over a long window the deep elevator's deliveries match capacity / trip.
    const window = 600_000;
    let delivered = ZERO;
    let current = state;
    const stepMs = 50;
    for (let t = 0; t < window; t += stepMs) {
      const prev = elevatorOf(mine(current), 2);
      const next = runSimulation(current, stepMs, stepMs, cfg).state;
      const after = elevatorOf(mine(next), 2);
      if (prev.phase.kind === 'unload' && after.phase.kind !== 'unload') {
        delivered = delivered.add(prev.load);
      }
      current = next;
    }
    expectClose(delivered.div(window / 1000), e2, 0.03);
  });

  it('names the shallowest limiting elevator as the one to upgrade', () => {
    let state = fullMine();
    state = patchMine(state, (m) => ({
      ...m,
      elevators: m.elevators.map((e, z) => (z === 1 ? { ...e, level: 30 } : e)),
    }));
    const flows = chainFlows(state, MINE, cfg);
    expect(flows.bottleneck).toBe('elevator');
    expect(flows.weakestElevator).toBe(1);
    expect(flows.elevator.lt(flows.shafts)).toBe(true);
  });

  it('a single-zone mine behaves exactly like before (one elevator, real flow)', () => {
    const state = freshState();
    const flows = chainFlows(state, MINE, cfg);
    expect(flows.elevators).toHaveLength(1);
    expectClose(flows.elevator, eco.elevatorRealFlow(1, 1));
  });
});

describe('offline income with several elevators', () => {
  it('a deep elevator without a manager only cuts off the zones below it', () => {
    let state = fullMine();
    state = debugSetAutoRun(state, false).state;
    // Strong transport, managers everywhere except elevator 3 (zone 31–36).
    state = patchMine(state, (m) => ({
      ...m,
      shafts: m.shafts.map((s) => ({ ...s, managerId: 'm' })),
      elevators: m.elevators.map((e, z) =>
        z === 3 ? { ...e, level: 1000 } : { ...e, level: 1000, managerId: 'm' },
      ),
      logistics: { ...m.logistics, level: 1500, managerId: 'm' },
    }));
    const partial = automatedIncomePerSec(state, MINE, cfg);
    const all = automatedIncomePerSec(
      patchMine(state, (m) => ({
        ...m,
        elevators: m.elevators.map((e) => ({ ...e, managerId: 'm' })),
      })),
      MINE,
      cfg,
    );
    expect(partial.gt(0)).toBe(true);
    expect(partial.lt(all)).toBe(true);
  });
});

describe('save schema v3 (relay elevators)', () => {
  const fixture = readFileSync(new URL('./fixtures/save-v2.txt', import.meta.url), 'utf8').trim();

  it('migrates a real v2 save from game 0.3.0 (elevator mid-trip)', () => {
    expect((JSON.parse(fixture) as { v: number }).v).toBe(2);
    const { state } = readSave(fixture, cfg);
    expect(state.version).toBe(STATE_VERSION);
    const m = mine(state);
    expect(m.elevators).toHaveLength(1);
    expect(m.stations).toEqual([]);
    expect(elevatorOf(m).level).toBe(75);
    expect(elevatorOf(m).phase.kind).toBe('up');
    expect(elevatorOf(m).load.eq(D('80634.4'))).toBe(true);
    expect(state.settings.playMode).toBe('auto');
    // The game keeps running: the cage arrives and unloads.
    const later = runSimulation(state, 30_000, 50, cfg).state;
    expect(mine(later).cash.gt(m.cash)).toBe(true);
  });

  it('round-trips a full mine with four elevators and stocked stations', () => {
    const state = runSimulation(fullMine(), 30_000, 50, cfg).state;
    const { state: loaded } = readSave(writeSave(state, 5), cfg);
    expect(JSON.stringify(encodeState(loaded))).toBe(
      JSON.stringify(encodeState({ ...state, lastSavedAt: 5 })),
    );
    // And the continuation is identical.
    const a = runSimulation(state, 20_000, 50, cfg).state;
    const b = runSimulation(loaded, 20_000, 50, cfg).state;
    expect(JSON.stringify(encodeState(b).mines)).toBe(JSON.stringify(encodeState(a).mines));
  });

  it('rejects a save whose elevator count does not match its shafts', () => {
    const state = fullMine();
    const broken = patchMine(state, (m) => ({ ...m, elevators: m.elevators.slice(0, 2) }));
    expect(() => readSave(writeSave(broken, 1), cfg)).toThrow(SaveError);
  });
});

describe('balance: digging to the magma core', () => {
  it('a continuously active automatic player reaches floor 36 in about 3 hours of play', () => {
    // Barrier waits run in real time (also while the game is closed); measure production pace.
    const econ = structuredClone(economyJson);
    econ.barriers = econ.barriers.map((b) => ({ ...b, durationSec: 0.05 }));
    const fast = createGameConfig(econ);
    const run = runGreedyBot(fast, {
      untilShafts: 36,
      maxSeconds: 6 * 3600,
      mode: 'auto',
      stepMs: 250,
      botEverySteps: 1,
    });
    const at = (n: number) => run.unlocks.find((u) => u.shaft === n)?.seconds ?? Infinity;
    // Floors 1–10 keep the GDD pace (~40 min); the whole mine takes ~3 h.
    expect(at(10) / 60).toBeGreaterThan(25);
    expect(at(10) / 60).toBeLessThan(45);
    expect(at(36) / 3600).toBeGreaterThan(2.2);
    expect(at(36) / 3600).toBeLessThan(3.8);
    // No floor takes more than 20 minutes on its own after floor 10 (steady pace).
    for (let n = 12; n <= 36; n++) expect(at(n) - at(n - 1)).toBeLessThan(20 * 60);
  });

  it('a tapping player can operate every elevator', () => {
    const state = fullMine();
    const manual = debugSetAutoRun(state, false).state;
    for (let z = 0; z < 4; z++) {
      expect(tapUnit(manual, MINE, { kind: 'elevator', index: z }, cfg).ok).toBe(true);
    }
  });
});
