/**
 * Offline progress (GDD 5.7), computed analytically instead of frame by frame. Used when a save is
 * loaded and when the tab returns after a long hide.
 *
 * - Income: only automated links work while away. Per mine:
 *   min(automated shaft flow, automated elevator flow, automated logistics flow)
 *   × permanent multipliers × offline efficiency × min(elapsed, offline cap).
 *   A link without automation makes the whole chain 0 (Phase 0 has no managers, so only the debug
 *   auto-run flag produces offline income).
 * - Real-time timers (rock barrier blasts) keep running for the whole elapsed time, uncapped.
 * - Clock guard: when the device clock went backwards nothing is granted and the state is flagged.
 */
import { type Decimal, dmin, ZERO } from '../core/BigNum';
import { FLAG_CLOCK_REWOUND, type GameState, type MineState } from '../state/GameState';
import { getMine } from '../state/update';
import { isAutomated } from './automation';
import { mineDef, type GameConfig } from './GameConfig';
import { incomeMultiplier } from './Multipliers';

export interface OfflineReport {
  /** Real time the player was away, in ms (0 when the clock was rewound). */
  elapsedMs: number;
  /** Time actually credited after the offline cap, in ms. */
  creditedMs: number;
  /** Cash earned per mine (only automated chains earn; a manual link makes it 0). */
  earnedByMine: Record<string, Decimal>;
  /** Sum over all mines. */
  totalEarned: Decimal;
  /** True when the offline cap cut the credited time. */
  capped: boolean;
  /** True when the device clock went backwards since the last save (no income granted). */
  clockRewound: boolean;
}

/** Offline efficiency (0..1). Phase 2: research raises it towards 100 %. */
export function offlineEfficiency(_state: GameState, cfg: GameConfig): number {
  return cfg.econ.offline.baseEfficiency;
}

/** Offline cap in ms. Phase 2: research raises it towards 12 h. */
export function offlineCapMs(_state: GameState, cfg: GameConfig): number {
  return cfg.econ.offline.baseCapHours * 3_600_000;
}

/** ₵/s the automated part of a mine's chain sells (before the offline efficiency). */
export function automatedIncomePerSec(state: GameState, mineId: string, cfg: GameConfig): Decimal {
  const mine = getMine(state, mineId);
  const eco = cfg.economy;
  const scale = mineDef(cfg, mineId).mineScale;
  let shafts = ZERO;
  mine.shafts.forEach((shaft, i) => {
    if (isAutomated(state, shaft))
      shafts = shafts.add(eco.shaftProduction(i + 1, shaft.level, scale));
  });
  const elevator = isAutomated(state, mine.elevator)
    ? eco.elevatorRealFlow(mine.elevator.level, mine.shafts.length, scale)
    : ZERO;
  const logistics = isAutomated(state, mine.logistics)
    ? eco.logisticsFlow(mine.logistics.level, scale)
    : ZERO;
  return dmin(dmin(shafts, elevator), logistics).mul(incomeMultiplier(state, mineId, cfg).total);
}

/** What the player earned between `awayFromMs` and `awayToMs` (wall clock, epoch ms). */
export function calculateOffline(
  state: GameState,
  awayFromMs: number,
  awayToMs: number,
  cfg: GameConfig,
): OfflineReport {
  const clockRewound = awayToMs < awayFromMs;
  const elapsedMs = clockRewound ? 0 : awayToMs - awayFromMs;
  const capMs = offlineCapMs(state, cfg);
  const creditedMs = Math.min(elapsedMs, capMs);
  const efficiency = offlineEfficiency(state, cfg);
  const earnedByMine: Record<string, Decimal> = {};
  let totalEarned = ZERO;
  for (const mineId of Object.keys(state.mines)) {
    const earned = automatedIncomePerSec(state, mineId, cfg).mul(efficiency * (creditedMs / 1000));
    earnedByMine[mineId] = earned;
    totalEarned = totalEarned.add(earned);
  }
  return {
    elapsedMs,
    creditedMs,
    earnedByMine,
    totalEarned,
    capped: elapsedMs > capMs,
    clockRewound,
  };
}

function applyToMine(mine: MineState, earned: Decimal, elapsedMs: number, now: number): MineState {
  let next = mine;
  if (earned.gt(0)) {
    next = { ...next, cash: next.cash.add(earned), earnedThisRun: next.earnedThisRun.add(earned) };
  }
  const barrier = next.barrier;
  if (barrier && elapsedMs > 0) {
    // The blast keeps burning while the player is away; BarrierSystem clears it on the next step.
    next = { ...next, barrier: { ...barrier, endsAt: Math.max(now, barrier.endsAt - elapsedMs) } };
  }
  return next;
}

/** Credits a report to the state. Pure; the simulation clock itself does not move. */
export function applyOffline(state: GameState, report: OfflineReport): GameState {
  const mines: Record<string, MineState> = {};
  for (const [id, mine] of Object.entries(state.mines)) {
    mines[id] = applyToMine(mine, report.earnedByMine[id] ?? ZERO, report.elapsedMs, state.time);
  }
  return {
    ...state,
    mines,
    stats: { ...state.stats, totalEarned: state.stats.totalEarned.add(report.totalEarned) },
    flags: report.clockRewound ? { ...state.flags, [FLAG_CLOCK_REWOUND]: true } : state.flags,
  };
}
