/**
 * Offline income contract (GDD 5.7). Implemented in Phase 1 together with managers and the save
 * system; Phase 0 has no managers, so nothing runs while the tab is hidden and the loop simply
 * resumes (see main.ts). The interface is fixed now so the loop and save code can depend on it.
 */
import type { Decimal } from '../core/BigNum';
import type { GameState } from '../state/GameState';
import type { GameConfig } from './GameConfig';

export interface OfflineReport {
  /** Real time the player was away, in ms. */
  elapsedMs: number;
  /** Time actually credited after the offline cap, in ms. */
  creditedMs: number;
  /** Cash earned per mine (only automated chains earn; a manual link makes it 0). */
  earnedByMine: Record<string, Decimal>;
  /** True when the offline cap cut the credited time. */
  capped: boolean;
  /** True when the device clock went backwards since the last save (no income granted). */
  clockRewound: boolean;
}

export interface OfflineCalculator {
  /**
   * Analytically computes what the automated units produced while away (no frame-by-frame
   * simulation): min(automated shaft flow, automated elevator flow, automated logistics flow)
   * × permanent multipliers × offline efficiency × min(elapsed, cap).
   */
  calculate(state: GameState, nowWallClockMs: number, cfg: GameConfig): OfflineReport;
  /** Applies a report to the state (adds the cash, advances timers). Pure. */
  apply(state: GameState, report: OfflineReport): GameState;
}
