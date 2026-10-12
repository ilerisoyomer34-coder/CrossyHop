/**
 * Headless driver: runs the real simulation with the greedy bot playing. Shared by the unit tests
 * (Phase 0 acceptance: shaft 8 timing) and `tools/balance-sim.ts`.
 */
import type { Decimal } from '../../core/BigNum';
import { createInitialState } from '../../state/factory';
import { debugSetAutoRun } from '../../state/actions';
import type { GameState } from '../../state/GameState';
import { chainFlows } from '../../state/selectors';
import { getMine } from '../../state/update';
import type { GameConfig } from '../GameConfig';
import { stepSimulation } from '../Simulation';
import { greedyBotTick } from './GreedyBot';

export interface BotRunOptions {
  /** Stop once this many shafts are open. */
  untilShafts: number;
  /** Hard time limit in simulated seconds. */
  maxSeconds: number;
  stepMs?: number;
  /** Bot reaction interval in simulation steps (default 4 → 200 ms). */
  botEverySteps?: number;
  /** 'tap': the bot taps manual units (no managers). 'auto': all units automated (debug flag). */
  mode?: 'tap' | 'auto';
  /** Called whenever a new shaft opens. */
  onShaftUnlocked?: (record: UnlockRecord) => void;
}

export interface UnlockRecord {
  shaft: number;
  seconds: number;
  income: Decimal;
}

export interface BotRunResult {
  state: GameState;
  unlocks: UnlockRecord[];
  seconds: number;
  /** Total simulated barrier blast time the bot had to wait through, in seconds. */
  barrierSeconds: number;
}

export function runGreedyBot(cfg: GameConfig, options: BotRunOptions): BotRunResult {
  const stepMs = options.stepMs ?? 50;
  const botEvery = options.botEverySteps ?? 4;
  let state = createInitialState(cfg, 0);
  if (options.mode === 'auto') {
    const r = debugSetAutoRun(state, true);
    state = r.state;
  }
  const mineId = state.activeMineId;
  const unlocks: UnlockRecord[] = [];
  let known = 1;
  let barrierSeconds = 0;
  const maxSteps = Math.ceil((options.maxSeconds * 1000) / stepMs);

  for (let step = 0; step < maxSteps; step++) {
    if (step % botEvery === 0) {
      state = greedyBotTick(state, mineId, cfg).state;
    }
    const mine = getMine(state, mineId);
    if (mine.barrier) barrierSeconds += stepMs / 1000;
    state = stepSimulation(state, stepMs, cfg).state;

    const open = getMine(state, mineId).shafts.length;
    if (open > known) {
      // The unlock happened in the bot tick before this step.
      for (let n = known + 1; n <= open; n++) {
        const record: UnlockRecord = {
          shaft: n,
          seconds: (getMine(state, mineId).shaftUnlockedAt[n - 1] ?? state.time) / 1000,
          income: chainFlows(state, mineId, cfg).income,
        };
        unlocks.push(record);
        options.onShaftUnlocked?.(record);
      }
      known = open;
      if (open >= options.untilShafts) break;
    }
  }
  return { state, unlocks, seconds: state.time / 1000, barrierSeconds };
}
