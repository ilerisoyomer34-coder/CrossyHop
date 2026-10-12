/**
 * Typed access to the balance / content data files in `src/data/`.
 *
 * All tunable numbers live in JSON. This module gives them static types (the JSON imports are
 * checked against the interfaces at compile time) and validates them at runtime so that a broken
 * config (for example one fetched from a remote URL in Phase 3) fails loudly at startup instead of
 * producing NaN money.
 */
import economyJson from './economy.json';
import minesJson from './mines.json';
import regionsJson from './regions.json';
import feelJson from './feel.json';
import engineJson from './engine.json';

export interface ShaftCycleConfig {
  walkSec: number;
  digSec: number;
  digHits: number;
  dumpSec: number;
}

export interface ShaftConfig {
  baseProd: number;
  prodGrowth: number;
  baseCost: number;
  costGrowthPerShaft: number;
  costGrowthPerLevel: number;
  unlockBase: number;
  unlockGrowth: number;
  milestoneEvery: number;
  milestoneMult: number;
  maxLevel: number;
  minerThresholds: number[];
  cycle: ShaftCycleConfig;
}

export interface ElevatorConfig {
  baseFlow: number;
  baseCost: number;
  costGrowthPerLevel: number;
  milestoneEvery: number;
  milestoneMult: number;
  speedBonusEvery: number;
  speedBonus: number;
  tripBaseSec: number;
  tripPerShaftSec: number;
  /** Depth (open shafts) at which the nominal flow A(L) is defined; capacity = A(L) × trip(ref). */
  referenceDepth: number;
  /** Part of `tripBaseSec` spent unloading at the surface. */
  unloadSec: number;
  /**
   * Part of `tripBaseSec` needed to load a completely full cage. Loading time is proportional to the
   * amount taken at each stop, so a saturated elevator always spends exactly this long loading and a
   * full trip lasts exactly tripBaseSec + tripPerShaftSec × open shafts. The rest of `tripBaseSec`
   * is surface travel; `tripPerShaftSec` is pure travel (down + up past one shaft).
   */
  fullLoadSec: number;
  maxLevel: number;
}

export interface LogisticsCycleConfig {
  loadSec: number;
  walkSec: number;
  unloadSec: number;
}

export interface LogisticsConfig {
  baseFlow: number;
  baseCost: number;
  costGrowthPerLevel: number;
  milestoneEvery: number;
  milestoneMult: number;
  maxLevel: number;
  carrierThresholds: number[];
  cycle: LogisticsCycleConfig;
  manualStaggerSec: number;
}

export interface BarrierConfig {
  afterShaft: number;
  durationSec: number;
  /** Blast cost as a fraction of the unlock cost of the shaft behind the barrier. */
  costFactor: number;
}

export interface OfflineConfig {
  baseEfficiency: number;
  baseCapHours: number;
}

export interface PrestigeConfig {
  thresholdBase: number;
  thresholdGrowth: number;
  rankMult: number;
  maxRank: number;
  jpCoef: number;
  jpDivisor: number;
  jpExponent: number;
}

export interface EconomyConfig {
  startingCash: number;
  shaft: ShaftConfig;
  elevator: ElevatorConfig;
  logistics: LogisticsConfig;
  barriers: BarrierConfig[];
  offline: OfflineConfig;
  prestige: PrestigeConfig;
}

export interface OreBand {
  fromShaft: number;
  ore: string;
}

export interface MineDef {
  id: string;
  regionId: string;
  mineScale: number;
  shaftCount: number;
  oreBands: OreBand[];
}

export interface MinesConfig {
  startMineId: string;
  mines: MineDef[];
}

export interface OreVisual {
  color: string;
  glint: string;
}

export interface RegionPalette {
  skyTop: string;
  sky: string;
  fog: string;
  hillFar: string;
  hillMid: string;
  hillNear: string;
  terrace: string;
  grass: string;
  soil: string;
  wood: string;
  woodDark: string;
}

