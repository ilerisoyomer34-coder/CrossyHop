import { describe, expect, it } from 'vitest';
import targets from '../src/data/progressionTargets.json';
import { runGreedyBot } from '../src/sim/bots/runBot';
import { cfg } from './helpers';

const target8 = targets.targets.find((t) => t.shaft === 8);

describe('Phase 0 acceptance: greedy play reaches shaft 8 within ±30 % of GDD 5.5', () => {
  it.each(['tap', 'auto'] as const)('greedy bot (%s mode, barrier wait included)', (mode) => {
    if (!target8) throw new Error('missing shaft 8 target');
    const result = runGreedyBot(cfg, { untilShafts: 8, maxSeconds: 3600, mode });
    const unlock8 = result.unlocks.find((u) => u.shaft === 8);
    expect(unlock8, 'shaft 8 was never opened').toBeDefined();
    const seconds = unlock8?.seconds ?? Infinity;
    console.info(`[greedy:${mode}] shaft 8 opened after ${(seconds / 60).toFixed(2)} min`);
    expect(seconds).toBeGreaterThanOrEqual(target8.seconds * (1 - targets.tolerance));
    expect(seconds).toBeLessThanOrEqual(target8.seconds * (1 + targets.tolerance));
  });

  it('opens shafts in order and income keeps growing', () => {
    const result = runGreedyBot(cfg, { untilShafts: 8, maxSeconds: 3600, mode: 'tap' });
    const shafts = result.unlocks.map((u) => u.shaft);
    expect(shafts).toEqual([2, 3, 4, 5, 6, 7, 8]);
    for (let i = 1; i < result.unlocks.length; i++) {
      const prev = result.unlocks[i - 1];
      const cur = result.unlocks[i];
      if (prev && cur) expect(cur.income.gt(prev.income)).toBe(true);
    }
  });
});
