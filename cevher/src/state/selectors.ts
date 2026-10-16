/**
 * Derived, read-only views of the state (flows, bottleneck, purchase quotes). Pure functions; the
 * UI, the debug panel and the bots all use the same numbers.
 */
import { D, type Decimal, ZERO } from '../core/BigNum';
import { isAutomated } from '../sim/automation';
import type { CostCurve } from '../sim/Economy';
import { barrierAfter, mineDef, oreForShaft, type GameConfig } from '../sim/GameConfig';
import { incomeMultiplier } from '../sim/Multipliers';
import { relayThroughput, startsZone, zoneOfShaft, zoneView } from '../sim/zones';
import type { GameState, MineState, UnitRef } from './GameState';
import { getMine } from './update';

export type ChainLink = 'shafts' | 'elevator' | 'logistics';
export const CHAIN_ORDER: readonly ChainLink[] = ['shafts', 'elevator', 'logistics'];

export interface ChainFlows {
  /** Σ P(n, L) of all open shafts, ₵/s. */
  shafts: Decimal;
  /**
   * Elevator link, ₵/s. When an elevator limits the chain this is what the elevators deliver to the
   * surface; otherwise it is the throughput they could reach if every shaft produced proportionally
   * more (≥ `shafts`), i.e. their headroom. With one elevator it is simply its real flow.
   */
  elevator: Decimal;
  /** Real flow of each zone elevator (capacity / full trip), ₵/s. */
  elevators: Decimal[];
  /** Production of each elevator zone, ₵/s. */
  zones: Decimal[];
  /** Elevator to upgrade first: the shallowest limiting one, else the one with least headroom. */
  weakestElevator: number;
  /** Nominal flow A(L) of the surface elevator at the reference depth (debug), ₵/s. */
  elevatorNominal: Decimal;
  /** Logistics flow T(L), ₵/s. */
  logistics: Decimal;
  /** Sale multiplier (GDD 5.6). */
  multiplier: number;
  /** Potential income = min(links) × multiplier, ₵/s. */
  income: Decimal;
  bottleneck: ChainLink;
}

export function mineScale(cfg: GameConfig, mineId: string): number {
  return mineDef(cfg, mineId).mineScale;
}

export function activeMine(state: GameState): MineState {
  return getMine(state, state.activeMineId);
}

/** Smallest link; ties go to the earlier link in the chain (shafts → elevator → logistics). */
export function bottleneckOf(flows: Record<ChainLink, Decimal>): ChainLink {
  let best: ChainLink = 'shafts';
  for (const link of CHAIN_ORDER) {
    if (flows[link].lt(flows[best])) best = link;
  }
  return best;
}

export function shaftsFlow(mine: MineState, cfg: GameConfig): Decimal {
  const scale = mineScale(cfg, mine.id);
  let total = ZERO;
  mine.shafts.forEach((s, i) => {
    total = total.add(cfg.economy.shaftProduction(i + 1, s.level, scale));
  });
  return total;
}

/** Production of each elevator zone, ₵/s. */
export function zoneProductions(mine: MineState, cfg: GameConfig): Decimal[] {
  const scale = mineScale(cfg, mine.id);
  const zones: Decimal[] = mine.elevators.map(() => ZERO);
  mine.shafts.forEach((s, i) => {
    const z = Math.min(zoneOfShaft(cfg, i), zones.length - 1);
    zones[z] = (zones[z] ?? ZERO).add(cfg.economy.shaftProduction(i + 1, s.level, scale));
  });
  return zones;
}

/** Real flow of the elevator of `zone` (capacity / full trip over its stops), ₵/s. */
export function elevatorFlow(mine: MineState, zone: number, cfg: GameConfig): Decimal {
  const elevator = mine.elevators[zone];
  if (!elevator) return ZERO;
  const eco = cfg.economy;
  const scale = mineScale(cfg, mine.id) * eco.elevatorZoneFlowScale(zone);
  return eco.elevatorRealFlow(elevator.level, zoneView(cfg, mine, zone).deepestStop, scale);
}

