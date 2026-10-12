/**
 * Developer panel (GDD 13.9): only rendered in dev builds or with `?debug=1`.
 * Time scale, resources, world shortcuts, automation toggles, perf counters and raw flow values.
 */
import { useState } from 'preact/hooks';
import { D } from '../core/BigNum';
import { engineConfig } from '../data/config';
import { formatDuration } from '../i18n/formatNumber';
import { t } from '../i18n/t';
import {
  debugAddCash,
  debugAddCurrencies,
  debugFinishBarrier,
  debugMultiplyCash,
  debugSetAutoRun,
  debugUnlockAllShafts,
} from '../state/actions';
import { createInitialState } from '../state/factory';
import { FLAG_DEBUG_AUTORUN, type GameState } from '../state/GameState';
import { chainFlows } from '../state/selectors';
import { Icon } from '../ui/components/Icon';
import { formatter } from '../ui/format';
import { useRuntime } from '../ui/runtime';
import { debugOpen, perfSignal } from '../ui/store';

function sci(value: { toExponential: (n: number) => string }): string {
  return value.toExponential(4);
}

export function DebugToggle() {
  return (
    <button
      type="button"
      class="debug-toggle"
      aria-label={t('debug.open')}
      aria-expanded={debugOpen.value}
      data-testid="debug-toggle"
      onClick={() => (debugOpen.value = !debugOpen.value)}
    >
      <Icon name="bug" size={20} />
    </button>
  );
}

