import { afterEach, describe, expect, it, vi } from 'vitest';
import { D } from '../src/core/BigNum';
import { createBrowserStore, MemoryStore, type KeyValueStore } from '../src/platform/storage';
import { debugSetAutoRun } from '../src/state/actions';
import { STATE_VERSION, type GameState } from '../src/state/GameState';
import { AutoSave } from '../src/state/save/AutoSave';
import { fnv1a } from '../src/state/save/checksum';
import { compressText } from '../src/state/save/compress';
import { migrate, type Migration } from '../src/state/save/migrations';
import { SaveError, type SaveErrorCode } from '../src/state/save/SaveError';
import {
  readSave,
  SaveManager,
  toExportText,
  writeSave,
  type SaveEnvelope,
} from '../src/state/save/SaveManager';
import { encodeState } from '../src/state/save/serialize';
import { runGreedyBot } from '../src/sim/bots/runBot';
import { runSimulation } from '../src/sim/Simulation';
import { cfg, freshState, mine, patchMine } from './helpers';

const OPTIONS = { keyPrefix: 'test.save', backupIntervalMs: 300_000 };

/** A mid-game state with moving units, open-ended phases and an active barrier. */
function playedState(): GameState {
  const result = runGreedyBot(cfg, { untilShafts: 6, maxSeconds: 1800, mode: 'auto' });
  return result.state;
}

/** Comparable snapshot: Decimals as strings, so equal states give equal snapshots. */
function snapshot(state: GameState): string {
  return JSON.stringify(encodeState(state));
}

function expectSaveError(fn: () => unknown, code: SaveErrorCode): void {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(SaveError);
    expect((err as SaveError).code).toBe(code);
    return;
  }
  expect.fail(`expected SaveError(${code})`);
}

/** Re-wraps decoded save data in a valid envelope (to test the decoder, not the checksum). */
function envelopeWith(data: unknown, v = STATE_VERSION, t = 1000): string {
  const d = compressText(JSON.stringify(data));
  return JSON.stringify({ v, t, d, c: fnv1a(`${v}:${t}:${d}`) } satisfies SaveEnvelope);
}

function savedData(state: GameState): Record<string, unknown> {
  return JSON.parse(JSON.stringify(encodeState(state))) as Record<string, unknown>;
}

describe('checksum', () => {
  it('is FNV-1a 32-bit (known vectors)', () => {
    expect(fnv1a('')).toBe('811c9dc5');
    expect(fnv1a('a')).toBe('e40c292c');
    expect(fnv1a('foobar')).toBe('bf9cf968');
  });
});

describe('save round-trip', () => {
  it('restores a fresh state exactly', () => {
    const state = freshState();
    const { state: loaded, savedAt } = readSave(writeSave(state, 5000), cfg);
    expect(savedAt).toBe(5000);
    expect(snapshot(loaded)).toBe(snapshot({ ...state, lastSavedAt: 5000 }));
    expect(loaded.mines[loaded.activeMineId]?.elevators[0]?.phase.endAt).toBe(Infinity);
  });

  it('restores a played state and the simulation continues identically', () => {
    const state = playedState();
    expect(mine(state).shafts.length).toBeGreaterThanOrEqual(5);
    const { state: loaded } = readSave(writeSave(state, 123), cfg);
    expect(snapshot(loaded)).toBe(snapshot({ ...state, lastSavedAt: 123 }));

    const a = runSimulation(state, 120_000, 50, cfg).state;
    const b = runSimulation(loaded, 120_000, 50, cfg).state;
    expect(snapshot(b)).toBe(snapshot({ ...a, lastSavedAt: 123 }));
  });

  it('keeps numbers beyond 1e308 and stamps the save time', () => {
    const state = patchMine(freshState(), (m) => ({ ...m, cash: D('1.2345e4321') }));
    const { state: loaded } = readSave(writeSave(state, 42), cfg);
    expect(mine(loaded).cash.eq(D('1.2345e4321'))).toBe(true);
    expect(loaded.lastSavedAt).toBe(42);
    expect(loaded.version).toBe(STATE_VERSION);
  });

  it('round-trips settings, flags and stats', () => {
    let state = debugSetAutoRun(freshState(), true).state;
    state = { ...state, settings: { locale: 'en', notation: 'scientific', playMode: 'auto' } };
    state = { ...state, stats: { totalEarned: D(987654321), taps: 17, levelsBought: 9 } };
    const { state: loaded } = readSave(writeSave(state, 1), cfg);
    expect(loaded.settings).toEqual({ locale: 'en', notation: 'scientific', playMode: 'auto' });
    expect(loaded.flags).toEqual(state.flags);
    expect(loaded.stats.taps).toBe(17);
    expect(loaded.stats.totalEarned.eq(987654321)).toBe(true);
  });

  it('compresses the payload', () => {
    const state = playedState();
    const raw = writeSave(state, 0);
    expect(raw.length).toBeLessThan(JSON.stringify(encodeState(state)).length);
  });
});