export function chainFlows(state: GameState, mineId: string, cfg: GameConfig): ChainFlows {
  const mine = getMine(state, mineId);
  const eco = cfg.economy;
  const scale = mineScale(cfg, mineId);
  const zones = zoneProductions(mine, cfg);
  const shafts = zones.reduce((sum, p) => sum.add(p), ZERO);
  const elevators = mine.elevators.map((_, z) => elevatorFlow(mine, z, cfg));
  const relay = relayThroughput(zones, elevators);

  let elevator: Decimal;
  let weakestElevator = 0;
  if (relay.binding !== null) {
    elevator = relay.delivered;
    weakestElevator = relay.binding;
  } else {
    // Headroom: the largest proportional scale-up of production every elevator could still carry.
    let need = ZERO;
    let minRatio: Decimal | null = null;
    for (let z = elevators.length - 1; z >= 0; z--) {
      need = need.add(zones[z] ?? ZERO);
      if (need.lte(0)) continue;
      const ratio = (elevators[z] ?? ZERO).div(need);
      if (minRatio === null || ratio.lte(minRatio)) {
        minRatio = ratio;
        weakestElevator = z;
      }
    }
    elevator = minRatio === null ? (elevators[0] ?? ZERO) : shafts.mul(minRatio);
  }

  const elevatorNominal = eco.elevatorNominalFlow(mine.elevators[0]?.level ?? 0, scale);
  const logistics = eco.logisticsFlow(mine.logistics.level, scale);
  const bottleneck = bottleneckOf({ shafts, elevator, logistics });
  const multiplier = incomeMultiplier(state, mineId, cfg).total;
  const min = { shafts, elevator, logistics }[bottleneck];
  return {
    shafts,
    elevator,
    elevators,
    zones,
    weakestElevator,
    elevatorNominal,
    logistics,
    multiplier,
    income: min.mul(multiplier),
    bottleneck,
  };
}

// ------------------------------------------------------------------ units & purchases

export type BuyMode = 'x1' | 'x10' | 'x50' | 'max' | 'milestone';
export const BUY_MODES: readonly BuyMode[] = ['x1', 'x10', 'x50', 'max', 'milestone'];

export interface UnitEconomy {
  level: number;
  maxLevel: number;
  curve: CostCurve;
  milestoneEvery: number;
  milestoneMult: number;
}

export function unitLevel(mine: MineState, unit: UnitRef): number {
  switch (unit.kind) {
    case 'shaft':
      return mine.shafts[unit.index]?.level ?? 0;
    case 'elevator':
      return mine.elevators[unit.index]?.level ?? 0;
    case 'logistics':
      return mine.logistics.level;
  }
}

export function unitEconomy(mine: MineState, unit: UnitRef, cfg: GameConfig): UnitEconomy {
  const eco = cfg.economy;
  const scale = mineScale(cfg, mine.id);
  const level = unitLevel(mine, unit);
  switch (unit.kind) {
    case 'shaft': {
      const c = cfg.econ.shaft;
      return {
        level,
        maxLevel: c.maxLevel,
        curve: eco.shaftCostCurve(unit.index + 1, scale),
        milestoneEvery: c.milestoneEvery,
        milestoneMult: c.milestoneMult,
      };
    }
    case 'elevator': {
      const c = cfg.econ.elevator;
      return {
        level,
        maxLevel: c.maxLevel,
        curve: eco.elevatorCostCurve(scale * eco.elevatorZoneCostScale(unit.index)),
        milestoneEvery: c.milestoneEvery,
        milestoneMult: c.milestoneMult,
      };
    }
    case 'logistics': {
      const c = cfg.econ.logistics;
      return {
        level,
        maxLevel: c.maxLevel,
        curve: eco.logisticsCostCurve(scale),
        milestoneEvery: c.milestoneEvery,
        milestoneMult: c.milestoneMult,
      };
    }
  }
}

export interface UpgradeQuote {
  level: number;
  maxLevel: number;
  /** Levels the purchase would add (≥ 1 unless maxed). */
  count: number;
  cost: Decimal;
  affordable: boolean;
  maxed: boolean;
  nextMilestone: number;
  levelsToMilestone: number;
  milestoneMult: number;
}

/**
 * Price quote for a unit in a buy mode. Fixed modes (×1, ×10, ×50, next milestone) are
 * all-or-nothing; MAKS buys as many as affordable (shows the price of one level if none is).
 */
export function quoteUpgrade(
  state: GameState,
  mineId: string,
  unit: UnitRef,
  mode: BuyMode,
  cfg: GameConfig,
): UpgradeQuote {
  const mine = getMine(state, mineId);
  const u = unitEconomy(mine, unit, cfg);
  const eco = cfg.economy;
  const room = Math.max(0, u.maxLevel - u.level);
  const nextMilestone = eco.nextMilestone(u.level, u.milestoneEvery, u.maxLevel);
  const levelsToMilestone = Math.max(0, nextMilestone - u.level);

  let count: number;
  switch (mode) {
    case 'x1':
      count = 1;
      break;
    case 'x10':
      count = 10;
      break;
    case 'x50':
      count = 50;
      break;
    case 'milestone':
      count = Math.max(1, levelsToMilestone);
      break;
    case 'max':
      count = Math.max(1, eco.maxAffordable(u.curve, u.level, mine.cash, room));
      break;
  }
  count = Math.min(count, room);
  const maxed = room === 0;
  const cost = maxed ? ZERO : eco.bulkCost(u.curve, u.level, count);
  return {
    level: u.level,
    maxLevel: u.maxLevel,
    count,
    cost,
    affordable: !maxed && count > 0 && mine.cash.gte(cost),
    maxed,
    nextMilestone,
    levelsToMilestone,
    milestoneMult: u.milestoneMult,
  };
}

