/**
 * GameState ⇄ plain JSON data (GDD 13.6).
 *
 * - `Decimal` values are stored as strings (`"1.2345e310"`), so precision survives beyond 1e308.
 * - Open-ended phase ends (`Infinity`) are stored as `null`, which JSON can represent.
 * - Decoding validates every field and the game's invariants against the config. A save that does
 *   not fit is rejected with a {@link SaveError} (the loader then falls back to a backup), so a
 *   broken or hand-edited save can never crash the running game.
 */
import { Decimal, toSaveString } from '../../core/BigNum';
import { isLocale } from '../../i18n/t';
import { idleCarrier } from '../factory';
import {
  PLAY_MODES,
  type ActiveBarrier,
  type ActiveBoost,
  type CarrierPhaseKind,
  type CarrierState,
  type ContractState,
  type ElevatorPhaseKind,
  type ElevatorState,
  type GameState,
  type LogisticsState,
  type MineState,
  type OwnedManager,
  type ShaftState,
} from '../GameState';
import type { GameConfig } from '../../sim/GameConfig';
import { SaveError } from './SaveError';
import type { SaveData } from './migrations';

const ELEVATOR_PHASES: readonly ElevatorPhaseKind[] = [
  'idle',
  'down',
  'rise',
  'load',
  'up',
  'unload',
];
const CARRIER_PHASES: readonly CarrierPhaseKind[] = [
  'idle',
  'delay',
  'wait',
  'load',
  'toWarehouse',
  'unload',
  'return',
];
const NOTATIONS = ['short', 'scientific'] as const;

// ------------------------------------------------------------------ encode

const dec = (value: Decimal): string => toSaveString(value);
/** `Infinity` (open-ended phase) → null. */
const endTime = (value: number): number | null => (Number.isFinite(value) ? value : null);

function encodeMine(mine: MineState): SaveData {
  return {
    id: mine.id,
    cash: dec(mine.cash),
    earnedThisRun: dec(mine.earnedThisRun),
    rank: mine.rank,
    shafts: mine.shafts.map((s) => ({
      level: s.level,
      stored: dec(s.stored),
      managerId: s.managerId,
      autoSince: s.autoSince,
      autoUntil: s.autoUntil,
      manualCycleEndsAt: s.manualCycleEndsAt,
    })),
    elevator: {
      level: mine.elevator.level,
      managerId: mine.elevator.managerId,
      load: dec(mine.elevator.load),
      phase: { ...mine.elevator.phase, endAt: endTime(mine.elevator.phase.endAt) },
    },
    logistics: {
      level: mine.logistics.level,
      managerId: mine.logistics.managerId,
      carriers: mine.logistics.carriers.map((c) => ({
        load: dec(c.load),
        phase: { ...c.phase, endAt: endTime(c.phase.endAt) },
      })),
    },
    surfaceStock: dec(mine.surfaceStock),
    barrier: mine.barrier,
    clearedBarriers: mine.clearedBarriers,
    shaftUnlockedAt: mine.shaftUnlockedAt,
    ownedManagers: mine.ownedManagers,
  };
}

/** Converts the state into JSON-safe data (no Decimals, no Infinity). */
export function encodeState(state: GameState): SaveData {
  return {
    version: state.version,
    createdAt: state.createdAt,
    lastSavedAt: state.lastSavedAt,
    time: state.time,
    activeMineId: state.activeMineId,
    crystals: state.crystals,
    geologyPoints: state.geologyPoints,
    research: state.research,
    fossils: state.fossils,
    fossilDust: state.fossilDust,
    achievements: state.achievements,
    boosts: state.boosts,
    contracts: state.contracts,
    mines: Object.fromEntries(Object.entries(state.mines).map(([id, m]) => [id, encodeMine(m)])),
    settings: state.settings,
    stats: {
      totalEarned: dec(state.stats.totalEarned),
      taps: state.stats.taps,
      levelsBought: state.stats.levelsBought,
    },
    flags: state.flags,
  };
}

// ------------------------------------------------------------------ decode

