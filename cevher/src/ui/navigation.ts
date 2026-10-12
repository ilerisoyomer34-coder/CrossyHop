/** Camera + selection helpers shared by the chain, rows and panels. */
import { rowTop, scrollToCenter, type WorldLayout } from '../render/layout';
import type { UnitRef } from '../state/GameState';
import { bestShaftUpgrade, type ChainLink } from '../state/selectors';
import type { Runtime } from './runtime';
import { layoutSignal, reducedMotion, selectedUnit } from './store';

export function unitCenterY(layout: WorldLayout, unit: UnitRef): number {
  if (unit.kind === 'shaft') return rowTop(layout, unit.index) + layout.rowHeight / 2;
  return layout.surfaceHeight / 2;
}

/** Scrolls the camera to a unit and opens its upgrade panel. */
export function focusUnit(runtime: Runtime, unit: UnitRef, openPanel = true): void {
  const layout = layoutSignal.peek();
  if (layout) {
    runtime.camera.scrollTo(
      scrollToCenter(layout, unitCenterY(layout, unit)),
      !reducedMotion.peek(),
    );
  }
  if (openPanel) selectedUnit.value = unit;
}

export function unitForLink(runtime: Runtime, link: ChainLink): UnitRef {
  const state = runtime.game.state;
  switch (link) {
    case 'shafts':
      return {
        kind: 'shaft',
        index: bestShaftUpgrade(state, state.activeMineId, runtime.game.cfg),
      };
    case 'elevator':
      return { kind: 'elevator' };
    case 'logistics':
      return { kind: 'logistics' };
  }
}
