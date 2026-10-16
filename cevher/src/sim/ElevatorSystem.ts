/**
 * Elevator (asansör) simulation (GDD 4.2), one elevator per zone (relay elevators, sim/zones.ts).
 *
 * Route of the elevator of a zone: wait at its dock → drop to its deepest stop (the transfer station
 * below the zone if a deeper zone is open, otherwise the zone's deepest shaft) → climb back up,
 * stopping at every stop that holds ore and taking as much as fits → climb straight to the dock once
 * the cage is full (or after the zone's first shaft) → unload: into the shaft-head depot for zone 0,
 * into the transfer station above the zone for deeper elevators.
 *
 * Loading time is proportional to the amount loaded (a full cage takes `fullLoadSec`). A saturated
 * elevator therefore always needs exactly tripBase + tripPerShaft × stops per trip, so its real flow
 * equals the GDD formula `capacity / trip time` — the bottleneck chain, offline income and the
 * balance simulator all rely on that identity.
 */
import { type Decimal, dmin, ZERO } from '../core/BigNum';
import type { ElevatorPhase, ElevatorState, MineState, ShaftState } from '../state/GameState';
import { replaceAt } from '../state/update';
import { isAutomated } from './automation';
import type { Economy } from './Economy';
import { mineDef, type GameConfig } from './GameConfig';
import type { SimContext } from './SimContext';
import { zoneView, type ZoneView } from './zones';

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

/** Capacity per trip of the elevator of `zone` at `level`. */
export function zoneElevatorCapacity(
  cfg: GameConfig,
  mineId: string,
  zone: number,
  level: number,
): Decimal {
  const eco = cfg.economy;
  const scale = mineDef(cfg, mineId).mineScale * eco.elevatorZoneFlowScale(zone);
  return eco.elevatorCapacity(level, scale);
}

/** Starts a trip to `deepestStop` if the elevator is idle and has somewhere to go. */
export function startTrip(
  eco: Economy,
  elevator: ElevatorState,
  deepestStop: number,
  at: number,
): ElevatorState | null {
  if (elevator.phase.kind !== 'idle' || deepestStop <= 0) return null;
  return { ...elevator, phase: movePhase(eco, 'down', elevator.level, 0, deepestStop, at) };
}

interface ZoneRun {
  shafts: ShaftState[];
  stations: Decimal[];
  surfaceStock: Decimal;
}

function zoneHasOre(view: ZoneView, run: ZoneRun): boolean {
  for (let k = 0; k < view.count; k++) {
    if (run.shafts[view.first + k]?.stored.gt(0)) return true;
  }
  return view.hasStationBelow && (run.stations[view.zone]?.gt(0) ?? false);
}

/** Advances the elevator of one zone over (t0, t1]; mutates `run` (fresh arrays only). */
function updateZone(
  mine: MineState,
  view: ZoneView,
  elevator: ElevatorState,
  run: ZoneRun,
  ctx: SimContext,
): ElevatorState {
  const { cfg, state, t0, t1, events } = ctx;
  const eco = cfg.economy;
  const automated = isAutomated(state, elevator);
  const capacity = (): Decimal => zoneElevatorCapacity(cfg, mine.id, view.zone, elevator.level);

  /** Ore available at stop `stop` (a shaft crate or the station below the zone). */
  const stockAt = (stop: number): Decimal => {
    if (stop >= 1 && stop <= view.count) return run.shafts[view.first + stop - 1]?.stored ?? ZERO;
    if (view.hasStationBelow && stop === view.count + 1) return run.stations[view.zone] ?? ZERO;
    return ZERO;
  };
  const takeAt = (stop: number, amount: Decimal): void => {
    if (stop >= 1 && stop <= view.count) {
      const i = view.first + stop - 1;
      const shaft = run.shafts[i];
      if (shaft)
        run.shafts = replaceAt(run.shafts, i, { ...shaft, stored: shaft.stored.sub(amount) });
    } else {
      run.stations = replaceAt(run.stations, view.zone, stockAt(stop).sub(amount));
    }
  };

  /** Elevator arrives at `stop` (on the way up) at time `at`: load or move on. */
  const arriveAt = (stop: number, at: number): void => {
    const cap = capacity();
    const available = stockAt(stop);
    const room = cap.sub(elevator.load);
    if (available.gt(0) && room.gt(cap.mul(FULL_TOLERANCE))) {
      const take = dmin(room, available);
      takeAt(stop, take);
      elevator = {
        ...elevator,
        load: elevator.load.add(take),
        phase: {
          kind: 'load',
          startAt: at,
          endAt: at + eco.elevatorLoadMs(take, cap),
          from: stop,
          to: stop,
        },
      };
      return;
    }
    leaveStop(stop, at);
  };

  /** Leaves `stop`: straight up when full or at the zone's first shaft, else one stop higher. */
  const leaveStop = (stop: number, at: number): void => {
    const full = elevator.load.gte(capacity().mul(1 - FULL_TOLERANCE));
    const phase =
      full || stop <= 1
        ? movePhase(eco, 'up', elevator.level, stop, 0, at)
        : movePhase(eco, 'rise', elevator.level, stop, stop - 1, at);
    elevator = { ...elevator, phase };
  };

  for (let guard = 0; guard < 100_000; guard++) {
    const phase = elevator.phase;
    if (phase.kind === 'idle') {
      if (!automated || view.deepestStop === 0 || !zoneHasOre(view, run)) break;
      const at = Math.max(t0, phase.startAt);
      elevator = {
        ...elevator,
        phase: movePhase(eco, 'down', elevator.level, 0, view.deepestStop, at),
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
          if (view.zone === 0) {
            run.surfaceStock = run.surfaceStock.add(elevator.load);
            events.push({ type: 'elevatorUnloaded', mineId: mine.id, amount: elevator.load, at });
          } else {
            const s = view.zone - 1;
            run.stations = replaceAt(run.stations, s, (run.stations[s] ?? ZERO).add(elevator.load));
          }
        }
        elevator = { ...elevator, load: ZERO, phase: idlePhase(at) };
        break;
    }
  }
  return elevator;
}

/**
 * Advances every elevator of the mine, deepest zone first so ore handed to a station can move on
 * within the same step.
 */
export function updateElevators(mine: MineState, ctx: SimContext): MineState {
  const run: ZoneRun = {
    shafts: mine.shafts,
    stations: mine.stations,
    surfaceStock: mine.surfaceStock,
  };
  let elevators = mine.elevators;
  for (let z = mine.elevators.length - 1; z >= 0; z--) {
    const current = elevators[z];
    if (!current) continue;
    const next = updateZone(mine, zoneView(ctx.cfg, mine, z), current, run, ctx);
    if (next !== current) elevators = replaceAt(elevators, z, next);
  }
  if (
    elevators === mine.elevators &&
    run.shafts === mine.shafts &&
    run.stations === mine.stations &&
    run.surfaceStock === mine.surfaceStock
  ) {
    return mine;
  }
  return {
    ...mine,
    elevators,
    shafts: run.shafts,
    stations: run.stations,
    surfaceStock: run.surfaceStock,
  };
}