function fail(path: string, problem: string): never {
  throw new SaveError('schema', `${path}: ${problem}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Typed, path-aware field reader: every accessor validates and names the offending field. */
class Reader {
  private constructor(
    private readonly data: Record<string, unknown>,
    readonly path: string,
  ) {}

  static of(value: unknown, path: string): Reader {
    if (!isRecord(value)) fail(path, 'expected an object');
    return new Reader(value, path);
  }

  private at(key: string): string {
    return `${this.path}.${key}`;
  }

  raw(key: string): unknown {
    return this.data[key];
  }

  num(key: string): number {
    const v = this.data[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) fail(this.at(key), 'expected a number');
    return v;
  }

  int(key: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
    const v = this.num(key);
    if (!Number.isInteger(v) || v < min || v > max) {
      fail(this.at(key), `expected an integer in [${min}, ${max}]`);
    }
    return v;
  }

  numOrNull(key: string): number | null {
    return this.data[key] === null ? null : this.num(key);
  }

  /** Phase end time: null means open-ended (`Infinity`). */
  endTime(key: string): number {
    return this.data[key] === null ? Infinity : this.num(key);
  }

  str(key: string): string {
    const v = this.data[key];
    if (typeof v !== 'string' || v.length === 0) fail(this.at(key), 'expected a string');
    return v;
  }

  optStr(key: string): string | undefined {
    return this.data[key] === undefined ? undefined : this.str(key);
  }

  oneOf<T extends string>(key: string, allowed: readonly T[]): T {
    const v = this.data[key];
    const found = allowed.find((a) => a === v);
    if (found === undefined) fail(this.at(key), `expected one of ${allowed.join('|')}`);
    return found;
  }

  /** Non-negative Decimal stored as a string. */
  dec(key: string): Decimal {
    const v = this.data[key];
    if (typeof v !== 'string') fail(this.at(key), 'expected a number string');
    const d = new Decimal(v);
    if (!Number.isFinite(d.mantissa) || !Number.isFinite(d.exponent) || d.lt(0)) {
      fail(this.at(key), `invalid amount "${v}"`);
    }
    return d;
  }

  obj(key: string): Reader {
    return Reader.of(this.data[key], this.at(key));
  }

  objOrNull(key: string): Reader | null {
    return this.data[key] === null ? null : this.obj(key);
  }

  list<T>(key: string, item: (r: Reader) => T): T[] {
    const v = this.data[key];
    if (!Array.isArray(v)) fail(this.at(key), 'expected an array');
    return v.map((x, i) => item(Reader.of(x, `${this.at(key)}[${i}]`)));
  }

  numbers(key: string): number[] {
    const v = this.data[key];
    if (!Array.isArray(v) || !v.every((x) => typeof x === 'number' && Number.isFinite(x))) {
      fail(this.at(key), 'expected an array of numbers');
    }
    return v as number[];
  }

  map<T>(key: string, check: (value: unknown) => value is T, what: string): Record<string, T> {
    const v = this.data[key];
    if (!isRecord(v)) fail(this.at(key), 'expected an object');
    for (const [k, x] of Object.entries(v)) {
      if (!check(x)) fail(`${this.at(key)}.${k}`, `expected ${what}`);
    }
    return v as Record<string, T>;
  }

  entries(key: string): [string, Reader][] {
    const v = this.data[key];
    if (!isRecord(v)) fail(this.at(key), 'expected an object');
    return Object.entries(v).map(([k, x]) => [k, Reader.of(x, `${this.at(key)}.${k}`)]);
  }
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';

function withManager<T extends object>(unit: T, managerId: string | undefined): T {
  return managerId === undefined ? unit : { ...unit, managerId };
}

function decodeShaft(r: Reader, cfg: GameConfig): ShaftState {
  const shaft: ShaftState = {
    level: r.int('level', 1, cfg.econ.shaft.maxLevel),
    stored: r.dec('stored'),
    autoSince: r.numOrNull('autoSince'),
    autoUntil: r.numOrNull('autoUntil'),
    manualCycleEndsAt: r.numOrNull('manualCycleEndsAt'),
  };
  return withManager(shaft, r.optStr('managerId'));
}

function decodeElevator(r: Reader, cfg: GameConfig, shaftCount: number): ElevatorState {
  const p = r.obj('phase');
  const elevator: ElevatorState = {
    level: r.int('level', 1, cfg.econ.elevator.maxLevel),
    load: r.dec('load'),
    phase: {
      kind: p.oneOf('kind', ELEVATOR_PHASES),
      startAt: p.num('startAt'),
      endAt: p.endTime('endAt'),
      from: p.int('from', 0, shaftCount),
      to: p.int('to', 0, shaftCount),
    },
  };
  return withManager(elevator, r.optStr('managerId'));
}

function decodeCarrier(r: Reader): CarrierState {
  const p = r.obj('phase');
  return {
    load: r.dec('load'),
    phase: {
      kind: p.oneOf('kind', CARRIER_PHASES),
      startAt: p.num('startAt'),
      endAt: p.endTime('endAt'),
    },
  };
}

function decodeLogistics(r: Reader, cfg: GameConfig): LogisticsState {
  const level = r.int('level', 1, cfg.econ.logistics.maxLevel);
  let carriers = r.list('carriers', decodeCarrier);
  // The carrier count follows the level; repair a mismatch instead of rejecting the save.
  const wanted = cfg.economy.carrierCount(level);
  if (carriers.length > wanted) carriers = carriers.slice(0, wanted);
  while (carriers.length < wanted) carriers = [...carriers, idleCarrier(0)];
  return withManager({ level, carriers }, r.optStr('managerId'));
}

function decodeBarrier(r: Reader | null): ActiveBarrier | null {
  return r ? { afterShaft: r.int('afterShaft', 1), endsAt: r.num('endsAt') } : null;
}

function decodeManager(r: Reader): OwnedManager {
  return {
    templateId: r.str('templateId'),
    stars: r.int('stars', 0),
    skillReadyAt: r.num('skillReadyAt'),
    activeUntil: r.num('activeUntil'),
  };
}

function decodeMine(id: string, r: Reader, cfg: GameConfig): MineState {
  const def = cfg.mines[id];
  if (!def) fail(r.path, `unknown mine "${id}"`);
  if (r.str('id') !== id) fail(r.path, 'mine id does not match its key');
  const shafts = r.list('shafts', (s) => decodeShaft(s, cfg));
  if (shafts.length < 1 || shafts.length > def.shaftCount) {
    fail(`${r.path}.shafts`, `expected 1..${def.shaftCount} shafts`);
  }
  return {
    id,
    cash: r.dec('cash'),
    earnedThisRun: r.dec('earnedThisRun'),
    rank: r.int('rank', 0),
    shafts,
    elevator: decodeElevator(r.obj('elevator'), cfg, shafts.length),
    logistics: decodeLogistics(r.obj('logistics'), cfg),
    surfaceStock: r.dec('surfaceStock'),
    barrier: decodeBarrier(r.objOrNull('barrier')),
    clearedBarriers: r.numbers('clearedBarriers'),
    shaftUnlockedAt: r.numbers('shaftUnlockedAt'),
    ownedManagers: r.list('ownedManagers', decodeManager),
  };
}

function decodeBoost(r: Reader): ActiveBoost {
  return { id: r.str('id'), multiplier: r.num('multiplier'), endsAt: r.num('endsAt') };
}

function decodeContracts(r: Reader): ContractState {
  return {
    day: r.int('day', 0),
    active: r.list('active', (a) => {
      const done = a.raw('done');
      if (typeof done !== 'boolean') fail(`${a.path}.done`, 'expected a boolean');
      return { id: a.str('id'), progress: a.num('progress'), done };
    }),
    rerollsUsed: r.int('rerollsUsed', 0),
  };
}

/**
 * Rebuilds a GameState from (already migrated) save data. Throws {@link SaveError} when a field is
 * missing, has the wrong type, or breaks an invariant of the current config.
 */
export function decodeState(data: unknown, cfg: GameConfig): GameState {
  const r = Reader.of(data, 'save');
  const mines: Record<string, MineState> = {};
  for (const [id, m] of r.entries('mines')) mines[id] = decodeMine(id, m, cfg);
  const activeMineId = r.str('activeMineId');
  if (!mines[activeMineId]) fail('save.activeMineId', `mine "${activeMineId}" is not in the save`);

  const settings = r.obj('settings');
  const locale = settings.raw('locale');
  if (!isLocale(locale)) fail('save.settings.locale', 'unknown locale');
  const stats = r.obj('stats');

  return {
    version: r.int('version', 1),
    createdAt: r.num('createdAt'),
    lastSavedAt: r.num('lastSavedAt'),
    time: r.num('time'),
    activeMineId,
    crystals: r.num('crystals'),
    geologyPoints: r.num('geologyPoints'),
    research: r.map('research', isFiniteNumber, 'a number'),
    fossils: r.map('fossils', isFiniteNumber, 'a number'),
    fossilDust: r.num('fossilDust'),
    achievements: r.map('achievements', isFiniteNumber, 'a number'),
    boosts: r.list('boosts', decodeBoost),
    contracts: decodeContracts(r.obj('contracts')),
    mines,
    settings: {
      locale,
      notation: settings.oneOf('notation', NOTATIONS),
      playMode: settings.oneOf('playMode', PLAY_MODES),
    },
    stats: {
      totalEarned: stats.dec('totalEarned'),
      taps: stats.int('taps', 0),
      levelsBought: stats.int('levelsBought', 0),
    },
    flags: r.map('flags', isBoolean, 'a boolean'),
  };
}
