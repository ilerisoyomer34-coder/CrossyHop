/** Which units run on their own. Phase 1 adds managers; Phase 0 only has the debug toggle. */
import { FLAG_DEBUG_AUTORUN, type GameState } from '../state/GameState';

export interface ManagedUnit {
  managerId?: string;
}

export function isAutomated(state: GameState, unit: ManagedUnit): boolean {
  return unit.managerId !== undefined || state.flags[FLAG_DEBUG_AUTORUN] === true;
}
