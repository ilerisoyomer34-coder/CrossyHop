/**
 * One fixed simulation step. Pure: (state, dt) → (new state, events).
 *
 * Tick order (GDD 13.3): boosts → manager skill timers → region rules → shafts → elevator →
 * logistics → refinery → sale → contracts/achievements. Phase 0 implements the barrier timers,
 * shafts, elevator and logistics (sale happens when a wagon reaches the warehouse); the other stages
 * are added in later phases at the marked positions.
 */
import type { GameEvent } from '../state/events';
import type { GameState, MineState } from '../state/GameState';
import { updateBarrier } from './BarrierSystem';
import { updateElevators } from './ElevatorSystem';
import { defaultConfig, type GameConfig } from './GameConfig';
import { updateLogistics } from './LogisticsSystem';
import { updateShafts } from './ShaftSystem';
import type { SimContext } from './SimContext';

export interface StepResult {
  state: GameState;
  events: GameEvent[];
}

export function stepSimulation(
  state: GameState,
  dtMs: number,
  cfg: GameConfig = defaultConfig,
): StepResult {
  const ctx: SimContext = { cfg, state, t0: state.time, t1: state.time + dtMs, events: [] };
  let mines: Record<string, MineState> | null = null;

  for (const [id, original] of Object.entries(state.mines)) {
    let mine = original;
    // (Phase 2) boosts · (Phase 1) manager skill timers · (Phase 2) region rules
    mine = updateBarrier(mine, ctx);
    mine = updateShafts(mine, ctx);
    mine = updateElevators(mine, ctx);
    mine = updateLogistics(mine, ctx);
    // (Phase 2) refinery · contracts / achievements (throttled to 1 Hz)
    if (mine !== original) {
      mines ??= { ...state.mines };
      mines[id] = mine;
    }
  }

  let stats = state.stats;
  for (const e of ctx.events) {
    if (e.type === 'saleCompleted') {
      stats = { ...stats, totalEarned: stats.totalEarned.add(e.amount) };
    }
  }

  return {
    state: { ...state, time: ctx.t1, mines: mines ?? state.mines, stats },
    events: ctx.events,
  };
}

/** Runs many steps (headless fast-forward, tests). Returns the final state and all events. */
export function runSimulation(
  state: GameState,
  durationMs: number,
  stepMs: number,
  cfg: GameConfig = defaultConfig,
  onStep?: (s: GameState) => GameState,
): StepResult {
  let current = state;
  const events: GameEvent[] = [];
  const steps = Math.floor(durationMs / stepMs);
  for (let i = 0; i < steps; i++) {
    const r = stepSimulation(current, stepMs, cfg);
    current = onStep ? onStep(r.state) : r.state;
    for (const e of r.events) events.push(e);
  }
  return { state: current, events };
}
