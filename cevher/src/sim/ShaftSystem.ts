/**
 * Shaft (maden katı) simulation.
 *
 * A dig cycle is: walk to the rock face → dig (3 hits) → walk back with the sack → dump into the
 * crate. Ore is deposited at the end of each cycle. Without automation one tap runs one cycle for
 * all miners together. With automation every miner loops forever; miner j is phase-shifted by
 * frac(j·φ) of a cycle so deposits are spread out and adding a miner never disturbs the others.
 *
 * Deposits are computed analytically from absolute times, so the result is exact for any step size.
 */
import type { Decimal } from '../core/BigNum';
import type { MineState, ShaftState } from '../state/GameState';
import { isAutomated } from './automation';
import { mineDef } from './GameConfig';
import type { SimContext } from './SimContext';

const PHI = 0.6180339887498949;

/** Fraction of a cycle by which miner `j` is shifted in automated mode. */
export function minerPhaseOffset(j: number): number {
  return (j * PHI) % 1;
}

/** Number of cycles completed by time `t` for a miner whose cycle chain started at `start`. */
export function completedCycles(start: number, cycleMs: number, t: number): number {
  if (t < start + cycleMs) return 0;
  return Math.floor((t - start) / cycleMs);
}

/**
 * Start time of the cycle miner `j` is in at time `t`, or null when the miner is idle.
 * Used by the renderer to pose miners; pure function of the shaft state.
 */
export function minerCycleStart(
  shaft: ShaftState,
  j: number,
  t: number,
  cycleMs: number,
): number | null {
  if (shaft.autoSince !== null) {
    const start = shaft.autoSince + minerPhaseOffset(j) * cycleMs;
    if (t >= start) return start + Math.floor((t - start) / cycleMs) * cycleMs;
  }
  if (shaft.manualCycleEndsAt !== null) {
    const start = shaft.manualCycleEndsAt - cycleMs;
    if (t >= start && t < shaft.manualCycleEndsAt) return start;
  }
  return null;
}

export function updateShafts(mine: MineState, ctx: SimContext): MineState {
  const { cfg, state, t0, t1 } = ctx;
  const eco = cfg.economy;
  const scale = mineDef(cfg, mine.id).mineScale;
  const cycleMs = eco.shaftCycleMs();
  let shafts: ShaftState[] | null = null;

  for (let i = 0; i < mine.shafts.length; i++) {
    const shaft = mine.shafts[i];
    if (!shaft) continue;
    let next = shaft;
    const miners = eco.minerCount(shaft.level);
    let minerDeposits = 0;

    if (shaft.manualCycleEndsAt !== null && shaft.manualCycleEndsAt <= t1) {
      minerDeposits += miners;
      next = { ...next, manualCycleEndsAt: null };
    }

    if (isAutomated(state, shaft)) {
      let autoSince = shaft.autoSince;
      if (autoSince === null) {
        // Let a running manual cycle finish, then start looping.
        autoSince = Math.max(t0, shaft.manualCycleEndsAt ?? t0);
        next = { ...next, autoSince };
      }
      for (let j = 0; j < miners; j++) {
        const start = autoSince + minerPhaseOffset(j) * cycleMs;
        minerDeposits += completedCycles(start, cycleMs, t1) - completedCycles(start, cycleMs, t0);
      }
    } else if (shaft.autoSince !== null) {
      next = { ...next, autoSince: null };
    }

    if (minerDeposits > 0) {
      const amount: Decimal = eco.shaftLoadPerMiner(i + 1, shaft.level, scale).mul(minerDeposits);
      next = { ...next, stored: next.stored.add(amount) };
    }

    if (next !== shaft) {
      shafts ??= mine.shafts.slice();
      shafts[i] = next;
    }
  }
  return shafts ? { ...mine, shafts } : mine;
}
