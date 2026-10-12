/**
 * Greedy bot (GDD 13.10 "Açgözlü"): an efficiency-focused, continuously active player without
 * managers, skills, boosts or prestige.
 *
 * Decision rule each tick:
 *  1. Keep the transport links up: if the elevator or logistics flow is below the shaft production,
 *     buy one level of the weaker of the two.
 *  2. Otherwise pick the shaft-side purchase (one level, up to the next milestone, or a new shaft)
 *     with the best "gain per cost" expressed as payback time:
 *         score = time until affordable + cost / Δproduction        (lower is better)
 *     and save up for it — the bot never buys something cheaper in the meantime.
 *  3. Light free/affordable rock barriers as soon as they block the way.
 *
 * With the GDD 5.2 formulas this reproduces the GDD 5.5 progression curve (see tests).
 * It also taps idle manual units, like an attentive player would.
 */
import { Decimal } from '../../core/BigNum';
import type { GameState, UnitRef } from '../../state/GameState';
import {
  buyUnitLevels,
  startBarrierBlast,
  tapUnit,
  unlockNextShaft,
  type ActionResult,
} from '../../state/actions';
import type { GameEvent } from '../../state/events';
import { chainFlows, mineScale, quoteUnlock, unitAutomated } from '../../state/selectors';
import { getMine } from '../../state/update';
import type { GameConfig } from '../GameConfig';

export type BotPlan =
  | { kind: 'levels'; unit: UnitRef; count: number; cost: Decimal; reason: 'transport' | 'payback' }
  | { kind: 'unlock'; cost: Decimal }
  | { kind: 'barrier'; cost: Decimal };

interface Candidate {
  plan: BotPlan;
  gain: Decimal;
  cost: Decimal;
}

/** Chooses what the bot wants to buy next (it may not be affordable yet). */
export function planGreedy(state: GameState, mineId: string, cfg: GameConfig): BotPlan | null {
  const mine = getMine(state, mineId);
  const eco = cfg.economy;
  const scale = mineScale(cfg, mineId);
  const flows = chainFlows(state, mineId, cfg);

  // 1. Transport maintenance.
  const elevatorShort =
    flows.elevator.lt(flows.shafts) && mine.elevator.level < cfg.econ.elevator.maxLevel;
  const logisticsShort =
    flows.logistics.lt(flows.shafts) && mine.logistics.level < cfg.econ.logistics.maxLevel;
  if (elevatorShort && (!logisticsShort || flows.elevator.lte(flows.logistics))) {
    return {
      kind: 'levels',
      unit: { kind: 'elevator' },
      count: 1,
      cost: eco.elevatorUpgradeCost(mine.elevator.level, scale),
      reason: 'transport',
    };
  }
  if (logisticsShort) {
    return {
      kind: 'levels',
      unit: { kind: 'logistics' },
      count: 1,
      cost: eco.logisticsUpgradeCost(mine.logistics.level, scale),
      reason: 'transport',
    };
  }

  // 3. Barriers block everything deeper: light them first.
  const unlock = quoteUnlock(state, mineId, cfg);
  const candidates: Candidate[] = [];
  if (unlock.status === 'barrier' && unlock.barrier) {
    return { kind: 'barrier', cost: unlock.barrier.cost };
  }
  if (unlock.status === 'available') {
    candidates.push({
      plan: { kind: 'unlock', cost: unlock.cost },
      gain: eco.shaftProduction(unlock.shaftNumber, 1, scale),
      cost: unlock.cost,
    });
  }

  // 2. Shaft-side purchases.
  const maxLevel = cfg.econ.shaft.maxLevel;
  const every = cfg.econ.shaft.milestoneEvery;
  mine.shafts.forEach((shaft, i) => {
    const n = i + 1;
    const level = shaft.level;
    if (level >= maxLevel) return;
    const curve = eco.shaftCostCurve(n, scale);
    const now = eco.shaftProduction(n, level, scale);
    const toMilestone = Math.min(every - (level % every), maxLevel - level);
    const counts = toMilestone > 1 ? [1, toMilestone] : [1];
    for (const count of counts) {
      const cost = eco.bulkCost(curve, level, count);
      const gain = eco.shaftProduction(n, level + count, scale).sub(now);
      candidates.push({
        plan: { kind: 'levels', unit: { kind: 'shaft', index: i }, count, cost, reason: 'payback' },
        gain,
        cost,
      });
    }
  });

  const income = flows.income;
  let best: Candidate | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    if (c.gain.lte(0)) continue;
    const wait = income.gt(0)
      ? Decimal.max(c.cost.sub(mine.cash), 0).div(income).toNumber()
      : Infinity;
    const payback = c.cost.div(c.gain).toNumber();
    const score = wait + payback;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best ? best.plan : null;
}

function execute(state: GameState, mineId: string, plan: BotPlan, cfg: GameConfig): ActionResult {
  switch (plan.kind) {
    case 'levels':
      return buyUnitLevels(state, mineId, plan.unit, plan.count, cfg);
    case 'unlock':
      return unlockNextShaft(state, mineId, cfg);
    case 'barrier':
      return startBarrierBlast(state, mineId, cfg);
  }
}

export interface BotOptions {
  /** Tap manual units whenever they are idle (default true). */
  tapUnits?: boolean;
  /** Safety cap on purchases per tick. */
  maxPurchasesPerTick?: number;
}

export interface BotTickResult {
  state: GameState;
  events: GameEvent[];
}

/** One bot "turn": tap idle units, then buy as long as the planned purchase is affordable. */
export function greedyBotTick(
  state: GameState,
  mineId: string,
  cfg: GameConfig,
  options: BotOptions = {},
): BotTickResult {
  const events: GameEvent[] = [];
  let current = state;
  const apply = (r: ActionResult): boolean => {
    if (!r.ok) return false;
    current = r.state;
    for (const e of r.events) events.push(e);
    return true;
  };

  if (options.tapUnits ?? true) {
    const mine = getMine(current, mineId);
    mine.shafts.forEach((s, i) => {
      if (
        s.manualCycleEndsAt === null &&
        !unitAutomated(current, mineId, { kind: 'shaft', index: i })
      ) {
        apply(tapUnit(current, mineId, { kind: 'shaft', index: i }, cfg));
      }
    });
    const anyOre = mine.shafts.some((s) => s.stored.gt(0));
    if (anyOre && mine.elevator.phase.kind === 'idle') {
      apply(tapUnit(current, mineId, { kind: 'elevator' }, cfg));
    }
    const allIdle = mine.logistics.carriers.every((c) => c.phase.kind === 'idle');
    if (allIdle && mine.surfaceStock.gt(0))
      apply(tapUnit(current, mineId, { kind: 'logistics' }, cfg));
  }

  const maxPurchases = options.maxPurchasesPerTick ?? 50;
  for (let i = 0; i < maxPurchases; i++) {
    const plan = planGreedy(current, mineId, cfg);
    if (!plan) break;
    if (getMine(current, mineId).cash.lt(plan.cost)) break;
    if (!apply(execute(current, mineId, plan, cfg))) break;
  }
  return { state: current, events };
}
