import { describe, expect, it } from 'vitest';
import { D, type Decimal, ZERO } from '../src/core/BigNum';
import { Rng } from '../src/core/Rng';
import type { CostCurve } from '../src/sim/Economy';
import { cfg, expectClose } from './helpers';

const eco = cfg.economy;

function loopCost(curve: CostCurve, level: number, count: number): Decimal {
  let total = ZERO;
  for (let i = 0; i < count; i++) total = total.add(eco.bulkCost(curve, level + i, 1));
  return total;
}

function loopAffordable(curve: CostCurve, level: number, cash: Decimal, max: number): number {
  let k = 0;
  let spent = ZERO;
  while (k < max) {
    const next = spent.add(eco.bulkCost(curve, level + k, 1));
    if (next.gt(cash)) break;
    spent = next;
    k++;
  }
  return k;
}

const curves: [string, CostCurve][] = [
  ['shaft 1', eco.shaftCostCurve(1)],
  ['shaft 7', eco.shaftCostCurve(7)],
  ['elevator', eco.elevatorCostCurve()],
  ['logistics (scaled)', eco.logisticsCostCurve(1e6)],
];

describe('bulk purchase (geometric series)', () => {
  it.each(curves)('%s: closed form equals the loop sum of single levels', (_name, curve) => {
    const rng = new Rng(42);
    for (let i = 0; i < 60; i++) {
      const level = rng.int(1, 380);
      const count = rng.int(1, 120);
      expectClose(eco.bulkCost(curve, level, count), loopCost(curve, level, count), 1e-9);
    }
  });

  it.each(curves)('%s: k_max formula matches a loop over single purchases', (_name, curve) => {
    const rng = new Rng(7);
    for (let i = 0; i < 60; i++) {
      const level = rng.int(1, 300);
      const cash = eco.bulkCost(curve, level, 1).mul(rng.range(0.5, 400));
      expect(eco.maxAffordable(curve, level, cash)).toBe(
        loopAffordable(curve, level, cash, 10_000),
      );
    }
  });

  it('treats cash exactly equal to the price as affordable', () => {
    const curve = eco.shaftCostCurve(2);
    for (const count of [1, 2, 10, 50]) {
      const exact = eco.bulkCost(curve, 5, count);
      expect(eco.maxAffordable(curve, 5, exact)).toBe(count);
    }
  });

  it('respects the max-count clamp and zero cash', () => {
    const curve = eco.elevatorCostCurve();
    expect(eco.maxAffordable(curve, 1, D('1e300'), 37)).toBe(37);
    expect(eco.maxAffordable(curve, 1, ZERO)).toBe(0);
    expect(eco.maxAffordable(curve, 1, D(24.99))).toBe(0);
  });

  it('works far beyond 1e308', () => {
    const curve = eco.shaftCostCurve(30);
    const level = 7_000;
    const price = eco.bulkCost(curve, level, 1);
    expect(price.exponent).toBeGreaterThan(308);
    const cash = eco.bulkCost(curve, level, 100);
    expect(eco.maxAffordable(curve, level, cash)).toBe(100);
  });

  it('returns zero for non-positive counts', () => {
    expect(eco.bulkCost(eco.shaftCostCurve(1), 10, 0).eq(0)).toBe(true);
  });
});
