import { expect } from 'vitest';
import { D, nearlyEqual, type Decimal, type DecimalSource } from '../src/core/BigNum';
import { createInitialState } from '../src/state/factory';
import type { GameState, MineState } from '../src/state/GameState';
import { getMine, updateMine } from '../src/state/update';
import { defaultConfig, type GameConfig } from '../src/sim/GameConfig';

export const cfg: GameConfig = defaultConfig;
export const MINE = defaultConfig.startMineId;

export function expectClose(actual: Decimal, expected: DecimalSource, relTol = 1e-9): void {
  const ok = nearlyEqual(actual, D(expected), relTol);
  if (!ok) {
    expect.fail(
      `expected ${actual.toString()} to be within ${relTol} of ${D(expected).toString()}`,
    );
  }
}

export function freshState(): GameState {
  return createInitialState(cfg, 0);
}

export function mine(state: GameState): MineState {
  return getMine(state, MINE);
}

export function patchMine(state: GameState, patch: (m: MineState) => MineState): GameState {
  return updateMine(state, MINE, patch);
}

/** Recursively freezes an object graph (Decimals included) to catch accidental mutation. */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}
