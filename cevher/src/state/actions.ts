/**
 * Player (and debug) actions. Every state change outside the simulation step goes through these
 * pure functions: (state, args, cfg) → result with a new state and the events it caused. They never
 * read clocks, randomness or globals — the current time is `state.time`.
 */
import { D, ZERO, type Decimal } from '../core/BigNum';
import { startTrip } from '../sim/ElevatorSystem';
import { barrierAfter, defaultConfig, mineDef, type GameConfig } from '../sim/GameConfig';
import { dispatchIdleCarriers } from '../sim/LogisticsSystem';
import type { GameEvent } from './events';
import { idleCarrier, newShaft } from './factory';
import {
  FLAG_DEBUG_AUTORUN,
  type GameState,
  type MineState,
  type Settings,
  type UnitRef,
} from './GameState';
import { quoteUnlock, quoteUpgrade, unitAutomated, unitEconomy, type BuyMode } from './selectors';
import { getMine, replaceAt, updateMine } from './update';

export type ActionFailReason =
  'insufficientCash' | 'maxLevel' | 'busy' | 'automated' | 'blocked' | 'maxShafts' | 'invalid';

export type ActionResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; state: GameState; events: GameEvent[]; reason: ActionFailReason };

function success(state: GameState, events: GameEvent[] = []): ActionResult {
  return { ok: true, state, events };
}

function failure(state: GameState, reason: ActionFailReason): ActionResult {
  return { ok: false, state, events: [], reason };
}

function withMine(state: GameState, mine: MineState): GameState {
  return updateMine(state, mine.id, () => mine);
}

function countTap(state: GameState): GameState {
  return { ...state, stats: { ...state.stats, taps: state.stats.taps + 1 } };
}

// ------------------------------------------------------------------ manual operation

/** Starts one work cycle of a unit that has no manager (GDD 3: elle çalıştırma). */
export function tapUnit(
  state: GameState,
  mineId: string,
  unit: UnitRef,
  cfg: GameConfig = defaultConfig,
): ActionResult {
  const mine = getMine(state, mineId);
  const eco = cfg.economy;
  if (unitAutomated(state, mineId, unit)) return failure(state, 'automated');
  const now = state.time;
  const event: GameEvent = { type: 'unitStarted', mineId, unit };

  switch (unit.kind) {
    case 'shaft': {
      const shaft = mine.shafts[unit.index];
      if (!shaft) return failure(state, 'invalid');
      if (shaft.manualCycleEndsAt !== null) return failure(state, 'busy');
      const shafts = replaceAt(mine.shafts, unit.index, {
        ...shaft,
        manualCycleEndsAt: now + eco.shaftCycleMs(),
      });
      return success(countTap(withMine(state, { ...mine, shafts })), [event]);
    }
    case 'elevator': {
      const elevator = startTrip(eco, mine.elevator, mine.shafts.length, now);
      if (!elevator) return failure(state, 'busy');
      return success(countTap(withMine(state, { ...mine, elevator })), [event]);
    }
    case 'logistics': {
      const carriers = dispatchIdleCarriers(eco, mine.logistics.carriers, now);
      if (!carriers) return failure(state, 'busy');
      return success(
        countTap(withMine(state, { ...mine, logistics: { ...mine.logistics, carriers } })),
        [event],
      );
    }
  }
}

// ------------------------------------------------------------------ upgrades

function setUnitLevel(mine: MineState, unit: UnitRef, level: number, cfg: GameConfig): MineState {
  switch (unit.kind) {
    case 'shaft': {
      const shaft = mine.shafts[unit.index];
      if (!shaft) return mine;
      return { ...mine, shafts: replaceAt(mine.shafts, unit.index, { ...shaft, level }) };
    }
    case 'elevator':
      return { ...mine, elevator: { ...mine.elevator, level } };
    case 'logistics': {
      const wanted = cfg.economy.carrierCount(level);
      let carriers = mine.logistics.carriers;
      if (carriers.length < wanted) {
        carriers = [
          ...carriers,
          ...Array.from({ length: wanted - carriers.length }, () => idleCarrier(0)),
        ];
      }
      return { ...mine, logistics: { ...mine.logistics, level, carriers } };
    }
  }
}

