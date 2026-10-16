import { expect } from 'vitest';
import { D, nearlyEqual, type Decimal, type DecimalSource } from '../src/core/BigNum';
import { createInitialState } from '../src/state/factory';
import type { ElevatorState, GameState, MineState } from '../src/state/GameState';
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

/** Elevator `zone` of a mine (zone 0 reaches the surface). */
export function elevatorOf(m: MineState, zone = 0): ElevatorState {
  const e = m.elevators[zone];
  if (!e) throw new Error(`no elevator ${zone}`);
  return e;
}

/** Replaces elevator `zone` of the test mine. */
export function patchElevator(
  state: GameState,
  patch: (e: ElevatorState) => ElevatorState,
  zone = 0,
): GameState {
  return patchMine(state, (m) => ({
    ...m,
    elevators: m.elevators.map((e, z) => (z === zone ? patch(e) : e)),
  }));
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
