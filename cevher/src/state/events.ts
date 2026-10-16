/**
 * Domain events emitted by actions and the simulation step. They are returned as data (keeping
 * those functions pure) and published on the EventBus by the Game orchestrator; rendering, audio
 * and UI react to them, the simulation never depends on them.
 */
import type { Decimal } from '../core/BigNum';
import type { UnitRef } from './GameState';

export interface GameEventMap {
  saleCompleted: { mineId: string; amount: Decimal; at: number };
  elevatorUnloaded: { mineId: string; amount: Decimal; at: number };
  levelsBought: { mineId: string; unit: UnitRef; from: number; to: number; cost: Decimal };
  milestoneReached: { mineId: string; unit: UnitRef; level: number; multiplier: number };
  shaftUnlocked: { mineId: string; index: number; cost: Decimal };
  /** A new zone elevator (and its transfer station) was built; `index` is the elevator index. */
  elevatorBuilt: { mineId: string; index: number };
  barrierStarted: { mineId: string; afterShaft: number; endsAt: number };
  barrierCleared: { mineId: string; afterShaft: number };
  unitStarted: { mineId: string; unit: UnitRef };
  depotEmpty: { mineId: string };
}

export type GameEventType = keyof GameEventMap;

export type GameEvent = {
  [K in GameEventType]: { type: K } & GameEventMap[K];
}[GameEventType];