export interface RegionDef {
  id: string;
  jpMult: number;
  palette: RegionPalette;
  depthGradient: string[];
  ores: Record<string, OreVisual>;
}

export interface RegionsConfig {
  regions: RegionDef[];
}

export interface FeelConfig {
  button: { pressScale: number; pressMs: number };
  holdToBuy: {
    initialDelayMs: number;
    startRatePerSec: number;
    maxRatePerSec: number;
    rampMs: number;
  };
  cashTween: { timeConstantMs: number };
  uiUpdateHz: number;
  floatingText: { maxActive: number; durationMs: number; risePx: number };
  scroll: {
    dragThresholdPx: number;
    decelerationPerSec: number;
    minVelocityPxPerSec: number;
    maxVelocityPxPerSec: number;
    rubberBand: number;
    springBackPerSec: number;
    maxOverscrollPx: number;
    wheelMultiplier: number;
    keyStepPx: number;
    animateMs: number;
  };
  milestoneFlashMs: number;
  cameraShakePx: number;
}

export interface EngineConfig {
  loop: {
    stepMs: number;
    maxStepsPerFrame: number;
    maxCatchUpMs: number;
    longHideMs: number;
    frameBudgetMs: number;
  };
  debug: {
    timeScales: number[];
    fastForwardMinutes: number[];
    fastForwardStepMs: number;
  };
  render: {
    maxResolution: number;
    cullMarginPx: number;
    /** MSAA is only enabled below this device pixel ratio (high-DPR screens do not need it). */
    antialiasBelowDpr: number;
  };
}

// Compile-time structural checks of the bundled JSON files.
export const economyConfig: EconomyConfig = economyJson;
export const minesConfig: MinesConfig = minesJson;
export const regionsConfig: RegionsConfig = regionsJson;
export const feelConfig: FeelConfig = feelJson;
export const engineConfig: EngineConfig = engineJson;

export class ConfigError extends Error {
  constructor(message: string) {
    super(`[config] ${message}`);
    this.name = 'ConfigError';
  }
}

function assertPositive(value: number, path: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new ConfigError(`${path} must be a positive finite number (got ${String(value)})`);
  }
}

function assertNonNegative(value: number, path: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new ConfigError(`${path} must be a non-negative finite number (got ${String(value)})`);
  }
}

function assertGrowth(value: number, path: string): void {
  if (!Number.isFinite(value) || value <= 1) {
    throw new ConfigError(`${path} must be a growth factor > 1 (got ${String(value)})`);
  }
}

function assertAscending(values: number[], path: string): void {
  if (values.length === 0) throw new ConfigError(`${path} must not be empty`);
  values.forEach((v, i) => {
    assertPositive(v, `${path}[${i}]`);
    const prev = values[i - 1];
    if (prev !== undefined && v <= prev) {
      throw new ConfigError(`${path} must be strictly ascending`);
    }
  });
}

