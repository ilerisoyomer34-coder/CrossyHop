/** Rock barrier (kaya engeli) timers (GDD 4.5). */
import type { MineState } from '../state/GameState';
import type { SimContext } from './SimContext';

export function updateBarrier(mine: MineState, ctx: SimContext): MineState {
  const barrier = mine.barrier;
  if (!barrier || barrier.endsAt > ctx.t1) return mine;
  ctx.events.push({ type: 'barrierCleared', mineId: mine.id, afterShaft: barrier.afterShaft });
  return {
    ...mine,
    barrier: null,
    clearedBarriers: [...mine.clearedBarriers, barrier.afterShaft],
  };
}