describe('corrupt and invalid saves', () => {
  const good = writeSave(freshState(), 1000);

  it('rejects non-JSON and incomplete envelopes', () => {
    expectSaveError(() => readSave('garbage', cfg), 'format');
    expectSaveError(() => readSave('{"v":1,"t":1}', cfg), 'format');
    expectSaveError(() => readSave('null', cfg), 'format');
  });

  it('detects a single changed character', () => {
    const env = JSON.parse(good) as SaveEnvelope;
    const i = Math.floor(env.d.length / 2);
    const flipped = env.d[i] === 'A' ? 'B' : 'A';
    const tampered = JSON.stringify({
      ...env,
      d: env.d.slice(0, i) + flipped + env.d.slice(i + 1),
    });
    expectSaveError(() => readSave(tampered, cfg), 'checksum');
  });

  it('detects a truncated save', () => {
    expectSaveError(() => readSave(good.slice(0, good.length - 10), cfg), 'format');
  });

  it('rejects payloads that do not decompress', () => {
    const d = '!!!not-base64!!!';
    const raw = JSON.stringify({ v: 1, t: 0, d, c: fnv1a(`1:0:${d}`) });
    expectSaveError(() => readSave(raw, cfg), 'compression');
  });

  it('rejects saves from a newer game version', () => {
    expectSaveError(
      () => readSave(envelopeWith(savedData(freshState()), STATE_VERSION + 1), cfg),
      'newer',
    );
  });

  it.each([
    [
      'level 0',
      (d: Record<string, unknown>) => setPath(d, ['mines', MINE_ID, 'shafts', 0, 'level'], 0),
    ],
    ['negative cash', (d: Record<string, unknown>) => setPath(d, ['mines', MINE_ID, 'cash'], '-5')],
    ['NaN cash', (d: Record<string, unknown>) => setPath(d, ['mines', MINE_ID, 'cash'], 'abc')],
    [
      'unknown phase',
      (d: Record<string, unknown>) =>
        setPath(d, ['mines', MINE_ID, 'elevators', 0, 'phase', 'kind'], 'teleport'),
    ],
    ['missing time', (d: Record<string, unknown>) => setPath(d, ['time'], undefined)],
    ['unknown locale', (d: Record<string, unknown>) => setPath(d, ['settings', 'locale'], 'xx')],
    ['unknown active mine', (d: Record<string, unknown>) => setPath(d, ['activeMineId'], 'ay')],
    [
      'too many shafts',
      (d: Record<string, unknown>) => {
        const shafts = getPath(d, ['mines', MINE_ID, 'shafts']) as unknown[];
        setPath(
          d,
          ['mines', MINE_ID, 'shafts'],
          Array.from({ length: 99 }, () => shafts[0]),
        );
      },
    ],
    [
      'elevator stop below the mine',
      (d: Record<string, unknown>) =>
        setPath(d, ['mines', MINE_ID, 'elevators', 0, 'phase', 'to'], 7),
    ],
  ])('rejects %s', (_name, mutate) => {
    const data = savedData(freshState());
    mutate(data);
    expectSaveError(() => readSave(envelopeWith(data), cfg), 'schema');
  });

  it('repairs a carrier count that does not match the logistics level', () => {
    const data = savedData(freshState());
    setPath(data, ['mines', MINE_ID, 'logistics', 'carriers'], []);
    const { state } = readSave(envelopeWith(data), cfg);
    expect(mine(state).logistics.carriers.length).toBe(cfg.economy.carrierCount(1));
  });
});

const MINE_ID = cfg.startMineId;

function getPath(data: unknown, path: (string | number)[]): unknown {
  let cur: unknown = data;
  for (const key of path) cur = (cur as Record<string | number, unknown>)[key];
  return cur;
}

