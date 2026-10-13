/**
 * Save migrations (GDD 13.6). `MIGRATIONS[n]` upgrades raw save data from schema version n to n+1.
 * Each step is a pure function on plain JSON data and is covered by a test; the chain runs before
 * the data is decoded, so the decoder only ever sees the current schema.
 *
 * When `STATE_VERSION` is bumped, add the step for the previous version here together with a test
 * that loads a fixture of the old version.
 */
import { STATE_VERSION } from '../GameState';
import { SaveError } from './SaveError';

export type SaveData = Record<string, unknown>;
export type Migration = (data: SaveData) => SaveData;

function asRecord(value: unknown): SaveData {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as SaveData)
    : {};
}

/** Applies `patch` to every shaft of every mine (raw save data). */
function mapShafts(data: SaveData, patch: (shaft: SaveData) => SaveData): SaveData {
  const mines = asRecord(data.mines);
  const next: SaveData = {};
  for (const [id, raw] of Object.entries(mines)) {
    const mine = asRecord(raw);
    next[id] = Array.isArray(mine.shafts)
      ? { ...mine, shafts: mine.shafts.map((s) => patch(asRecord(s))) }
      : mine;
  }
  return { ...data, mines: next };
}

export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  /**
   * v1 → v2 (game 0.3.0): play mode setting (existing players keep tapping) and the shaft's
   * automation wind-down marker.
   */
  1: (data) =>
    mapShafts({ ...data, settings: { ...asRecord(data.settings), playMode: 'tap' } }, (shaft) => ({
      ...shaft,
      autoUntil: null,
    })),
};

export function migrate(
  data: SaveData,
  fromVersion: number,
  toVersion: number = STATE_VERSION,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
): SaveData {
  if (!Number.isInteger(fromVersion) || fromVersion < 1) {
    throw new SaveError('format', `invalid save version ${String(fromVersion)}`);
  }
  if (fromVersion > toVersion) {
    throw new SaveError('newer', `save v${fromVersion} is newer than game v${toVersion}`);
  }
  let current = data;
  for (let v = fromVersion; v < toVersion; v++) {
    const step = migrations[v];
    if (!step) throw new SaveError('migration', `no migration from v${v} to v${v + 1}`);
    try {
      current = step(current);
    } catch (err) {
      throw new SaveError('migration', `v${v} → v${v + 1} failed: ${String(err)}`);
    }
  }
  return { ...current, version: toVersion };
}
