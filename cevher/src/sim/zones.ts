/**
 * Elevator zones (relay elevators). The mine is split into zones of `elevator.zoneSize` shafts;
 * each zone has its own elevator. Between two zones sits a transfer station: the deeper elevator
 * unloads into it and the elevator above collects from it as the bottom stop of its route.
 *
 * Stops of the elevator of zone z: 0 = its dock (the surface for zone 0, otherwise the station
 * above the zone), 1…count = the open shafts of the zone, count + 1 = the station below the zone
 * (only while a deeper zone is open).
 */
import { type Decimal, dmin, ZERO } from '../core/BigNum';
import type { MineState } from '../state/GameState';
import type { GameConfig } from './GameConfig';

export interface ZoneView {
  zone: number;
  /** 0-based index of the first shaft in the zone. */
  first: number;
  /** Open shafts in the zone. */
  count: number;
  /** A deeper zone is open, so this elevator also collects from the station below its zone. */
  hasStationBelow: boolean;
  /** Deepest stop of the route (the station below, or the zone's deepest open shaft). */
  deepestStop: number;
}

export function zoneSize(cfg: GameConfig): number {
  return cfg.econ.elevator.zoneSize;
}

/** Zone (= elevator index) of the 0-based shaft `index`. */
export function zoneOfShaft(cfg: GameConfig, index: number): number {
  return Math.floor(index / zoneSize(cfg));
}

/** Number of elevators a mine with `openShafts` open shafts has. */
export function zoneCount(cfg: GameConfig, openShafts: number): number {
  return Math.max(1, Math.ceil(openShafts / zoneSize(cfg)));
}

/** True when opening the 0-based shaft `index` also builds a new elevator (first shaft of a zone). */
export function startsZone(cfg: GameConfig, index: number): boolean {
  return index > 0 && index % zoneSize(cfg) === 0;
}

export function zoneView(cfg: GameConfig, mine: MineState, zone: number): ZoneView {
  const size = zoneSize(cfg);
  const first = zone * size;
  const count = Math.max(0, Math.min(size, mine.shafts.length - first));
  const hasStationBelow = zone < mine.elevators.length - 1;
  return { zone, first, count, hasStationBelow, deepestStop: count + (hasStationBelow ? 1 : 0) };
}

export interface RelayThroughput {
  /** Flow the elevators deliver to the surface, ₵/s. */
  delivered: Decimal;
  /** Shallowest elevator that limits the delivery (null when every elevator keeps up). */
  binding: number | null;
}

/**
 * Throughput of the relay: elevator z carries its zone's production plus whatever the elevator
 * below delivers into the station, up to its own flow: D_z = min(E_z, P_z + D_{z+1}).
 * The binding elevator is the shallowest one running at its limit — upgrading any deeper elevator
 * would not raise the delivery.
 */
export function relayThroughput(
  production: readonly Decimal[],
  flows: readonly Decimal[],
): RelayThroughput {
  const n = flows.length;
  const delivered: Decimal[] = new Array<Decimal>(n + 1).fill(ZERO);
  for (let z = n - 1; z >= 0; z--) {
    const inflow = (production[z] ?? ZERO).add(delivered[z + 1] ?? ZERO);
    delivered[z] = dmin(flows[z] ?? ZERO, inflow);
  }
  let binding: number | null = null;
  for (let z = 0; z < n; z++) {
    const inflow = (production[z] ?? ZERO).add(delivered[z + 1] ?? ZERO);
    if ((flows[z] ?? ZERO).lt(inflow)) {
      binding = z;
      break;
    }
  }
  return { delivered: delivered[0] ?? ZERO, binding };
}
