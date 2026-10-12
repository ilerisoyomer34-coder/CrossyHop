/**
 * Pure economy formulas (GDD 5.2–5.3). Every number comes from {@link EconomyConfig}; this class
 * only encodes the shape of the formulas. All money values are Decimals.
 *
 * Notation: n = shaft number (1-based), L = unit level (≥ 1), scale = the mine's `mineScale`.
 */
import { D, type Decimal, ZERO } from '../core/BigNum';
import type { EconomyConfig } from '../data/config';

/** Geometric cost curve: cost of going from level L to L+1 is `base × growth^(L-1)`. */
export interface CostCurve {
  base: Decimal;
  growth: number;
}

const MS = 1000;

export class Economy {
  /** Ore capacity of the elevator cage expressed in seconds of nominal flow (GDD: 10 s). */
  readonly elevatorCapacitySeconds: number;
  private readonly logGrowthCache = new Map<number, number>();

  constructor(readonly cfg: EconomyConfig) {
    const e = cfg.elevator;
    this.elevatorCapacitySeconds = e.tripBaseSec + e.tripPerShaftSec * e.referenceDepth;
  }

  // ---------------------------------------------------------------- generic helpers

  /** Total cost of buying `count` levels starting at level `level` (geometric series). */
  bulkCost(curve: CostCurve, level: number, count: number): Decimal {
    if (count <= 0) return ZERO;
    const g = curve.growth;
    const first = curve.base.mul(D(g).pow(level - 1));
    // A single level is returned exactly so that "cash == displayed cost" is always affordable.
    if (count === 1) return first;
    // first × (g^k − 1) / (g − 1)
    return first.mul(D(g).pow(count).sub(1)).div(g - 1);
  }

  /**
   * Maximum number of levels affordable with `cash` (GDD 5.2):
   * k_max = floor( log(1 + cash × (g − 1) / (C × g^(L−1))) / log(g) ), clamped to `maxCount`.
   * The closed form is corrected by ±1 against the exact sum to remove floating-point drift.
   */
  maxAffordable(curve: CostCurve, level: number, cash: Decimal, maxCount = Infinity): number {
    if (maxCount <= 0 || cash.lte(0)) return 0;
    const g = curve.growth;
    const first = curve.base.mul(D(g).pow(level - 1));
    if (cash.lt(first)) return 0;
    const ratio = cash
      .mul(g - 1)
      .div(first)
      .add(1);
    let k = Math.floor(ratio.log10() / this.log10Growth(g));
    k = Math.max(0, Math.min(k, maxCount));
    while (k > 0 && this.bulkCost(curve, level, k).gt(cash)) k--;
    while (k < maxCount && this.bulkCost(curve, level, k + 1).lte(cash)) k++;
    return k;
  }

  private log10Growth(g: number): number {
    let v = this.logGrowthCache.get(g);
    if (v === undefined) {
      v = Math.log10(g);
      this.logGrowthCache.set(g, v);
    }
    return v;
  }

  /** First level ≥ L+1 that is a multiple of `every` (the next milestone), capped at maxLevel. */
  nextMilestone(level: number, every: number, maxLevel: number): number {
    const next = (Math.floor(level / every) + 1) * every;
    return Math.min(next, maxLevel);
  }

  // ---------------------------------------------------------------- shafts

  /** B(n) = baseProd × prodGrowth^(n−1) × scale — production per level, ₵/s. */
  shaftBaseProd(n: number, scale = 1): Decimal {
    const s = this.cfg.shaft;
    return D(s.prodGrowth)
      .pow(n - 1)
      .mul(s.baseProd * scale);
  }

  /** Milestone multiplier for a shaft level: milestoneMult^floor(L / milestoneEvery). */
  shaftMilestoneMultiplier(level: number): Decimal {
    const s = this.cfg.shaft;
    return D(s.milestoneMult).pow(Math.floor(level / s.milestoneEvery));
  }

  /** P(n, L) = B(n) × L × 2^floor(L/25) — shaft production, ₵/s. */
  shaftProduction(n: number, level: number, scale = 1): Decimal {
    if (level <= 0) return ZERO;
    return this.shaftBaseProd(n, scale).mul(level).mul(this.shaftMilestoneMultiplier(level));
  }

  /** C0(n) = baseCost × costGrowthPerShaft^(n−1) × scale — first upgrade cost. */
  shaftFirstUpgradeCost(n: number, scale = 1): Decimal {
    const s = this.cfg.shaft;
    return D(s.costGrowthPerShaft)
      .pow(n - 1)
      .mul(s.baseCost * scale);
  }

  shaftCostCurve(n: number, scale = 1): CostCurve {
    return {
      base: this.shaftFirstUpgradeCost(n, scale),
      growth: this.cfg.shaft.costGrowthPerLevel,
    };
  }

  /** Ck(n, L) = C0(n) × 1.12^(L−1) — cost of L → L+1. */
  shaftUpgradeCost(n: number, level: number, scale = 1): Decimal {
    return this.bulkCost(this.shaftCostCurve(n, scale), level, 1);
  }

  /** U(n) = unlockBase × unlockGrowth^(n−2) × scale, for n ≥ 2. */
  shaftUnlockCost(n: number, scale = 1): Decimal {
    if (n < 2) return ZERO;
    const s = this.cfg.shaft;
    return D(s.unlockGrowth)
      .pow(n - 2)
      .mul(s.unlockBase * scale);
  }

  minerCount(level: number): number {
    return countThresholds(this.cfg.shaft.minerThresholds, level);
  }

  shaftCycleMs(): number {
    const c = this.cfg.shaft.cycle;
    return (2 * c.walkSec + c.digSec + c.dumpSec) * MS;
  }

