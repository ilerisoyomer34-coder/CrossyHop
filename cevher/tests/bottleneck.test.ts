import { describe, expect, it } from 'vitest';
import { D } from '../src/core/BigNum';
import { newShaft } from '../src/state/factory';
import { bestShaftUpgrade, bottleneckOf, chainFlows } from '../src/state/selectors';
import { MINE, cfg, elevatorOf, expectClose, freshState, patchMine } from './helpers';

describe('bottleneckOf', () => {
  it('picks the smallest link', () => {
    expect(bottleneckOf({ shafts: D(1), elevator: D(2), logistics: D(3) })).toBe('shafts');
    expect(bottleneckOf({ shafts: D(5), elevator: D(2), logistics: D(3) })).toBe('elevator');
    expect(bottleneckOf({ shafts: D(5), elevator: D(4), logistics: D(3) })).toBe('logistics');
    expect(bottleneckOf({ shafts: D('1e400'), elevator: D('1e401'), logistics: D('1e399') })).toBe(
      'logistics',
    );
  });

  it('breaks ties in chain order', () => {
    expect(bottleneckOf({ shafts: D(2), elevator: D(2), logistics: D(2) })).toBe('shafts');
    expect(bottleneckOf({ shafts: D(3), elevator: D(2), logistics: D(2) })).toBe('elevator');
  });
});

describe('chainFlows on game states', () => {
  it('starts with the shafts as the bottleneck (2 ₵/s vs 6 ₵/s transport)', () => {
    const flows = chainFlows(freshState(), MINE, cfg);
    expect(flows.bottleneck).toBe('shafts');
    expectClose(flows.shafts, 2);
    expectClose(flows.logistics, 6);
    expectClose(flows.income, 2);
  });

  it('follows upgrades of each link', () => {
    // Shafts strong, elevator weakest.
    let state = patchMine(freshState(), (m) => ({
      ...m,
      shafts: [{ ...newShaft(), level: 50 }],
      logistics: { ...m.logistics, level: 100 },
    }));
    expect(chainFlows(state, MINE, cfg).bottleneck).toBe('elevator');
    // Elevator upgraded beyond logistics → logistics is next.
    state = patchMine(state, (m) => ({
      ...m,
      elevators: [{ ...elevatorOf(m), level: 300 }, ...m.elevators.slice(1)],
      logistics: { ...m.logistics, level: 20 },
    }));
    expect(chainFlows(state, MINE, cfg).bottleneck).toBe('logistics');
  });

  it('uses the real (depth dependent) elevator flow', () => {
    const shallow = patchMine(freshState(), (m) => ({
      ...m,
      elevators: [{ ...elevatorOf(m), level: 10 }, ...m.elevators.slice(1)],
    }));
    const deep = patchMine(shallow, (m) => ({
      ...m,
      shafts: Array.from({ length: 10 }, () => newShaft()),
    }));
    const a = chainFlows(shallow, MINE, cfg);
    const b = chainFlows(deep, MINE, cfg);
    expectClose(b.elevator, b.elevatorNominal);
    expect(a.elevator.gt(b.elevator)).toBe(true);
  });

  it('suggests the most cost-efficient shaft for the "Katlar" link', () => {
    const state = patchMine(freshState(), (m) => ({
      ...m,
      shafts: [
        { ...newShaft(), level: 60 },
        { ...newShaft(), level: 2 },
      ],
    }));
    expect(bestShaftUpgrade(state, MINE, cfg)).toBe(1);
  });
});