function setPath(data: Record<string, unknown>, path: (string | number)[], value: unknown): void {
  const parent = getPath(data, path.slice(0, -1)) as Record<string | number, unknown>;
  const last = path[path.length - 1] as string | number;
  if (value === undefined) delete parent[last];
  else parent[last] = value;
}

describe('migrations', () => {
  const chain: Record<number, Migration> = {
    1: (d) => ({ ...d, gems: 0 }),
    2: (d) => ({ ...d, gems: (d.gems as number) + 5 }),
  };

  it('runs every step in order and stamps the target version', () => {
    expect(migrate({ a: 1 }, 1, 3, chain)).toEqual({ a: 1, gems: 5, version: 3 });
    expect(migrate({ a: 1, gems: 2 }, 2, 3, chain)).toEqual({ a: 1, gems: 7, version: 3 });
  });

  it('is a no-op at the current version', () => {
    expect(migrate({ a: 1 }, 3, 3, chain)).toEqual({ a: 1, version: 3 });
  });

  it('fails cleanly on gaps, failing steps, newer and invalid versions', () => {
    expectSaveError(() => migrate({}, 1, 4, chain), 'migration');
    expectSaveError(
      () =>
        migrate({}, 1, 2, {
          1: () => {
            throw new Error('boom');
          },
        }),
      'migration',
    );
    expectSaveError(() => migrate({}, 5, 3, chain), 'newer');
    expectSaveError(() => migrate({}, 0, 3, chain), 'format');
  });

  it('has a step for every version below the current one', () => {
    // Guards against bumping STATE_VERSION without writing the migration.
    expect(() => migrate(savedData(freshState()), 1)).not.toThrow();
  });
});

describe('SaveManager', () => {
  function manager(store: KeyValueStore = new MemoryStore()): SaveManager {
    return new SaveManager(store, cfg, OPTIONS);
  }

  it('starts a new game when nothing is saved', () => {
    const result = manager().load();
    expect(result).toMatchObject({ state: null, slot: null, recovered: false, lost: false });
  });

  it('loads what it saved', () => {
    const store = new MemoryStore();
    const state = patchMine(freshState(), (m) => ({ ...m, cash: D(777) }));
    expect(manager(store).save(state, 10_000)).toBe(true);
    const result = manager(store).load();
    expect(result.slot).toBe('main');
    expect(mine(result.state as GameState).cash.eq(777)).toBe(true);
  });

  it('rotates backups at most once per interval', () => {
    const store = new MemoryStore();
    const saves = manager(store);
    const at = (cash: number, t: number): void => {
      saves.save(
        patchMine(freshState(), (m) => ({ ...m, cash: D(cash) })),
        t,
      );
    };
    const cashIn = (slot: string): number | null => {
      const raw = store.get(`${OPTIONS.keyPrefix}.${slot}`);
      return raw === null ? null : mine(readSave(raw, cfg).state).cash.toNumber();
    };
    at(1, 0); // nothing to back up yet
    expect(cashIn('backup1')).toBeNull();
    at(2, 1000); // first rotation: main(1) → backup1
    expect([cashIn('main'), cashIn('backup1'), cashIn('backup2')]).toEqual([2, 1, null]);
    at(3, 2000); // within the interval: backups untouched
    expect([cashIn('main'), cashIn('backup1'), cashIn('backup2')]).toEqual([3, 1, null]);
    at(4, 1000 + OPTIONS.backupIntervalMs); // rotation: backup1 → backup2, main(3) → backup1
    expect([cashIn('main'), cashIn('backup1'), cashIn('backup2')]).toEqual([4, 3, 1]);
  });

  it('falls back to the newest intact backup when the main save is corrupt', () => {
    const store = new MemoryStore();
    store.set(
      `${OPTIONS.keyPrefix}.backup2`,
      writeSave(
        patchMine(freshState(), (m) => ({ ...m, cash: D(1) })),
        100,
      ),
    );
    store.set(
      `${OPTIONS.keyPrefix}.backup1`,
      writeSave(
        patchMine(freshState(), (m) => ({ ...m, cash: D(2) })),
        200,
      ),
    );
    store.set(`${OPTIONS.keyPrefix}.main`, '{"v":1,"t":300,"d":"broken","c":"00000000"}');
    const result = manager(store).load();
    expect(result.recovered).toBe(true);
    expect(result.slot).toBe('backup1');
    expect(mine(result.state as GameState).cash.eq(2)).toBe(true);
    expect(result.errors[0]?.code).toBe('checksum');
    // The unreadable copy is kept for manual recovery.
    expect(store.get(`${OPTIONS.keyPrefix}.corrupt`)).toContain('broken');
  });

  it('skips a corrupt backup', () => {
    const store = new MemoryStore();
    store.set(`${OPTIONS.keyPrefix}.backup1`, 'corrupt');
    store.set(
      `${OPTIONS.keyPrefix}.backup2`,
      writeSave(
        patchMine(freshState(), (m) => ({ ...m, cash: D(5) })),
        100,
      ),
    );
    const result = manager(store).load();
    expect(result.slot).toBe('backup2');
    expect(mine(result.state as GameState).cash.eq(5)).toBe(true);
  });

  it('reports a lost save when nothing is readable', () => {
    const store = new MemoryStore();
    store.set(`${OPTIONS.keyPrefix}.main`, 'x');
    store.set(`${OPTIONS.keyPrefix}.backup1`, 'y');
    const result = manager(store).load();
    expect(result).toMatchObject({ state: null, lost: true, recovered: false });
    expect(result.errors).toHaveLength(2);
  });

  it('exports and imports a copy-pasteable text', () => {
    const saves = manager();
    const state = patchMine(playedState(), (m) => ({ ...m, cash: D('4.2e99') }));
    const text = saves.exportText(state, 9);
    expect(text).toMatch(/^[A-Za-z0-9+/=]+$/);
    // Line breaks and spaces from messengers / notes apps are ignored.
    const wrapped = ` ${text.replace(/(.{40})/g, '$1\n')} `;
    const imported = saves.importText(wrapped);
    expect(snapshot(imported)).toBe(snapshot({ ...state, lastSavedAt: 9 }));
    // The raw envelope is accepted too.
    expect(mine(saves.importText(atob(text))).cash.eq(D('4.2e99'))).toBe(true);
    expectSaveError(() => saves.importText('hello world'), 'format');
    expect(toExportText('{}')).toBe(btoa('{}'));
  });

  it('clears every slot for a new game', () => {
    const store = new MemoryStore();
    const saves = manager(store);
    saves.save(freshState(), 0);
    saves.save(freshState(), 1000);
    saves.clear();
    expect(manager(store).load()).toMatchObject({ state: null, lost: false });
  });

  it('reports storage failures', () => {
    const failing: KeyValueStore = {
      persistent: true,
      get: () => null,
      set: () => false,
      remove: () => undefined,
    };
    expect(manager(failing).save(freshState(), 0)).toBe(false);
  });
});