export function DebugPanel({ state }: { state: GameState }) {
  const runtime = useRuntime();
  const { game, loop } = runtime;
  const cfg = game.cfg;
  const mineId = state.activeMineId;
  const mine = state.mines[mineId];
  const fmt = formatter(state.settings);
  const flows = chainFlows(state, mineId, cfg);
  const perf = perfSignal.value;
  const autoRun = state.flags[FLAG_DEBUG_AUTORUN] === true;
  const [confirmReset, setConfirmReset] = useState(false);
  if (!mine) return null;

  const setScale = (scale: number): void => {
    loop.setTimeScale(scale);
    perfSignal.value = { ...perfSignal.value };
  };

  return (
    <aside class="debug-panel" aria-label={t('debug.title')} data-testid="debug-panel">
      <header class="debug-panel__header">
        <strong>{t('debug.title')}</strong>
        <button
          type="button"
          class="icon-btn icon-btn--ghost"
          aria-label={t('debug.close')}
          onClick={() => (debugOpen.value = false)}
        >
          <Icon name="close" size={18} />
        </button>
      </header>

      <section>
        <h3>{t('debug.time')}</h3>
        <div class="debug-row">
          {engineConfig.debug.timeScales.map((scale) => (
            <button
              type="button"
              key={scale}
              class={`chip ${loop.timeScale === scale ? 'is-active' : ''}`}
              data-testid={`speed-${scale}`}
              onClick={() => setScale(scale)}
            >
              ×{scale}
            </button>
          ))}
          <button
            type="button"
            class="chip"
            onClick={() => {
              loop.setPaused(!loop.paused);
              perfSignal.value = { ...perfSignal.value };
            }}
          >
            {loop.paused ? t('debug.resume') : t('debug.pause')}
          </button>
        </div>
        <div class="debug-row">
          <span class="debug-label">{t('debug.fastForward')}</span>
          {engineConfig.debug.fastForwardMinutes.map((m) => (
            <button
              type="button"
              key={m}
              class="chip"
              onClick={() => game.fastForward(m * 60_000, engineConfig.debug.fastForwardStepMs)}
            >
              {t('debug.minutes', { n: m })}
            </button>
          ))}
        </div>
        <div class="debug-kv">
          <span>{t('debug.simTime')}</span>
          <span data-testid="debug-sim-time">{formatDuration(state.time / 1000)}</span>
        </div>
      </section>

      <section>
        <h3>{t('debug.resources')}</h3>
        <div class="debug-row">
          {['1e3', '1e6', '1e9', '1e12'].map((amount) => (
            <button
              type="button"
              key={amount}
              class="chip"
              onClick={() => game.dispatch((s) => debugAddCash(s, mineId, D(amount)))}
            >
              +{fmt.num(D(amount))}
            </button>
          ))}
          <button
            type="button"
            class="chip"
            onClick={() => game.dispatch((s) => debugMultiplyCash(s, mineId, 10))}
          >
            {t('debug.cashTimes10')}
          </button>
        </div>
        <div class="debug-row">
          <button
            type="button"
            class="chip"
            onClick={() => game.dispatch((s) => debugAddCurrencies(s, 100, 0))}
          >
            {t('debug.addCrystals')}
          </button>
          <button
            type="button"
            class="chip"
            onClick={() => game.dispatch((s) => debugAddCurrencies(s, 0, 10))}
          >
            {t('debug.addJp')}
          </button>
        </div>
      </section>

      <section>
        <h3>{t('debug.world')}</h3>
        <div class="debug-row">
          <button
            type="button"
            class="chip"
            onClick={() => game.dispatch((s) => debugUnlockAllShafts(s, mineId, cfg))}
          >
            {t('debug.unlockAll')}
          </button>
          <button
            type="button"
            class="chip"
            onClick={() => game.dispatch((s) => debugFinishBarrier(s, mineId, cfg))}
          >
            {t('debug.finishBarrier')}
          </button>
        </div>
        <label class="debug-check">
          <input
            type="checkbox"
            checked={autoRun}
            data-testid="debug-autorun"
            onChange={(e) => game.dispatch((s) => debugSetAutoRun(s, e.currentTarget.checked))}
          />
          {t('debug.autoRun')}
        </label>
        <label class="debug-check">
          <input
            type="checkbox"
            checked={game.botEnabled}
            data-testid="debug-bot"
            onChange={(e) => {
              game.botEnabled = e.currentTarget.checked;
              perfSignal.value = { ...perfSignal.value };
            }}
          />
          {t('debug.bot')}
        </label>
        <button
          type="button"
          class="chip chip--danger"
          onClick={() => {
            // Two-tap confirmation inside the page (native confirm() is unavailable in sandboxes).
            if (!confirmReset) {
              setConfirmReset(true);
              window.setTimeout(() => setConfirmReset(false), 3000);
              return;
            }
            setConfirmReset(false);
            game.replaceState(createInitialState(cfg, Date.now()));
            runtime.camera.scrollTo(0, false);
          }}
        >
          {confirmReset ? t('debug.resetConfirm') : t('debug.reset')}
        </button>
      </section>

      <section>
        <h3>{t('debug.perf')}</h3>
        <div class="debug-kv">
          <span>{t('debug.fps')}</span>
          <span data-testid="debug-fps">{perf.fps.toFixed(0)}</span>
        </div>
        <div class="debug-kv">
          <span>{t('debug.frameMs')}</span>
          <span>{perf.frameMs.toFixed(1)} ms</span>
        </div>
        <div class="debug-kv">
          <span>{t('debug.drawCalls')}</span>
          <span data-testid="debug-draw-calls">{perf.drawCalls}</span>
        </div>
        <div class="debug-kv">
          <span>{t('debug.steps')}</span>
          <span>{perf.steps}</span>
        </div>
        <div class="debug-kv">
          <span>{t('debug.updateMs')}</span>
          <span data-testid="debug-update-ms">{perf.updateMs.toFixed(2)} ms</span>
        </div>
        <div class="debug-kv">
          <span>{t('debug.renderMs')}</span>
          <span data-testid="debug-render-ms">{perf.renderMs.toFixed(2)} ms</span>
        </div>
      </section>

      <section>
        <h3>{t('debug.flows')}</h3>
        <div class="debug-kv">
          <span>{t('debug.flowShafts')}</span>
          <span>{sci(flows.shafts)}</span>
        </div>
        <div class="debug-kv">
          <span>{t('debug.flowElevatorNominal')}</span>
          <span>{sci(flows.elevatorNominal)}</span>
        </div>
        <div class="debug-kv">
          <span>{t('debug.flowElevatorReal')}</span>
          <span>{sci(flows.elevator)}</span>
        </div>
        <div class="debug-kv">
          <span>{t('debug.flowLogistics')}</span>
          <span>{sci(flows.logistics)}</span>
        </div>
        <div class="debug-kv">
          <span>{t('chain.bottleneck')}</span>
          <strong data-testid="debug-bottleneck">{flows.bottleneck}</strong>
        </div>
        <div class="debug-kv">
          <span>{t('debug.measured')}</span>
          <span data-testid="debug-measured">{sci(game.measuredIncome())}</span>
        </div>
      </section>

      <section>
        <h3>{t('debug.unlockTimes')}</h3>
        <ol class="debug-times" data-testid="debug-unlock-times">
          {mine.shaftUnlockedAt.map((at, i) => (
            <li key={i}>
              {t('shaft.name', { n: i + 1 })}: {formatDuration(at / 1000)}
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}
