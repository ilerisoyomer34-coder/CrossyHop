/**
 * Game state model (GDD 13.4).
 *
 * The state is immutable: actions and the simulation step return new objects (structural
 * sharing). Money is held as `Decimal` in memory; the save system (`state/save/`) stores Decimals as
 * strings. Any change to this shape bumps STATE_VERSION and adds a migration + test.
 *
 * Moving units do not store per-tick timers. Instead each unit stores *absolute* simulation times
 * (cycle start, phase start/end). The state therefore only changes when something happens
 * (a deposit, a stop, a sale), and the renderer can derive smooth positions for any time.
 */
import type { Decimal } from '../core/BigNum';
import type { Locale } from '../i18n/t';
import type { Notation } from '../i18n/formatNumber';

export const STATE_VERSION = 1;

export type UnitRef =
  { kind: 'shaft'; index: number } | { kind: 'elevator' } | { kind: 'logistics' };

export interface ShaftState {
  level: number;
  /** Ore waiting in the crate, in base ₵ value. */
  stored: Decimal;
  /** Phase 1: assigned manager. */
  managerId?: string;
  /** Simulation time automation began (null while the shaft is operated manually). */
  autoSince: number | null;
  /** End time of a tap-started (manual) dig cycle, or null when no manual cycle is running. */
  manualCycleEndsAt: number | null;
}

/** down: surface → deepest shaft · rise: one shaft up · load: at a shaft · up: straight to the surface. */
export type ElevatorPhaseKind = 'idle' | 'down' | 'rise' | 'load' | 'up' | 'unload';

export interface ElevatorPhase {
  kind: ElevatorPhaseKind;
  startAt: number;
  /** `Infinity` for the open-ended idle phase. */
  endAt: number;
  /** Stop index the phase starts at (0 = surface dock, n = shaft n). */
  from: number;
  /** Stop index the phase ends at. */
  to: number;
}

export interface ElevatorState {
  level: number;
  managerId?: string;
  /** Ore currently in the cage. */
  load: Decimal;
  phase: ElevatorPhase;
}

export type CarrierPhaseKind =
  | 'idle' // manual mode, standing at the depot
  | 'delay' // scheduled to start loading at endAt (staggered start)
  | 'wait' // automated, waiting for ore to appear in the depot
  | 'load'
  | 'toWarehouse'
  | 'unload'
  | 'return';

export interface CarrierPhase {
  kind: CarrierPhaseKind;
  startAt: number;
  endAt: number;
}

export interface CarrierState {
  load: Decimal;
  phase: CarrierPhase;
}

export interface LogisticsState {
  level: number;
  managerId?: string;
  carriers: CarrierState[];
}

export interface ActiveBarrier {
  afterShaft: number;
  endsAt: number;
}

/** Phase 1: a hired manager instance (template + stars + skill timers). */
export interface OwnedManager {
  templateId: string;
  stars: number;
  skillReadyAt: number;
  activeUntil: number;
}

export interface MineState {
  id: string;
  cash: Decimal;
  /** Money earned in the current prestige run (drives Derinleştirme in Phase 2). */
  earnedThisRun: Decimal;
  /** Derinleştirme rank (Phase 2). */
  rank: number;
  shafts: ShaftState[];
  elevator: ElevatorState;
  logistics: LogisticsState;
  /** Ore waiting at the shaft head for the carriers. */
  surfaceStock: Decimal;
  barrier: ActiveBarrier | null;
  clearedBarriers: number[];
  /** Simulation time at which shaft i+1 was opened in this run. */
  shaftUnlockedAt: number[];
  ownedManagers: OwnedManager[];
}

/** Phase 2: time-limited income boosts (Demlik etc.). */
export interface ActiveBoost {
  id: string;
  multiplier: number;
  endsAt: number;
}

/** Phase 2: daily contracts. */
export interface ContractState {
  day: number;
  active: { id: string; progress: number; done: boolean }[];
  rerollsUsed: number;
}

export interface Settings {
  locale: Locale;
  notation: Notation;
}

export interface LifetimeStats {
  totalEarned: Decimal;
  taps: number;
  levelsBought: number;
}

export interface GameState {
  version: number;
  /** Wall-clock creation time (epoch ms). */
  createdAt: number;
  /** Wall-clock time of the last save (epoch ms); offline progress is measured from it. */
  lastSavedAt: number;
  /** Simulation clock in ms; advances only through simulation steps. */
  time: number;
  activeMineId: string;
  crystals: number;
  geologyPoints: number;
  research: Record<string, number>;
  fossils: Record<string, number>;
  fossilDust: number;
  achievements: Record<string, number>;
  boosts: ActiveBoost[];
  contracts: ContractState;
  mines: Record<string, MineState>;
  settings: Settings;
  stats: LifetimeStats;
  flags: Record<string, boolean>;
}

/** Well-known flag names. */
export const FLAG_DEBUG_AUTORUN = 'debugAutoRun';
/** Set when the device clock went backwards between saves (GDD 5.7 clock guard). */
export const FLAG_CLOCK_REWOUND = 'clockRewound';