/** Buys exactly `count` levels (all-or-nothing). */
export function buyUnitLevels(
  state: GameState,
  mineId: string,
  unit: UnitRef,
  count: number,
  cfg: GameConfig = defaultConfig,
): ActionResult {
  if (!Number.isInteger(count) || count < 1) return failure(state, 'invalid');
  const mine = getMine(state, mineId);
  if (unit.kind === 'shaft' && !mine.shafts[unit.index]) return failure(state, 'invalid');
  const u = unitEconomy(mine, unit, cfg);
  if (u.level + count > u.maxLevel) return failure(state, 'maxLevel');
  const cost = cfg.economy.bulkCost(u.curve, u.level, count);
  if (mine.cash.lt(cost)) return failure(state, 'insufficientCash');

  const from = u.level;
  const to = from + count;
  const paid = { ...mine, cash: mine.cash.sub(cost) };
  const next = withMine(state, setUnitLevel(paid, unit, to, cfg));
  const events: GameEvent[] = [{ type: 'levelsBought', mineId, unit, from, to, cost }];
  const crossed = Math.floor(to / u.milestoneEvery) - Math.floor(from / u.milestoneEvery);
  if (crossed > 0) {
    events.push({
      type: 'milestoneReached',
      mineId,
      unit,
      level: Math.floor(to / u.milestoneEvery) * u.milestoneEvery,
      multiplier: u.milestoneMult ** crossed,
    });
  }
  const stats = { ...next.stats, levelsBought: next.stats.levelsBought + count };
  return success({ ...next, stats }, events);
}

/** GDD 13.3 example signature. */
export function buyShaftLevels(
  state: GameState,
  mineId: string,
  shaftIndex: number,
  count: number,
  cfg: GameConfig = defaultConfig,
): ActionResult {
  return buyUnitLevels(state, mineId, { kind: 'shaft', index: shaftIndex }, count, cfg);
}

export function buyElevatorLevels(
  state: GameState,
  mineId: string,
  count: number,
  cfg: GameConfig = defaultConfig,
): ActionResult {
  return buyUnitLevels(state, mineId, { kind: 'elevator' }, count, cfg);
}

export function buyLogisticsLevels(
  state: GameState,
  mineId: string,
  count: number,
  cfg: GameConfig = defaultConfig,
): ActionResult {
  return buyUnitLevels(state, mineId, { kind: 'logistics' }, count, cfg);
}

/** Buys according to a buy mode (×1, ×10, ×50, MAKS, next milestone). */
export function buyWithMode(
  state: GameState,
  mineId: string,
  unit: UnitRef,
  mode: BuyMode,
  cfg: GameConfig = defaultConfig,
): ActionResult {
  const quote = quoteUpgrade(state, mineId, unit, mode, cfg);
  if (quote.maxed) return failure(state, 'maxLevel');
  if (!quote.affordable) return failure(state, 'insufficientCash');
  return buyUnitLevels(state, mineId, unit, quote.count, cfg);
}

// ------------------------------------------------------------------ shafts & barriers

export function unlockNextShaft(
  state: GameState,
  mineId: string,
  cfg: GameConfig = defaultConfig,
): ActionResult {
  const quote = quoteUnlock(state, mineId, cfg);
  if (quote.status === 'maxReached') return failure(state, 'maxShafts');
  if (quote.status !== 'available') return failure(state, 'blocked');
  if (!quote.affordable) return failure(state, 'insufficientCash');
  const mine = getMine(state, mineId);
  const next: MineState = {
    ...mine,
    cash: mine.cash.sub(quote.cost),
    shafts: [...mine.shafts, newShaft()],
    shaftUnlockedAt: [...mine.shaftUnlockedAt, state.time],
  };
  return success(withMine(state, next), [
    { type: 'shaftUnlocked', mineId, index: mine.shafts.length, cost: quote.cost },
  ]);
}