/** Throws a {@link ConfigError} describing the first problem found. */
export function validateEconomy(cfg: EconomyConfig): void {
  assertNonNegative(cfg.startingCash, 'startingCash');
  const s = cfg.shaft;
  assertPositive(s.baseProd, 'shaft.baseProd');
  assertGrowth(s.prodGrowth, 'shaft.prodGrowth');
  assertPositive(s.baseCost, 'shaft.baseCost');
  assertGrowth(s.costGrowthPerShaft, 'shaft.costGrowthPerShaft');
  assertGrowth(s.costGrowthPerLevel, 'shaft.costGrowthPerLevel');
  assertPositive(s.unlockBase, 'shaft.unlockBase');
  assertGrowth(s.unlockGrowth, 'shaft.unlockGrowth');
  assertPositive(s.milestoneEvery, 'shaft.milestoneEvery');
  assertPositive(s.milestoneMult, 'shaft.milestoneMult');
  assertPositive(s.maxLevel, 'shaft.maxLevel');
  assertAscending(s.minerThresholds, 'shaft.minerThresholds');
  if (s.minerThresholds[0] !== 1) throw new ConfigError('shaft.minerThresholds[0] must be 1');
  assertPositive(s.cycle.walkSec, 'shaft.cycle.walkSec');
  assertPositive(s.cycle.digSec, 'shaft.cycle.digSec');
  assertPositive(s.cycle.digHits, 'shaft.cycle.digHits');
  assertPositive(s.cycle.dumpSec, 'shaft.cycle.dumpSec');

  const e = cfg.elevator;
  assertPositive(e.baseFlow, 'elevator.baseFlow');
  assertPositive(e.baseCost, 'elevator.baseCost');
  assertGrowth(e.costGrowthPerLevel, 'elevator.costGrowthPerLevel');
  assertPositive(e.milestoneEvery, 'elevator.milestoneEvery');
  assertPositive(e.milestoneMult, 'elevator.milestoneMult');
  assertPositive(e.speedBonusEvery, 'elevator.speedBonusEvery');
  assertNonNegative(e.speedBonus, 'elevator.speedBonus');
  assertPositive(e.referenceDepth, 'elevator.referenceDepth');
  assertPositive(e.unloadSec, 'elevator.unloadSec');
  assertPositive(e.fullLoadSec, 'elevator.fullLoadSec');
  assertPositive(e.tripPerShaftSec, 'elevator.tripPerShaftSec');
  if (!(e.tripBaseSec > e.unloadSec + e.fullLoadSec)) {
    throw new ConfigError(
      'elevator.tripBaseSec must exceed elevator.unloadSec + elevator.fullLoadSec',
    );
  }
  assertPositive(e.maxLevel, 'elevator.maxLevel');

  const l = cfg.logistics;
  assertPositive(l.baseFlow, 'logistics.baseFlow');
  assertPositive(l.baseCost, 'logistics.baseCost');
  assertGrowth(l.costGrowthPerLevel, 'logistics.costGrowthPerLevel');
  assertPositive(l.milestoneEvery, 'logistics.milestoneEvery');
  assertPositive(l.milestoneMult, 'logistics.milestoneMult');
  assertPositive(l.maxLevel, 'logistics.maxLevel');
  assertAscending(l.carrierThresholds, 'logistics.carrierThresholds');
  if (l.carrierThresholds[0] !== 1)
    throw new ConfigError('logistics.carrierThresholds[0] must be 1');
  assertPositive(l.cycle.loadSec, 'logistics.cycle.loadSec');
  assertPositive(l.cycle.walkSec, 'logistics.cycle.walkSec');
  assertPositive(l.cycle.unloadSec, 'logistics.cycle.unloadSec');
  assertNonNegative(l.manualStaggerSec, 'logistics.manualStaggerSec');

  cfg.barriers.forEach((b, i) => {
    assertPositive(b.afterShaft, `barriers[${i}].afterShaft`);
    assertPositive(b.durationSec, `barriers[${i}].durationSec`);
    assertNonNegative(b.costFactor, `barriers[${i}].costFactor`);
  });
}

export function validateMines(cfg: MinesConfig, regions: RegionsConfig): void {
  if (!cfg.mines.some((m) => m.id === cfg.startMineId)) {
    throw new ConfigError(`startMineId "${cfg.startMineId}" is not defined`);
  }
  for (const m of cfg.mines) {
    assertPositive(m.mineScale, `mines.${m.id}.mineScale`);
    assertPositive(m.shaftCount, `mines.${m.id}.shaftCount`);
    const region = regions.regions.find((r) => r.id === m.regionId);
    if (!region) throw new ConfigError(`mines.${m.id}.regionId "${m.regionId}" is not defined`);
    if (m.oreBands[0]?.fromShaft !== 1) {
      throw new ConfigError(`mines.${m.id}.oreBands must start at shaft 1`);
    }
    for (const band of m.oreBands) {
      if (!region.ores[band.ore]) {
        throw new ConfigError(`mines.${m.id}: ore "${band.ore}" missing in region ${region.id}`);
      }
    }
  }
}
