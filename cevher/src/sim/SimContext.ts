import type { GameEvent } from '../state/events';
import type { GameState } from '../state/GameState';
import type { GameConfig } from './GameConfig';

/** Per-step context shared by the systems. `events` is a step-local accumulator. */
export interface SimContext {
  cfg: GameConfig;
  /** State at the beginning of the step (read-only, for flags etc.). */
  state: GameState;
  /** Step start (exclusive) and end (inclusive) in simulation ms. */
  t0: number;
  t1: number;
  events: GameEvent[];
}
