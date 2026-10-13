/**
 * Save system (GDD 13.6).
 *
 * Format: `{ v: schema version, t: save time (epoch ms), d: lz-string compressed JSON, c: FNV-1a }`.
 * Slots: one main save plus two rotating backups. The main slot is written on every save; the
 * backups rotate at most once per `backupIntervalMs`, so a bad state cannot overwrite every copy
 * within a few seconds. On load the main save is tried first, then the newest intact backup.
 */
import { compressToBase64, decompressFromBase64 } from 'lz-string';
import type { KeyValueStore } from '../../platform/storage';
import type { GameConfig } from '../../sim/GameConfig';
import { STATE_VERSION, type GameState } from '../GameState';
import { fnv1a } from './checksum';
import { migrate } from './migrations';
import { SaveError } from './SaveError';
import { decodeState, encodeState } from './serialize';

export interface SaveEnvelope {
  v: number;
  t: number;
  d: string;
  c: string;
}

export type SaveSlot = 'main' | 'backup1' | 'backup2';
const BACKUPS: readonly SaveSlot[] = ['backup1', 'backup2'];

export interface SaveOptions {
  /** Storage key prefix; slots live at `<prefix>.main`, `<prefix>.backup1` … */
  keyPrefix: string;
  backupIntervalMs: number;
}

export interface LoadResult {
  /** The loaded state, or null when a new game has to start. */
  state: GameState | null;
  slot: SaveSlot | null;
  /** The main save was unreadable (or missing) and a backup was loaded instead. */
  recovered: boolean;
  /** Save data existed but none of it could be read; a new game starts. */
  lost: boolean;
  errors: SaveError[];
}

function checksumOf(v: number, t: number, d: string): string {
  return fnv1a(`${v}:${t}:${d}`);
}

function asSaveError(err: unknown): SaveError {
  return err instanceof SaveError ? err : new SaveError('schema', String(err));
}

/** Serialises a state into an envelope string, stamping `lastSavedAt`. */
export function writeSave(state: GameState, now: number): string {
  const data = encodeState({ ...state, version: STATE_VERSION, lastSavedAt: now });
  const d = compressToBase64(JSON.stringify(data));
  const envelope: SaveEnvelope = {
    v: STATE_VERSION,
    t: now,
    d,
    c: checksumOf(STATE_VERSION, now, d),
  };
  return JSON.stringify(envelope);
}

/** Parses an envelope and verifies its checksum (no decompression). */
export function parseEnvelope(raw: string): SaveEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SaveError('format', 'not JSON');
  }
  if (typeof parsed !== 'object' || parsed === null) throw new SaveError('format', 'not an object');
  const { v, t, d, c } = parsed as Record<string, unknown>;
  if (
    typeof v !== 'number' ||
    typeof t !== 'number' ||
    !Number.isFinite(t) ||
    typeof d !== 'string' ||
    typeof c !== 'string'
  ) {
    throw new SaveError('format', 'missing envelope fields');
  }
  if (checksumOf(v, t, d) !== c) throw new SaveError('checksum', 'checksum mismatch');
  return { v, t, d, c };
}

/** Full read: envelope → checksum → decompress → migrate → decode + validate. */
export function readSave(raw: string, cfg: GameConfig): { state: GameState; savedAt: number } {
  const envelope = parseEnvelope(raw);
  let json: string | null;
  try {
    json = decompressFromBase64(envelope.d);
  } catch {
    json = null;
  }
  if (!json) throw new SaveError('compression', 'payload does not decompress');
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new SaveError('compression', 'payload is not JSON');
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new SaveError('schema', 'payload is not an object');
  }
  const migrated = migrate(data as Record<string, unknown>, envelope.v);
  try {
    return { state: decodeState(migrated, cfg), savedAt: envelope.t };
  } catch (err) {
    throw asSaveError(err);
  }
}

/** Base64 of the envelope: one copy-pasteable line for export / import. */
export function toExportText(envelope: string): string {
  return btoa(envelope);
}

export function fromExportText(text: string): string {
  const compact = text.trim();
  if (compact.startsWith('{')) return compact;
  try {
    return atob(compact.replace(/\s+/g, ''));
  } catch {
    throw new SaveError('format', 'not a save text');
  }
}

export class SaveManager {
  private lastBackupAt = -Infinity;

  constructor(
    private readonly store: KeyValueStore,
    private readonly cfg: GameConfig,
    private readonly options: SaveOptions,
  ) {}

  /** False when the platform does not keep data (the player is warned). */
  get persistent(): boolean {
    return this.store.persistent;
  }

  key(slot: SaveSlot | 'corrupt'): string {
    return `${this.options.keyPrefix}.${slot}`;
  }

  load(): LoadResult {
    const errors: SaveError[] = [];
    const mainRaw = this.store.get(this.key('main'));
    const backups: { slot: SaveSlot; state: GameState; savedAt: number }[] = [];
    let anyBackup = false;
    for (const slot of BACKUPS) {
      const raw = this.store.get(this.key(slot));
      if (raw === null) continue;
      anyBackup = true;
      try {
        const read = readSave(raw, this.cfg);
        backups.push({ slot, ...read });
        this.lastBackupAt = Math.max(this.lastBackupAt, read.savedAt);
      } catch (err) {
        errors.push(asSaveError(err));
      }
    }

    if (mainRaw !== null) {
      try {
        const { state } = readSave(mainRaw, this.cfg);
        return { state, slot: 'main', recovered: false, lost: false, errors };
      } catch (err) {
        errors.unshift(asSaveError(err));
        // Keep the unreadable copy for support / manual recovery before it gets overwritten.
        this.store.set(this.key('corrupt'), mainRaw);
      }
    }

    backups.sort((a, b) => b.savedAt - a.savedAt);
    const best = backups[0];
    if (best) return { state: best.state, slot: best.slot, recovered: true, lost: false, errors };
    return {
      state: null,
      slot: null,
      recovered: false,
      lost: mainRaw !== null || anyBackup,
      errors,
    };
  }

  /** Writes the main slot (rotating the backups when due). False when storage refused. */
  save(state: GameState, now: number): boolean {
    const text = writeSave(state, now);
    if (Math.abs(now - this.lastBackupAt) >= this.options.backupIntervalMs) this.rotate(now);
    return this.store.set(this.key('main'), text);
  }

  private rotate(now: number): void {
    const current = this.store.get(this.key('main'));
    if (current === null) return;
    try {
      parseEnvelope(current); // only intact saves become backups
    } catch {
      return;
    }
    const newest = this.store.get(this.key('backup1'));
    if (newest !== null) this.store.set(this.key('backup2'), newest);
    this.store.set(this.key('backup1'), current);
    this.lastBackupAt = now;
  }

  exportText(state: GameState, now: number): string {
    return toExportText(writeSave(state, now));
  }

  /** Decodes an exported save text. Throws {@link SaveError}; does not touch storage. */
  importText(text: string): GameState {
    return readSave(fromExportText(text), this.cfg).state;
  }

  /** Deletes every slot (new game). */
  clear(): void {
    for (const slot of ['main', ...BACKUPS] as const) this.store.remove(this.key(slot));
    this.lastBackupAt = -Infinity;
  }
}
