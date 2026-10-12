/** Small helpers for immutable (copy-on-write) state updates. */
import type { GameState, MineState } from './GameState';

export function replaceAt<T>(items: readonly T[], index: number, value: T): T[] {
  const copy = items.slice();
  copy[index] = value;
  return copy;
}

export function getMine(state: GameState, mineId: string): MineState {
  const mine = state.mines[mineId];
  if (!mine) throw new Error(`Unknown mine "${mineId}" in state`);
  return mine;
}

/** Returns a new state with `mineId` replaced by `fn(mine)` (or the same state if unchanged). */
export function updateMine(
  state: GameState,
  mineId: string,
  fn: (mine: MineState) => MineState,
): GameState {
  const mine = getMine(state, mineId);
  const next = fn(mine);
  if (next === mine) return state;
  return { ...state, mines: { ...state.mines, [mineId]: next } };
}
