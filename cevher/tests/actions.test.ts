import { describe, expect, it } from 'vitest';
import { D } from '../src/core/BigNum';
import {
  buyElevatorLevels,
  buyLogisticsLevels,
  buyShaftLevels,
  buyWithMode,
  debugUnlockAllShafts,
  unlockNextShaft,
} from '../src/state/actions';
import { quoteUpgrade } from '../src/state/selectors';
import { cfg, expectClose, freshState, MINE, mine, patchMine } from './helpers';

const eco = cfg.economy;
const rich = () => patchMine(freshState(), (m) => ({ ...m, cash: D('1e12') }));

describe('buying levels', () => {
  it('charges the exact bulk price and raises the level', () => {
    const r = buyShaftLevels(rich(), MINE, 0, 10, cfg);
    expect(r.ok).toBe(true);
    expect(mine(r.state).shafts[0]?.level).toBe(11);
    expectClose(mine(r.state).cash, D('1e12').sub(eco.bulkCost(eco.shaftCostCurve(1), 1, 10)));
    expect(r.state.stats.levelsBought).toBe(10);
  });

  it('is all-or-nothing when cash is short', () => {
    const state = patchMine(freshState(), (m) => ({ ...m, cash: D(10) }));
    const r = buyShaftLevels(state, MINE, 0, 2, cfg);
    expect(r.ok ? 'ok' : r.reason).toBe('insufficientCash');
    expect(r.state).toBe(state);
  });

  it('emits a milestone event when crossing a multiple of 25', () => {
    const r = buyShaftLevels(rich(), MINE, 0, 24, cfg);
    const milestone = r.events.find((e) => e.type === 'milestoneReached');
    expect(milestone).toMatchObject({ level: 25, multiplier: 2 });
    const e = buyElevatorLevels(rich(), MINE, 49, cfg).events.find(
      (ev) => ev.type === 'milestoneReached',
    );
    expect(e).toMatchObject({ level: 50, multiplier: 9 });
  });

  it('refuses to exceed the max level', () => {
    const state = patchMine(rich(), (m) => ({
      ...m,
      shafts: m.shafts.map((s) => ({ ...s, level: cfg.econ.shaft.maxLevel })),
    }));
    const r = buyShaftLevels(state, MINE, 0, 1, cfg);
    expect(r.ok ? 'ok' : r.reason).toBe('maxLevel');
  });

  it('hires carriers as logistics crosses thresholds', () => {
    const r = buyLogisticsLevels(rich(), MINE, 9, cfg);
    expect(mine(r.state).logistics.level).toBe(10);
    expect(mine(r.state).logistics.carriers).toHaveLength(2);
  });
});

describe('buy modes', () => {
  it('quotes ×1, ×10, ×50, MAKS and next milestone', () => {
    const state = patchMine(freshState(), (m) => ({ ...m, cash: D(1000) }));
    const unit = { kind: 'shaft' as const, index: 0 };
    expect(quoteUpgrade(state, MINE, unit, 'x1', cfg).count).toBe(1);
    expect(quoteUpgrade(state, MINE, unit, 'x10', cfg).count).toBe(10);
    expect(quoteUpgrade(state, MINE, unit, 'x50', cfg).count).toBe(50);
    expect(quoteUpgrade(state, MINE, unit, 'milestone', cfg).count).toBe(24);
    const max = quoteUpgrade(state, MINE, unit, 'max', cfg);
    expect(max.count).toBe(eco.maxAffordable(eco.shaftCostCurve(1), 1, D(1000)));
    expect(max.affordable).toBe(true);
  });

  it('MAKS shows the price of one level when nothing is affordable', () => {
    const q = quoteUpgrade(freshState(), MINE, { kind: 'elevator' }, 'max', cfg);
    expect(q.count).toBe(1);
    expect(q.affordable).toBe(false);
    expectClose(q.cost, 25);
  });

  it('buyWithMode MAKS spends as much as possible', () => {
    const state = patchMine(freshState(), (m) => ({ ...m, cash: D(500) }));
    const r = buyWithMode(state, MINE, { kind: 'logistics' }, 'max', cfg);
    expect(r.ok).toBe(true);
    const left = mine(r.state).cash;
    expect(left.lt(eco.logisticsUpgradeCost(mine(r.state).logistics.level))).toBe(true);
  });

  it('next-milestone mode stops exactly at the milestone', () => {
    const state = patchMine(rich(), (m) => ({ ...m, elevator: { ...m.elevator, level: 30 } }));
    const r = buyWithMode(state, MINE, { kind: 'elevator' }, 'milestone', cfg);
    expect(mine(r.state).elevator.level).toBe(50);
  });
});

describe('opening shafts', () => {
  it('charges U(n) and records the unlock time', () => {
    const state = { ...patchMine(freshState(), (m) => ({ ...m, cash: D(100) })), time: 12_345 };
    const r = unlockNextShaft(state, MINE, cfg);
    expect(r.ok).toBe(true);
    expect(mine(r.state).shafts).toHaveLength(2);
    expectClose(mine(r.state).cash, 40);
    expect(mine(r.state).shaftUnlockedAt[1]).toBe(12_345);
  });

  it('stops at the mine depth', () => {
    const all = debugUnlockAllShafts(rich(), MINE, cfg).state;
    expect(mine(all).shafts).toHaveLength(cfg.mines[MINE]?.shaftCount ?? 0);
    const r = unlockNextShaft(all, MINE, cfg);
    expect(r.ok ? 'ok' : r.reason).toBe('maxShafts');
  });
});
