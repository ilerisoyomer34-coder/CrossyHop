/**
 * Shaft (maden katı) simulation.
 *
 * A dig cycle is: walk to the rock face → dig (3 hits) → walk back with the sack → dump into the
 * crate. Ore is deposited at the end of each cycle. Without automation one tap runs one cycle for
 * all miners together. With automation every miner loops forever; miner j is phase-shifted by
 * frac(j·φ) of a cycle so deposits are spread out and adding a miner never disturbs the others.
 *
 * When automation is switched off, every miner finishes the cycle it is in (the ore in the sack is
 * not lost) and then rests; `autoUntil` marks the switch-off time until the last of those cycles
 * has ended. Switched back on during that wind-down, the miners finish first and then start a fresh
 * loop together.
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

/** Number of cycles of a chain starting at `start` that began strictly before `until`. */
export function startedCycles(start: number, cycleMs: number, until: number): number {
  return until > start ? Math.ceil((until - start) / cycleMs) : 0;
}

/**
 * When the wind-down after an automation switch-off at `until` is over: the end of the last cycle
 * any miner started before `until` (or `until` itself when no miner had started yet).
 */
export function windDownEnd(
  autoSince: number,
  until: number,
  miners: number,
  cycleMs: number,
): number {
  let end = until;
  for (let j = 0; j < miners; j++) {
    const start = autoSince + minerPhaseOffset(j) * cycleMs;
    const started = startedCycles(start, cycleMs, until);
    if (started > 0) end = Math.max(end, start + started * cycleMs);
  }
  return end;
}

/** Cycles completed in (t0, t1], optionally only those that started before `until`. */
function cyclesBetween(
  start: number,
  cycleMs: number,
  t0: number,
  t1: number,
  until: number | null,
): number {
  const cap = until === null ? Infinity : startedCycles(start, cycleMs, until);
  return (
    Math.min(completedCycles(start, cycleMs, t1), cap) -
    Math.min(completedCycles(start, cycleMs, t0), cap)
  );
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
    if (t >= start) {
      const current = start + Math.floor((t - start) / cycleMs) * cycleMs;
      // Winding down: only the cycle that was running at switch-off is still played out.
      if (shaft.autoUntil === null || current < shaft.autoUntil) return current;
    }
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

    if (shaft.autoSince !== null && (shaft.autoUntil !== null || !isAutomated(state, shaft))) {
      // Winding down (automation switched off): every miner finishes the cycle it started, then rests.
      const autoSince = shaft.autoSince;
      const until = shaft.autoUntil ?? t0;
      for (let j = 0; j < miners; j++) {
        const start = autoSince + minerPhaseOffset(j) * cycleMs;
        minerDeposits += cyclesBetween(start, cycleMs, t0, t1, until);
      }
      const end = windDownEnd(autoSince, until, miners, cycleMs);
      if (t1 < end) {
        if (shaft.autoUntil === null) next = { ...next, autoUntil: until };
      } else if (isAutomated(state, shaft)) {
        // Switched back on meanwhile: a fresh loop starts once the last miner is done, so nobody
        // jumps into a cycle they were not seen working on.
        const fresh = Math.max(t0, end);
        next = { ...next, autoSince: fresh, autoUntil: null };
        for (let j = 0; j < miners; j++) {
          const start = fresh + minerPhaseOffset(j) * cycleMs;
          minerDeposits += cyclesBetween(start, cycleMs, t0, t1, null);
        }
      } else {
        next = { ...next, autoSince: null, autoUntil: null };
      }
    } else if (isAutomated(state, shaft)) {
      let autoSince = shaft.autoSince;
      if (autoSince === null) {
        // Let a running manual cycle finish, then start looping.
        autoSince = Math.max(t0, shaft.manualCycleEndsAt ?? t0);
        next = { ...next, autoSince };
      }
      for (let j = 0; j < miners; j++) {
        const start = autoSince + minerPhaseOffset(j) * cycleMs;
        minerDeposits += cyclesBetween(start, cycleMs, t0, t1, null);
      }
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
