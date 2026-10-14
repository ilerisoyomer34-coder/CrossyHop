/**
 * Which units run on their own.
 *
 * - While the game is open: a unit with a manager (Phase 1), every unit in the player's automatic
 *   play mode, or every unit with the debug manager simulation.
 * - While the game is closed (offline income, GDD 5.7): only managers — and the debug manager
 *   simulation that stands in for them. The automatic play mode deliberately stops with the game.
 */
import { FLAG_DEBUG_AUTORUN, type GameState } from '../state/GameState';

export interface ManagedUnit {
  managerId?: string;
}

/** Runs on its own while the game is open. */
export function isAutomated(state: GameState, unit: ManagedUnit): boolean {
  return state.settings.playMode === 'auto' || worksOffline(state, unit);
}

/** Keeps producing while the game is closed. */
export function worksOffline(state: GameState, unit: ManagedUnit): boolean {
  return unit.managerId !== undefined || state.flags[FLAG_DEBUG_AUTORUN] === true;
}
