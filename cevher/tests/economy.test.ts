import { describe, expect, it } from 'vitest';
import { D } from '../src/core/BigNum';
import { formatNumber } from '../src/i18n/formatNumber';
import { cfg, expectClose } from './helpers';

const eco = cfg.economy;

/**
 * GDD 5.4 reference table: n, B(n), C0(n), U(n), production at level 25, production at level 100.
 * Exact values from the formulas; the table in the GDD shows them rounded.
 */
const TABLE: [number, number, number, number | null, number, number][] = [
  [1, 2, 8, null, 100, 3_200],
  [2, 12, 60, 60, 600, 19_200],
  [3, 72, 450, 540, 3_600, 115_200],
  [4, 432, 3_375, 4_860, 21_600, 691_200],
  [5, 2_592, 25_312.5, 43_740, 129_600, 4_147_200],
  [6, 15_552, 189_843.75, 393_660, 777_600, 24_883_200],
  [7, 93_312, 1_423_828.125, 3_542_940, 4_665_600, 149_299_200],
  [8, 559_872, 10_678_710.9375, 31_886_460, 27_993_600, 895_795_200],
  [9, 3_359_232, 80_090_332.03125, 286_978_140, 167_961_600, 5_374_771_200],
  [10, 20_155_392, 600_677_490.234375, 2_582_803_260, 1_007_769_600, 32_248_627_200],
];

/** The same table exactly as printed in the GDD (Turkish formatting, Mn/Mr spelled as M/B). */
const PRINTED: Record<number, { prod100: string; c0?: string; unlock?: string }> = {
  5: { prod100: '4,15M' },
  6: { prod100: '24,9M' },
  7: { prod100: '149M', c0: '1,42M', unlock: '3,54M' },
  8: { prod100: '896M', c0: '10,7M', unlock: '31,9M' },
  9: { prod100: '5,37B', c0: '80,1M', unlock: '287M' },
  10: { prod100: '32,2B', c0: '601M', unlock: '2,58B' },
};

describe('GDD 5.4 reference values', () => {
  it.each(TABLE)(
    'shaft %i matches B, C0, U and production at Lv 25 / Lv 100',
    (n, b, c0, u, p25, p100) => {
      expectClose(eco.shaftBaseProd(n), b);
      expectClose(eco.shaftFirstUpgradeCost(n), c0);
      if (u !== null) expectClose(eco.shaftUnlockCost(n), u);
      expectClose(eco.shaftProduction(n, 25), p25);
      expectClose(eco.shaftProduction(n, 100), p100);
    },
  );

  it('formats like the printed GDD table', () => {
    for (const [n, printed] of Object.entries(PRINTED)) {
      const shaft = Number(n);
      expect(formatNumber(eco.shaftProduction(shaft, 100))).toBe(printed.prod100);
      if (printed.c0) expect(formatNumber(eco.shaftFirstUpgradeCost(shaft))).toBe(printed.c0);
      if (printed.unlock) expect(formatNumber(eco.shaftUnlockCost(shaft))).toBe(printed.unlock);
    }
  });
});

describe('shaft formulas', () => {
  it('doubles production at every 25-level milestone', () => {
    expectClose(eco.shaftProduction(1, 24), 48);
    expectClose(eco.shaftProduction(1, 25), 100);
    expectClose(eco.shaftProduction(1, 49), 196);
    expectClose(eco.shaftProduction(1, 50), 400);
  });

  it('prices level L→L+1 as C0 × 1.12^(L−1)', () => {
    expectClose(eco.shaftUpgradeCost(1, 1), 8);
    expectClose(eco.shaftUpgradeCost(1, 2), 8.96);
    expectClose(eco.shaftUpgradeCost(3, 10), 450 * 1.12 ** 9);
  });

  it('adds miners at the configured thresholds', () => {
    const expected: [number, number][] = [
      [1, 1],
      [9, 1],
      [10, 2],
      [24, 2],
      [25, 3],
      [50, 4],
      [100, 5],
      [200, 6],
      [300, 7],
      [400, 8],
    ];
    for (const [level, miners] of expected) expect(eco.minerCount(level)).toBe(miners);
  });

  it('splits production over miners and cycle time consistently', () => {
    const cycleSec = eco.shaftCycleMs() / 1000;
    for (const level of [1, 10, 25, 99, 250]) {
      const perMiner = eco.shaftLoadPerMiner(4, level);
      expectClose(perMiner.mul(eco.minerCount(level)).div(cycleSec), eco.shaftProduction(4, level));
    }
  });

  it('first manual dig cycle pays for the first upgrade', () => {
    const firstCycle = eco.shaftLoadPerMiner(1, 1).mul(eco.minerCount(1));
    expect(firstCycle.gte(eco.shaftUpgradeCost(1, 1))).toBe(true);
  });
});

