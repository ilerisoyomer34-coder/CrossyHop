/**
 * Bundles the validated data files with the formula engine. Passed explicitly into simulation
 * functions so tests and the balance simulator can run with alternative configs.
 */
import {
  economyConfig,
  minesConfig,
  regionsConfig,
  validateEconomy,
  validateMines,
  type BarrierConfig,
  type EconomyConfig,
  type MineDef,
  type MinesConfig,
  type RegionDef,
  type RegionsConfig,
} from '../data/config';
import { Economy } from './Economy';

export interface GameConfig {
  econ: EconomyConfig;
  economy: Economy;
  startMineId: string;
  mines: Readonly<Record<string, MineDef>>;
  regions: Readonly<Record<string, RegionDef>>;
}

export function createGameConfig(
  econ: EconomyConfig = economyConfig,
  mines: MinesConfig = minesConfig,
  regions: RegionsConfig = regionsConfig,
): GameConfig {
  validateEconomy(econ);
  validateMines(mines, regions);
  return {
    econ,
    economy: new Economy(econ),
    startMineId: mines.startMineId,
    mines: Object.fromEntries(mines.mines.map((m) => [m.id, m])),
    regions: Object.fromEntries(regions.regions.map((r) => [r.id, r])),
  };
}

export const defaultConfig: GameConfig = createGameConfig();

export function mineDef(cfg: GameConfig, mineId: string): MineDef {
  const def = cfg.mines[mineId];
  if (!def) throw new Error(`Unknown mine "${mineId}"`);
  return def;
}

export function regionDef(cfg: GameConfig, regionId: string): RegionDef {
  const def = cfg.regions[regionId];
  if (!def) throw new Error(`Unknown region "${regionId}"`);
  return def;
}

/** Ore id of shaft `n` (1-based) according to the mine's ore bands. */
export function oreForShaft(def: MineDef, n: number): string {
  let ore = def.oreBands[0]?.ore ?? 'coal';
  for (const band of def.oreBands) if (n >= band.fromShaft) ore = band.ore;
  return ore;
}

/** Barrier that sits between shaft `afterShaft` and `afterShaft + 1`, if any. */
export function barrierAfter(cfg: GameConfig, afterShaft: number): BarrierConfig | undefined {
  return cfg.econ.barriers.find((b) => b.afterShaft === afterShaft);
}
