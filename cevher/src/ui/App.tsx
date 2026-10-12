/** Root component: HUD, mine view (canvas + world overlay), upgrade panel, modals, debug. */
import type { RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { DebugPanel, DebugToggle } from '../debug/DebugPanel';
import { t } from '../i18n/t';
import { chainFlows } from '../state/selectors';
import { BuyModeChip } from './components/BuyModeToggle';
import { Toasts } from './components/Toasts';
import { BottleneckChain } from './hud/BottleneckChain';
import { TopBar } from './hud/TopBar';
import { SettingsModal } from './modals/SettingsModal';
import { unitForLink } from './navigation';
import { UpgradePanel } from './panels/UpgradePanel';
import { useRuntime } from './runtime';
import { debugOpen, isWide, layoutSignal, selectedUnit, stateSignal } from './store';
import { WorldOverlay } from './world/WorldOverlay';

export interface AppRefs {
  overlay: RefObject<HTMLDivElement>;
  fx: RefObject<HTMLDivElement>;
}

export function App({
  refs,
  onMineView,
}: {
  refs: AppRefs;
  onMineView: (mineView: HTMLElement, canvasHost: HTMLElement) => void;
}) {
  const runtime = useRuntime();
  const mineViewRef = useRef<HTMLElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const state = stateSignal.value;
  const layout = layoutSignal.value;
  const wide = isWide.value;
  const selected = selectedUnit.value;

  useEffect(() => {
    if (mineViewRef.current && canvasHostRef.current)
      onMineView(mineViewRef.current, canvasHostRef.current);
    // Mount once; the callback wires the canvas, camera and resize observer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected || wide) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') selectedUnit.value = null;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, wide]);

  if (!state) return null;
  const sideUnit =
    selected ??
    unitForLink(runtime, chainFlows(state, state.activeMineId, runtime.game.cfg).bottleneck);

  return (
    <div class={`app ${wide ? 'app--wide' : ''}`}>
      <a class="skip-link" href="#production-chain">
        {t('a11y.skipToChain')}
      </a>
      <header class="hud">
        <TopBar state={state} />
        <BottleneckChain state={state} />
      </header>

      <main
        class="mine-view"
        ref={mineViewRef}
        tabIndex={0}
        aria-label={t('a11y.mineView')}
        data-testid="mine-view"
      >
        <div class="canvas-host" ref={canvasHostRef} />
        {layout && (
          <WorldOverlay state={state} layout={layout} overlayRef={refs.overlay} fxRef={refs.fx} />
        )}
        {!layout && <div class="loading">{t('app.loading')}</div>}
        <div class="mine-view__corner mine-view__corner--right">
          <BuyModeChip />
        </div>
        {runtime.debugEnabled && (
          <div class="mine-view__corner mine-view__corner--left">
            <DebugToggle />
          </div>
        )}
        <Toasts />
      </main>

      {wide ? (
        <aside class="side-panel">
          <UpgradePanel state={state} unit={sideUnit} />
        </aside>
      ) : (
        selected && (
          <div
            class="sheet-backdrop"
            onClick={(e) => e.target === e.currentTarget && (selectedUnit.value = null)}
          >
            <div class="sheet" role="dialog" aria-modal="true">
              <div class="sheet__grip" aria-hidden="true" />
              <UpgradePanel
                state={state}
                unit={selected}
                onClose={() => (selectedUnit.value = null)}
              />
            </div>
          </div>
        )
      )}

      <SettingsModal state={state} />
      {runtime.debugEnabled && debugOpen.value && <DebugPanel state={state} />}
    </div>
  );
}
