import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/core/EventBus';
import { fromSaveString, toSaveString, D } from '../src/core/BigNum';
import { Rng } from '../src/core/Rng';
import { economyConfig, validateEconomy, ConfigError } from '../src/data/config';
import { missingKeys, translate } from '../src/i18n/t';
import { incomeMultiplier } from '../src/sim/Multipliers';
import { cfg, freshState, MINE } from './helpers';

describe('i18n', () => {
  it('has the same keys in Turkish and English', () => {
    expect(missingKeys('tr', 'en')).toEqual([]);
    expect(missingKeys('en', 'tr')).toEqual([]);
  });

  it('interpolates parameters', () => {
    expect(translate('tr', 'shaft.name', { n: 3 })).toBe('Kat 3');
    expect(translate('en', 'shaft.name', { n: 3 })).toBe('Shaft 3');
    expect(translate('tr', 'unit.perSec', { value: '1,2M' })).toBe('1,2M/sn');
  });
});

describe('config validation', () => {
  it('accepts the shipped economy', () => {
    expect(() => validateEconomy(economyConfig)).not.toThrow();
  });

  it('rejects broken numbers with a readable error', () => {
    const broken = { ...economyConfig, shaft: { ...economyConfig.shaft, costGrowthPerLevel: 1 } };
    expect(() => validateEconomy(broken)).toThrow(ConfigError);
    const nan = { ...economyConfig, elevator: { ...economyConfig.elevator, baseFlow: Number.NaN } };
    expect(() => validateEconomy(nan)).toThrow(/elevator.baseFlow/);
  });
});

describe('Rng', () => {
  it('is deterministic per seed and resumable from its state', () => {
    const a = new Rng(123);
    const b = new Rng(123);
    const seqA = Array.from({ length: 5 }, () => a.next());
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(seqA);
    const c = new Rng(a.getState());
    expect(c.next()).toBe(a.next());
    expect(new Rng(124).next()).not.toBe(seqA[0]);
  });

  it('stays within ranges', () => {
    const r = new Rng(9);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
  });
});

describe('EventBus', () => {
  it('delivers typed events and supports unsubscribe', () => {
    const bus = new EventBus<{ ping: { n: number } }>();
    const got: number[] = [];
    const off = bus.on('ping', (p) => got.push(p.n));
    bus.emit('ping', { n: 1 });
    off();
    bus.emit('ping', { n: 2 });
    expect(got).toEqual([1]);
  });
});

describe('BigNum save strings', () => {
  it('round-trips huge values and tolerates garbage', () => {
    const v = D('1.2345e4567');
    expect(fromSaveString(toSaveString(v)).eq(v)).toBe(true);
    expect(fromSaveString(undefined).eq(0)).toBe(true);
  });
});

describe('multiplier stack', () => {
  it('is neutral in Phase 0 and the product of its entries equals the total', () => {
    const m = incomeMultiplier(freshState(), MINE, cfg);
    expect(m.total).toBe(1);
    expect(m.entries.reduce((p, e) => p * e.factor, 1)).toBe(m.total);
    expect(m.entries.map((e) => e.category)).toEqual([
      'research',
      'fossils',
      'achievements',
      'mastery',
      'rank',
      'skill',
      'boost',
      'event',
    ]);
  });
});