describe('browser storage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses localStorage when it works', () => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    });
    const store = createBrowserStore();
    expect(store.persistent).toBe(true);
    expect(store.set('a', '1')).toBe(true);
    expect(store.get('a')).toBe('1');
    store.remove('a');
    expect(store.get('a')).toBeNull();
  });

  it('falls back to memory (flagged non-persistent) when storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
      removeItem: () => undefined,
    });
    const store = createBrowserStore();
    expect(store.persistent).toBe(false);
    expect(store.set('a', '1')).toBe(true);
    expect(store.get('a')).toBe('1');
  });

  it('reports quota errors as a failed write', () => {
    let quota = false;
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        if (quota) throw new Error('QuotaExceededError');
      },
      removeItem: () => undefined,
    });
    const store = createBrowserStore();
    quota = true;
    expect(store.set('a', '1')).toBe(false);
  });
});

describe('AutoSave', () => {
  afterEach(() => vi.useRealTimers());

  it('saves on the interval, debounces actions and flushes immediately', () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const auto = new AutoSave(save, { intervalMs: 30_000, debounceMs: 2000 });
    auto.start();

    auto.schedule();
    vi.advanceTimersByTime(1500);
    auto.schedule(); // another action restarts the debounce
    vi.advanceTimersByTime(1500);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(save).toHaveBeenCalledTimes(1);

    auto.schedule();
    auto.flush(); // tab hidden: save now, drop the pending one
    expect(save).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(2000);
    expect(save).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(30_000 - 3500);
    expect(save).toHaveBeenCalledTimes(3); // interval tick

    auto.stop();
    vi.advanceTimersByTime(120_000);
    expect(save).toHaveBeenCalledTimes(3);
  });
});