describe('elevator formulas', () => {
  it('computes nominal flow A(L) = 6 × L × 3^floor(L/25)', () => {
    expectClose(eco.elevatorNominalFlow(1), 6);
    expectClose(eco.elevatorNominalFlow(24), 144);
    expectClose(eco.elevatorNominalFlow(25), 450);
    expectClose(eco.elevatorNominalFlow(50), 2_700);
  });

  it('carries A(L) × 10 s per trip', () => {
    expect(eco.elevatorCapacitySeconds).toBe(10);
    expectClose(eco.elevatorCapacity(7), 6 * 7 * 10);
  });

  it('takes 4 s + 0.6 s per open shaft for a full trip', () => {
    for (const n of [1, 5, 10, 30]) {
      expect(eco.elevatorTripMs(n, 1)).toBeCloseTo((4 + 0.6 * n) * 1000, 6);
    }
  });

  it('delivers exactly the nominal flow at the 10-shaft reference depth', () => {
    expectClose(eco.elevatorRealFlow(13, 10), eco.elevatorNominalFlow(13));
    expect(eco.elevatorRealFlow(13, 5).gt(eco.elevatorNominalFlow(13))).toBe(true);
    expect(eco.elevatorRealFlow(13, 20).lt(eco.elevatorNominalFlow(13))).toBe(true);
  });

  it('gets 10 % faster travel every 50 levels', () => {
    expect(eco.elevatorSpeedMultiplier(49)).toBe(1);
    expect(eco.elevatorSpeedMultiplier(50)).toBeCloseTo(1.1);
    expect(eco.elevatorSpeedMultiplier(100)).toBeCloseTo(1.2);
    // travel shrinks, loading/unloading do not
    const slow = eco.elevatorTripMs(10, 49);
    const fast = eco.elevatorTripMs(10, 50);
    expect(fast).toBeCloseTo(1000 + 1000 + (2000 + 6000) / 1.1, 6);
    expect(fast).toBeLessThan(slow);
  });

  it('prices levels as 25 × 1.07^(L−1)', () => {
    expectClose(eco.elevatorUpgradeCost(1), 25);
    expectClose(eco.elevatorUpgradeCost(11), 25 * 1.07 ** 10);
  });
});

describe('logistics formulas', () => {
  it('computes T(L) = 6 × L × 3^floor(L/25)', () => {
    expectClose(eco.logisticsFlow(1), 6);
    expectClose(eco.logisticsFlow(75), 6 * 75 * 27);
  });

  it('derives wagon capacity so that all carriers move T(L)', () => {
    const cycleSec = eco.logisticsCycleMs() / 1000;
    for (const level of [1, 10, 26, 120, 1500]) {
      const total = eco.wagonCapacity(level).mul(eco.carrierCount(level)).div(cycleSec);
      expectClose(total, eco.logisticsFlow(level));
    }
  });

  it('caps carriers at 8', () => {
    expect(eco.carrierCount(1)).toBe(1);
    expect(eco.carrierCount(2000)).toBe(8);
  });
});

describe('mineScale', () => {
  it('scales base production and every cost', () => {
    expectClose(eco.shaftProduction(3, 40, 1000), eco.shaftProduction(3, 40).mul(1000));
    expectClose(eco.shaftUnlockCost(4, 1000), eco.shaftUnlockCost(4).mul(1000));
    expectClose(eco.elevatorUpgradeCost(9, 1000), D(25 * 1.07 ** 8 * 1000));
    expectClose(eco.logisticsFlow(9, 1000), eco.logisticsFlow(9).mul(1000));
  });
});
