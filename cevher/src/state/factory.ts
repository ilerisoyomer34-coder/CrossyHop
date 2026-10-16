/** Creation of fresh game / mine states. */
import { D, ZERO } from '../core/BigNum';
import type { GameConfig } from '../sim/GameConfig';
import { mineDef } from '../sim/GameConfig';
import {
  STATE_VERSION,
  type CarrierState,
  type ElevatorState,
  type GameState,
  type MineState,
  type ShaftState,
} from './GameState';

export function newShaft(): ShaftState {
  return { level: 1, stored: ZERO, autoSince: null, autoUntil: null, manualCycleEndsAt: null };
}

export function idleElevator(level: number, at: number): ElevatorState {
  return {
    level,
    load: ZERO,
    phase: { kind: 'idle', startAt: at, endAt: Infinity, from: 0, to: 0 },
  };
}

export function idleCarrier(at: number): CarrierState {
  return { load: ZERO, phase: { kind: 'idle', startAt: at, endAt: Infinity } };
}

export function newMineState(cfg: GameConfig, mineId: string, at: number): MineState {
  mineDef(cfg, mineId); // validates the id
  const carriers = Array.from({ length: cfg.economy.carrierCount(1) }, () => idleCarrier(at));
  return {
    id: mineId,
    cash: D(cfg.econ.startingCash),
    earnedThisRun: ZERO,
    rank: 0,
    shafts: [newShaft()],
    elevators: [idleElevator(1, at)],
    stations: [],
    logistics: { level: 1, carriers },
    surfaceStock: ZERO,
    barrier: null,
    clearedBarriers: [],
    shaftUnlockedAt: [at],
    ownedManagers: [],
  };
}

export function createInitialState(cfg: GameConfig, wallClockNow: number): GameState {
  const mineId = cfg.startMineId;
  return {
    version: STATE_VERSION,
    createdAt: wallClockNow,
    lastSavedAt: wallClockNow,
    time: 0,
    activeMineId: mineId,
    crystals: 0,
    geologyPoints: 0,
    research: {},
    fossils: {},
    fossilDust: 0,
    achievements: {},
    boosts: [],
    contracts: { day: 0, active: [], rerollsUsed: 0 },
    mines: { [mineId]: newMineState(cfg, mineId, 0) },
    settings: { locale: 'tr', notation: 'short', playMode: 'tap' },
    stats: { totalEarned: ZERO, taps: 0, levelsBought: 0 },
    flags: {},
  };
}
