/**
 * Elevator (asansör) simulation (GDD 4.2).
 *
 * Route: wait at the surface → drop to the deepest open shaft → climb back up, stopping at every
 * shaft whose crate holds ore and taking as much as fits → climb straight to the surface once the
 * cage is full (or after shaft 1) → unload into the shaft-head depot.
 *
 * Loading time is proportional to the amount loaded (a full cage takes `fullLoadSec`). A saturated
 * elevator therefore always needs exactly tripBase + tripPerShaft × open shafts per trip, so the
 * real flow equals the GDD formula `capacity / trip time` — the bottleneck chain, offline income
 * and the balance simulator all rely on that identity.
 */
import { dmin, ZERO } from '../core/BigNum';
import type { ElevatorPhase, ElevatorState, MineState, ShaftState } from '../state/GameState';
import { replaceAt } from '../state/update';
import { isAutomated } from './automation';
import type { Economy } from './Economy';
import { mineDef } from './GameConfig';
import type { SimContext } from './SimContext';

/** Relative tolerance for "cage is full" to absorb floating-point drift. */
const FULL_TOLERANCE = 1e-9;

export function idlePhase(at: number): ElevatorPhase {
  return { kind: 'idle', startAt: at, endAt: Infinity, from: 0, to: 0 };
}

function movePhase(
  eco: Economy,
  kind: 'down' | 'rise' | 'up',
  level: number,
  from: number,
  to: number,
  at: number,
): ElevatorPhase {
  return { kind, startAt: at, endAt: at + eco.elevatorTravelMs(from, to, level), from, to };
}

function anyOre(shafts: readonly ShaftState[]): boolean {
  return shafts.some((s) => s.stored.gt(0));
}

/** Starts a trip if the elevator is idle and at least one shaft is open. */
export function startTrip(
  eco: Economy,
  elevator: ElevatorState,
  shaftCount: number,
  at: number,
): ElevatorState | null {
  if (elevator.phase.kind !== 'idle' || shaftCount === 0) return null;
  return { ...elevator, phase: movePhase(eco, 'down', elevator.level, 0, shaftCount, at) };
}

export function updateElevator(mine: MineState, ctx: SimContext): MineState {
  const { cfg, state, t0, t1, events } = ctx;
  const eco = cfg.economy;
  const scale = mineDef(cfg, mine.id).mineScale;
  const automated = isAutomated(state, mine.elevator);

  let elevator = mine.elevator;
  let shafts = mine.shafts;
  let stock = mine.surfaceStock;

  /** Elevator arrives at shaft `stop` (on the way up) at time `at`: load or move on. */
  const arriveAt = (stop: number, at: number): void => {
    const capacity = eco.elevatorCapacity(elevator.level, scale);
    const shaft = shafts[stop - 1];
    const room = capacity.sub(elevator.load);
    if (shaft && shaft.stored.gt(0) && room.gt(capacity.mul(FULL_TOLERANCE))) {
      const take = dmin(room, shaft.stored);
      shafts = replaceAt(shafts, stop - 1, { ...shaft, stored: shaft.stored.sub(take) });
      elevator = {
        ...elevator,
        load: elevator.load.add(take),
        phase: {
          kind: 'load',
          startAt: at,
          endAt: at + eco.elevatorLoadMs(take, capacity),
          from: stop,
          to: stop,
        },
      };
      return;
    }
    leaveStop(stop, at);
  };

  /** Leaves shaft `stop`: straight up when full or at the top shaft, else one shaft higher. */
  const leaveStop = (stop: number, at: number): void => {
    const capacity = eco.elevatorCapacity(elevator.level, scale);
    const full = elevator.load.gte(capacity.mul(1 - FULL_TOLERANCE));
    const phase =
      full || stop <= 1
        ? movePhase(eco, 'up', elevator.level, stop, 0, at)
        : movePhase(eco, 'rise', elevator.level, stop, stop - 1, at);
    elevator = { ...elevator, phase };
  };

  for (let guard = 0; guard < 100_000; guard++) {
    const phase = elevator.phase;
    if (phase.kind === 'idle') {
      if (!automated || shafts.length === 0 || !anyOre(shafts)) break;
      const at = Math.max(t0, phase.startAt);
      elevator = {
        ...elevator,
        phase: movePhase(eco, 'down', elevator.level, 0, shafts.length, at),
      };
      continue;
    }
    if (phase.endAt > t1) break;
    const at = phase.endAt;

    switch (phase.kind) {
      case 'down':
      case 'rise':
        arriveAt(phase.to, at);
        break;
      case 'load':
        leaveStop(phase.to, at);
        break;
      case 'up':
        elevator = {
          ...elevator,
          phase: {
            kind: 'unload',
            startAt: at,
            endAt: at + eco.elevatorUnloadMs(),
            from: 0,
            to: 0,
          },
        };
        break;
      case 'unload':
        if (elevator.load.gt(0)) {
          stock = stock.add(elevator.load);
          events.push({ type: 'elevatorUnloaded', mineId: mine.id, amount: elevator.load, at });
        }
        elevator = { ...elevator, load: ZERO, phase: idlePhase(at) };
        break;
    }
  }

  if (elevator === mine.elevator && shafts === mine.shafts && stock === mine.surfaceStock)
    return mine;
  return { ...mine, elevator, shafts, surfaceStock: stock };
}
