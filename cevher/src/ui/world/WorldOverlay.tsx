/**
 * DOM layer that scrolls together with the Pixi world. Its vertical offset is written directly by
 * the render loop every frame (same frame as the canvas), not by Preact.
 */
import type { Ref } from 'preact';
import type { WorldLayout } from '../../render/layout';
import type { GameState } from '../../state/GameState';
import { useRuntime } from '../runtime';
import { BottomRow } from './BottomRow';
import { px } from './px';
import { ShaftRow } from './ShaftRow';
import { SurfaceWidgets } from './SurfaceWidgets';

export function WorldOverlay({
  state,
  layout,
  overlayRef,
  fxRef,
}: {
  state: GameState;
  layout: WorldLayout;
  overlayRef: Ref<HTMLDivElement>;
  fxRef: Ref<HTMLDivElement>;
}) {
  const runtime = useRuntime();
  const mine = state.mines[state.activeMineId];
  if (!mine) return null;

  // Keep keyboard focus visible: scroll to widgets that receive focus via Tab.
  const onFocusIn = (e: FocusEvent): void => {
    const target = e.target as HTMLElement | null;
    const row = target?.closest<HTMLElement>('.row, .surface-widgets, .bottom-row');
    if (!target || !row || target.matches(':focus-visible') === false) return;
    const top = row.offsetTop + target.offsetTop;
    runtime.camera.ensureVisible(top, target.offsetHeight || 44);
  };

  return (
    <div
      class="world-overlay"
      ref={overlayRef}
      style={{ height: px(layout, layout.worldHeight) }}
      onFocusIn={onFocusIn}
    >
      <SurfaceWidgets state={state} layout={layout} />
      {mine.shafts.map((shaft, index) => (
        <ShaftRow key={index} state={state} layout={layout} index={index} shaft={shaft} />
      ))}
      <BottomRow state={state} layout={layout} />
      <div class="fx-layer" ref={fxRef} />
    </div>
  );
}