// ------------------------------------------------------------------ shaft unlock & barriers

export type UnlockStatus = 'available' | 'barrier' | 'blasting' | 'maxReached';

export interface UnlockQuote {
  status: UnlockStatus;
  /** 1-based number of the next shaft. */
  shaftNumber: number;
  ore: string;
  /** Index of the elevator built together with this shaft (first shaft of a zone), else null. */
  newElevator: number | null;
  cost: Decimal;
  affordable: boolean;
  barrier: {
    afterShaft: number;
    cost: Decimal;
    durationSec: number;
    endsAt: number | null;
    affordable: boolean;
  } | null;
}

export function quoteUnlock(state: GameState, mineId: string, cfg: GameConfig): UnlockQuote {
  const mine = getMine(state, mineId);
  const def = mineDef(cfg, mineId);
  const scale = def.mineScale;
  const open = mine.shafts.length;
  const shaftNumber = open + 1;
  const ore = oreForShaft(def, Math.min(shaftNumber, def.shaftCount));
  const cost = cfg.economy.shaftUnlockCost(shaftNumber, scale);
  const newElevator = startsZone(cfg, open) ? zoneOfShaft(cfg, open) : null;

  if (open >= def.shaftCount) {
    return {
      status: 'maxReached',
      shaftNumber,
      ore,
      newElevator: null,
      cost: ZERO,
      affordable: false,
      barrier: null,
    };
  }
  const barrierCfg = barrierAfter(cfg, open);
  if (barrierCfg && !mine.clearedBarriers.includes(open)) {
    const barrierCost = cost.mul(barrierCfg.costFactor);
    const active = mine.barrier?.afterShaft === open ? mine.barrier : null;
    return {
      status: active ? 'blasting' : 'barrier',
      shaftNumber,
      ore,
      newElevator,
      cost,
      affordable: false,
      barrier: {
        afterShaft: open,
        cost: barrierCost,
        durationSec: barrierCfg.durationSec,
        endsAt: active ? active.endsAt : null,
        affordable: mine.cash.gte(barrierCost),
      },
    };
  }
  return {
    status: 'available',
    shaftNumber,
    ore,
    newElevator,
    cost,
    affordable: mine.cash.gte(cost),
    barrier: null,
  };
}

// ------------------------------------------------------------------ misc views

export function unitAutomated(state: GameState, mineId: string, unit: UnitRef): boolean {
  const mine = getMine(state, mineId);
  switch (unit.kind) {
    case 'shaft': {
      const s = mine.shafts[unit.index];
      return s ? isAutomated(state, s) : false;
    }
    case 'elevator': {
      const e = mine.elevators[unit.index];
      return e ? isAutomated(state, e) : false;
    }
    case 'logistics':
      return isAutomated(state, mine.logistics);
  }
}

/** True when a manual unit is currently running a tap-started cycle. */
export function unitBusy(state: GameState, mineId: string, unit: UnitRef): boolean {
  const mine = getMine(state, mineId);
  switch (unit.kind) {
    case 'shaft': {
      const shaft = mine.shafts[unit.index];
      // A manual cycle is running, or the miners are finishing their last automatic cycles.
      return shaft !== undefined && (shaft.manualCycleEndsAt !== null || shaft.autoSince !== null);
    }
    case 'elevator':
      return (mine.elevators[unit.index]?.phase.kind ?? 'idle') !== 'idle';
    case 'logistics':
      return mine.logistics.carriers.some((c) => c.phase.kind !== 'idle');
  }
}

/** Shaft whose next level gives the most production per ₵ (the "what should I upgrade?" hint). */
export function bestShaftUpgrade(state: GameState, mineId: string, cfg: GameConfig): number {
  const mine = getMine(state, mineId);
  const eco = cfg.economy;
  const scale = mineScale(cfg, mineId);
  let best = 0;
  let bestRatio: Decimal | null = null;
  mine.shafts.forEach((s, i) => {
    if (s.level >= cfg.econ.shaft.maxLevel) return;
    const n = i + 1;
    const gain = eco
      .shaftProduction(n, s.level + 1, scale)
      .sub(eco.shaftProduction(n, s.level, scale));
    const ratio = gain.div(eco.shaftUpgradeCost(n, s.level, scale));
    if (bestRatio === null || ratio.gt(bestRatio)) {
      bestRatio = ratio;
      best = i;
    }
  });
  return best;
}

export function totalStored(mine: MineState): Decimal {
  return mine.shafts.reduce((sum, s) => sum.add(s.stored), D(0));
}