/** Pays for and lights the blast of the barrier below the deepest open shaft. */
export function startBarrierBlast(
  state: GameState,
  mineId: string,
  cfg: GameConfig = defaultConfig,
): ActionResult {
  const quote = quoteUnlock(state, mineId, cfg);
  if (quote.status !== 'barrier' || !quote.barrier) return failure(state, 'invalid');
  if (!quote.barrier.affordable) return failure(state, 'insufficientCash');
  const mine = getMine(state, mineId);
  const endsAt = state.time + quote.barrier.durationSec * 1000;
  const next: MineState = {
    ...mine,
    cash: mine.cash.sub(quote.barrier.cost),
    barrier: { afterShaft: quote.barrier.afterShaft, endsAt },
  };
  return success(withMine(state, next), [
    { type: 'barrierStarted', mineId, afterShaft: quote.barrier.afterShaft, endsAt },
  ]);
}

// ------------------------------------------------------------------ settings

export function updateSettings(state: GameState, patch: Partial<Settings>): ActionResult {
  return success({ ...state, settings: { ...state.settings, ...patch } });
}

// ------------------------------------------------------------------ debug actions (DebugPanel only)

export function debugAddCash(state: GameState, mineId: string, amount: Decimal): ActionResult {
  return success(updateMine(state, mineId, (m) => ({ ...m, cash: m.cash.add(amount) })));
}

export function debugMultiplyCash(state: GameState, mineId: string, factor: number): ActionResult {
  return success(
    updateMine(state, mineId, (m) => ({
      ...m,
      cash: (m.cash.gt(0) ? m.cash : D(100)).mul(factor),
    })),
  );
}

export function debugAddCurrencies(
  state: GameState,
  crystals: number,
  geologyPoints: number,
): ActionResult {
  return success({
    ...state,
    crystals: state.crystals + crystals,
    geologyPoints: state.geologyPoints + geologyPoints,
  });
}

export function debugUnlockAllShafts(
  state: GameState,
  mineId: string,
  cfg: GameConfig = defaultConfig,
): ActionResult {
  const def = mineDef(cfg, mineId);
  const mine = getMine(state, mineId);
  const missing = def.shaftCount - mine.shafts.length;
  if (missing <= 0) return failure(state, 'maxShafts');
  const cleared = cfg.econ.barriers.map((b) => b.afterShaft).filter((n) => n < def.shaftCount);
  const next: MineState = {
    ...mine,
    shafts: [...mine.shafts, ...Array.from({ length: missing }, () => newShaft())],
    shaftUnlockedAt: [
      ...mine.shaftUnlockedAt,
      ...Array.from({ length: missing }, () => state.time),
    ],
    clearedBarriers: [...new Set([...mine.clearedBarriers, ...cleared])],
    barrier: null,
  };
  const events: GameEvent[] = Array.from({ length: missing }, (_, k) => ({
    type: 'shaftUnlocked' as const,
    mineId,
    index: mine.shafts.length + k,
    cost: ZERO,
  }));
  return success(withMine(state, next), events);
}

export function debugFinishBarrier(
  state: GameState,
  mineId: string,
  cfg: GameConfig = defaultConfig,
): ActionResult {
  const mine = getMine(state, mineId);
  if (mine.barrier) {
    return success(withMine(state, { ...mine, barrier: { ...mine.barrier, endsAt: state.time } }));
  }
  const open = mine.shafts.length;
  if (barrierAfter(cfg, open) && !mine.clearedBarriers.includes(open)) {
    return success(withMine(state, { ...mine, barrier: { afterShaft: open, endsAt: state.time } }));
  }
  return failure(state, 'invalid');
}

export function setFlag(state: GameState, flag: string, value: boolean): ActionResult {
  return success({ ...state, flags: { ...state.flags, [flag]: value } });
}

export function debugSetAutoRun(state: GameState, value: boolean): ActionResult {
  return setFlag(state, FLAG_DEBUG_AUTORUN, value);
}