  /** Ore one miner deposits per completed cycle (so that M miners together produce P(n,L)). */
  shaftLoadPerMiner(n: number, level: number, scale = 1): Decimal {
    const cycleSec = this.shaftCycleMs() / MS;
    return this.shaftProduction(n, level, scale).mul(cycleSec).div(this.minerCount(level));
  }

  // ---------------------------------------------------------------- elevator

  /** A(L) = baseFlow × L × 3^floor(L/25) × scale — nominal flow at the reference depth, ₵/s. */
  elevatorNominalFlow(level: number, scale = 1): Decimal {
    const e = this.cfg.elevator;
    if (level <= 0) return ZERO;
    return D(e.milestoneMult)
      .pow(Math.floor(level / e.milestoneEvery))
      .mul(e.baseFlow * level * scale);
  }

  /** Kap(L) = A(L) × 10 s — ore carried per trip. */
  elevatorCapacity(level: number, scale = 1): Decimal {
    return this.elevatorNominalFlow(level, scale).mul(this.elevatorCapacitySeconds);
  }

  /** Travel speed multiplier: +speedBonus every speedBonusEvery levels (additive). */
  elevatorSpeedMultiplier(level: number): number {
    const e = this.cfg.elevator;
    return 1 + e.speedBonus * Math.floor(level / e.speedBonusEvery);
  }

  /** Travel time between the surface dock and the top of the shaft column (one way, ×1 speed). */
  elevatorSurfaceTravelMs(): number {
    const e = this.cfg.elevator;
    return ((e.tripBaseSec - e.unloadSec - e.fullLoadSec) / 2) * MS;
  }

  /** Travel time past one shaft (one way, ×1 speed). */
  elevatorShaftTravelMs(): number {
    return (this.cfg.elevator.tripPerShaftSec / 2) * MS;
  }

  /** Travel time between two stops (0 = surface dock, n = shaft n) at the given level. */
  elevatorTravelMs(fromStop: number, toStop: number, level: number): number {
    const shafts = Math.abs(toStop - fromStop) * this.elevatorShaftTravelMs();
    const surface = fromStop === 0 || toStop === 0 ? this.elevatorSurfaceTravelMs() : 0;
    return (shafts + surface) / this.elevatorSpeedMultiplier(level);
  }

  /** Time to load `amount` into a cage of `capacity` (a full cage takes `fullLoadSec`). */
  elevatorLoadMs(amount: Decimal, capacity: Decimal): number {
    if (capacity.lte(0) || amount.lte(0)) return 0;
    const fraction = Math.min(1, amount.div(capacity).toNumber());
    return this.cfg.elevator.fullLoadSec * MS * fraction;
  }

  elevatorUnloadMs(): number {
    return this.cfg.elevator.unloadSec * MS;
  }

  /**
   * Duration of a full (saturated) round trip with `openShafts` open shafts: unload + loading a full
   * cage + travel to the deepest shaft and back (travel divided by the speed multiplier).
   * With no speed bonus this is exactly the GDD's 4 s + 0.6 s × open shafts.
   */
  elevatorTripMs(openShafts: number, level: number): number {
    const travel = 2 * this.elevatorTravelMs(0, openShafts, level);
    return this.elevatorUnloadMs() + this.cfg.elevator.fullLoadSec * MS + travel;
  }

  /** Real elevator flow = capacity / full trip time at the current depth, ₵/s. */
  elevatorRealFlow(level: number, openShafts: number, scale = 1): Decimal {
    const tripSec = this.elevatorTripMs(Math.max(1, openShafts), level) / MS;
    return this.elevatorCapacity(level, scale).div(tripSec);
  }

  elevatorCostCurve(scale = 1): CostCurve {
    const e = this.cfg.elevator;
    return { base: D(e.baseCost * scale), growth: e.costGrowthPerLevel };
  }

  elevatorUpgradeCost(level: number, scale = 1): Decimal {
    return this.bulkCost(this.elevatorCostCurve(scale), level, 1);
  }

  // ---------------------------------------------------------------- logistics

  /** T(L) = baseFlow × L × 3^floor(L/25) × scale — carrier flow, ₵/s. */
  logisticsFlow(level: number, scale = 1): Decimal {
    const l = this.cfg.logistics;
    if (level <= 0) return ZERO;
    return D(l.milestoneMult)
      .pow(Math.floor(level / l.milestoneEvery))
      .mul(l.baseFlow * level * scale);
  }

  logisticsCostCurve(scale = 1): CostCurve {
    const l = this.cfg.logistics;
    return { base: D(l.baseCost * scale), growth: l.costGrowthPerLevel };
  }

  logisticsUpgradeCost(level: number, scale = 1): Decimal {
    return this.bulkCost(this.logisticsCostCurve(scale), level, 1);
  }

  carrierCount(level: number): number {
    return countThresholds(this.cfg.logistics.carrierThresholds, level);
  }

  logisticsCycleMs(): number {
    const c = this.cfg.logistics.cycle;
    return (c.loadSec + 2 * c.walkSec + c.unloadSec) * MS;
  }

  /** Wagon capacity per carrier so that all carriers together move T(L). */
  wagonCapacity(level: number, scale = 1): Decimal {
    const cycleSec = this.logisticsCycleMs() / MS;
    return this.logisticsFlow(level, scale).mul(cycleSec).div(this.carrierCount(level));
  }
}

/** Number of thresholds ≤ level (miner / carrier counts). */
export function countThresholds(thresholds: readonly number[], level: number): number {
  let count = 0;
  for (const t of thresholds) if (level >= t) count++;
  return Math.max(1, count);
}
