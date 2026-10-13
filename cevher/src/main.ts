/**
 * Entry point: wires the game, the fixed-step loop, the Pixi scene, the scroll camera and the
 * Preact UI together. Simulation, rendering and UI only meet here.
 */
import { createRef, h, render } from 'preact';
import './ui/styles.css';
import { systemClock } from './core/Clock';
import { Game } from './core/Game';
import { GameLoop } from './core/GameLoop';
import { engineConfig, feelConfig } from './data/config';
import { instrumentDrawCalls } from './debug/drawCallCounter';
import { formatNumber } from './i18n/formatNumber';
import { setLocale, t } from './i18n/t';
import { vibrate } from './platform/haptics';
import { createBrowserStore } from './platform/storage';
import { ScrollCamera } from './render/camera/ScrollCamera';
import { computeLayout, maxScroll, rowTop } from './render/layout';
import { MineScene } from './render/MineScene';
import { createInitialState } from './state/factory';
import type { GameState } from './state/GameState';
import { AutoSave } from './state/save/AutoSave';
import { SaveManager } from './state/save/SaveManager';
import { defaultConfig } from './sim/GameConfig';
import { applyOffline, calculateOffline, type OfflineReport } from './sim/OfflineCalculator';
import { App, type AppRefs } from './ui/App';
import { showLoadNotice, showOfflineNotice } from './ui/notices';
import { RuntimeContext, type FrameHook, type Runtime, type SaveControls } from './ui/runtime';
import { FloatingTexts } from './ui/world/FloatingTexts';
import {
  bindGame,
  isWide,
  layoutSignal,
  perfSignal,
  reducedMotion,
  showToast,
  stateSignal,
} from './ui/store';
import { D, type Decimal } from './core/BigNum';
import * as actions from './state/actions';
import * as selectors from './state/selectors';

/** Debug-only handle on `window.__cevher` (console experiments and e2e tests). */
export interface DebugApi {
  game: Game;
  loop: GameLoop;
  camera: ScrollCamera;
  actions: typeof actions;
  selectors: typeof selectors;
  D: typeof D;
}

function applyFeelCssVars(): void {
  const root = document.documentElement.style;
  root.setProperty('--press-scale', String(feelConfig.button.pressScale));
  root.setProperty('--press-ms', `${feelConfig.button.pressMs}ms`);
}

function watchMedia(query: string, apply: (matches: boolean) => void): void {
  const mq = window.matchMedia(query);
  apply(mq.matches);
  mq.addEventListener('change', (e) => apply(e.matches));
}

function boot(): void {
  const params = new URLSearchParams(window.location.search);
  // `#debug` works where query strings are not forwarded (sandboxed previews / artifact hosts).
  const debugEnabled =
    import.meta.env.DEV || params.get('debug') === '1' || window.location.hash === '#debug';
  const cfg = defaultConfig;
  const loopCfg = engineConfig.loop;

  applyFeelCssVars();
  watchMedia('(prefers-reduced-motion: reduce)', (m) => (reducedMotion.value = m));
  watchMedia('(min-width: 900px)', (m) => (isWide.value = m));

  // Continue the saved game (crediting the time away) or start a new one.
  const saveCfg = engineConfig.save;
  const saves = new SaveManager(createBrowserStore(), cfg, saveCfg);
  const loaded = saves.load();
  for (const err of loaded.errors) console.warn('[CEVHER]', err.message);
  let initial: GameState;
  let awayReport: OfflineReport | null = null;
  if (loaded.state) {
    awayReport = calculateOffline(loaded.state, loaded.state.lastSavedAt, systemClock.now(), cfg);
    initial = applyOffline(loaded.state, awayReport);
  } else {
    initial = createInitialState(cfg, systemClock.now());
  }
  if (debugEnabled && params.get('auto') === '1')
    initial = actions.debugSetAutoRun(initial, true).state;
  const game = new Game(cfg, initial);
  if (debugEnabled && params.get('bot') === '1') game.botEnabled = true;
  setLocale(game.state.settings.locale);

  let saveFailureShown = false;
  const autosave = new AutoSave(
    () => {
      if (saves.save(game.state, systemClock.now()) || saveFailureShown) return;
      saveFailureShown = true;
      showToast(t('save.failed'), 'info', 6000);
    },
    { intervalMs: saveCfg.autosaveMs, debounceMs: saveCfg.debounceMs },
  );
  game.subscribe((reason) => {
    if (reason === 'action') autosave.schedule();
    else if (reason === 'reset') autosave.flush();
  });

  /** Credits wall-clock time away (closed page, long-hidden tab) and tells the player. */
  const creditAway = (fromWallMs: number, alwaysNotify = false): void => {
    const report = calculateOffline(game.state, fromWallMs, systemClock.now(), cfg);
    game.dispatch((s) => ({ ok: true, state: applyOffline(s, report), events: [] }));
    showOfflineNotice(report, game.state.settings, alwaysNotify);
  };

  const saveControls: SaveControls = {
    persistent: saves.persistent,
    exportText: () => saves.exportText(game.state, systemClock.now()),
    importText: (text) => {
      let state: GameState;
      try {
        state = saves.importText(text);
      } catch (err) {
        console.warn('[CEVHER] import failed:', err instanceof Error ? err.message : String(err));
        return false;
      }
      const report = calculateOffline(state, state.lastSavedAt, systemClock.now(), cfg);
      game.replaceState(applyOffline(state, report));
      showToast(t('save.imported'), 'success');
      showOfflineNotice(report, game.state.settings);
      return true;
    },
    newGame: () => {
      saves.clear();
      game.replaceState(createInitialState(cfg, systemClock.now()));
      showToast(t('save.newGameDone'), 'success');
    },
    simulateAway: (hours) => creditAway(systemClock.now() - hours * 3_600_000, true),
  };

  const camera = new ScrollCamera(feelConfig.scroll);
  const frameHooks = new Set<FrameHook>();
  const refs: AppRefs = { overlay: createRef<HTMLDivElement>(), fx: createRef<HTMLDivElement>() };
  let scene: MineScene | null = null;
  let readDrawCalls: (() => number) | null = null;
  let lastDrawCalls = 0;
  let floating: FloatingTexts | null = null;
  let perfAccum = 0;
  let renderJsMs = 0;

  const loop = new GameLoop({
    stepMs: loopCfg.stepMs,
    maxStepsPerFrame: loopCfg.maxStepsPerFrame,
    maxCatchUpMs: loopCfg.maxCatchUpMs,
    frameBudgetMs: loopCfg.frameBudgetMs,
    update: (dt) => game.step(dt),
    render: (alpha, dt) => frame(alpha, dt),
  });
  const speed = Number(params.get('speed'));
  if (debugEnabled && engineConfig.debug.timeScales.includes(speed)) loop.setTimeScale(speed);

  const runtime: Runtime = {
    game,
    camera,
    loop,
    debugEnabled,
    version: __APP_VERSION__,
    frameHooks,
    drawCalls: () => lastDrawCalls,
    save: saveControls,
  };
  bindGame(game, feelConfig.uiUpdateHz);
  game.subscribe((reason) => {
    if (reason === 'reset' || reason === 'action') setLocale(game.state.settings.locale);
  });

  function frame(alpha: number, dt: number): void {
    const now = performance.now();
    const jsStart = now;
    camera.update(now, dt);
    const state = game.state;
    const mine = state.mines[state.activeMineId];
    let layout = layoutSignal.peek();
    if (layout && mine && layout.shaftCount !== mine.shafts.length) {
      layout = computeLayout(layout.viewWidth, layout.viewHeight, mine.shafts.length);
      layoutSignal.value = layout;
    }
    if (!layout) return;
    camera.setBounds(maxScroll(layout), layout.viewHeight);
    const overlay = refs.overlay.current;
    if (overlay) overlay.style.transform = `translate3d(0, ${-camera.y}px, 0)`;
    if (!floating && refs.fx.current) {
      floating = new FloatingTexts(
        refs.fx.current,
        () => layoutSignal.peek()?.scale ?? 1,
        () => reducedMotion.peek(),
      );
    }
    if (scene) {
      const renderTime = loop.paused
        ? state.time
        : state.time - loopCfg.stepMs + alpha * loopCfg.stepMs;
      scene.render(state, layout, renderTime, camera.y, reducedMotion.peek());
      if (readDrawCalls) lastDrawCalls = readDrawCalls();
    }
    for (const hook of frameHooks) hook(now, dt);
    renderJsMs += (performance.now() - jsStart - renderJsMs) * 0.1;
    perfAccum += dt;
    if (perfAccum >= 500) {
      perfAccum = 0;
      perfSignal.value = {
        fps: loop.stats.fps,
        frameMs: loop.stats.frameMs,
        drawCalls: lastDrawCalls,
        steps: loop.stats.steps,
        updateMs: loop.stats.updateMs,
        renderMs: renderJsMs,
      };
    }
  }

  async function onMineView(mineView: HTMLElement, canvasHost: HTMLElement): Promise<void> {
    camera.attach(mineView);
    const resize = (): void => {
      const width = mineView.clientWidth;
      const height = mineView.clientHeight;
      const shafts = game.state.mines[game.state.activeMineId]?.shafts.length ?? 1;
      layoutSignal.value = computeLayout(width, height, shafts);
      scene?.resize(width, height);
    };
    resize();
    new ResizeObserver(resize).observe(mineView);
    try {
      scene = await MineScene.create({
        host: canvasHost,
        cfg,
        mineId: game.state.activeMineId,
        maxResolution: engineConfig.render.maxResolution,
        cullMarginPx: engineConfig.render.cullMarginPx,
        antialias:
          debugEnabled && params.has('aa')
            ? params.get('aa') === '1'
            : (window.devicePixelRatio || 1) < engineConfig.render.antialiasBelowDpr,
      });
      resize();
      if (debugEnabled) {
        const renderer = scene.app.renderer as unknown as { gl?: WebGLRenderingContext };
        if (renderer.gl) readDrawCalls = instrumentDrawCalls(renderer.gl);
      }
    } catch (err) {
      console.error('[CEVHER] renderer init failed', err);
      showToast(t('app.renderError'), 'info', 10_000);
    }
  }

  wireFeedback(game, () => floating);

  render(
    h(
      RuntimeContext.Provider,
      { value: runtime },
      h(App, { refs, onMineView: (a, b) => void onMineView(a, b) }),
    ),
    document.getElementById('app') as HTMLElement,
  );

  // Pause while hidden and save. Short hides are caught up by the loop; long ones are credited
  // analytically by the OfflineCalculator (GDD 13.3), like a closed page.
  let hiddenAt = 0;
  let hiddenAtWall = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = performance.now();
      hiddenAtWall = systemClock.now();
      loop.stop();
      autosave.flush();
    } else {
      const gap = performance.now() - hiddenAt;
      if (gap > loopCfg.longHideMs) creditAway(hiddenAtWall);
      loop.start(gap <= loopCfg.longHideMs ? gap : 0);
    }
  });
  window.addEventListener('pagehide', () => autosave.flush());
  autosave.start();
  loop.start();

  const offlineShown = awayReport ? showOfflineNotice(awayReport, game.state.settings) : false;
  showLoadNotice(loaded, offlineShown);
  if (!saves.persistent) showToast(t('save.unavailable'), 'info', 6000);

  if (debugEnabled) {
    // Handy for e2e tests and the console.
    const api: DebugApi = { game, loop, camera, actions, selectors, D };
    (window as unknown as { __cevher: DebugApi }).__cevher = api;
  }
}

/** Turns domain events into floating numbers, toasts and haptics (GDD 10.4 feedback). */
function wireFeedback(game: Game, getFloating: () => FloatingTexts | null): void {
  let pendingSale: Decimal | null = null;
  let flushTimer: number | null = null;
  const fmtNum = (v: Decimal): string =>
    formatNumber(v, { locale: game.state.settings.locale, notation: game.state.settings.notation });

  game.bus.on('saleCompleted', (e) => {
    pendingSale = pendingSale ? pendingSale.add(e.amount) : e.amount;
    if (flushTimer !== null) return;
    flushTimer = window.setTimeout(() => {
      flushTimer = null;
      const layout = layoutSignal.peek();
      const amount = pendingSale;
      pendingSale = null;
      if (!layout || !amount) return;
      getFloating()?.spawn(
        `+${fmtNum(amount)}`,
        layout.warehouseX + layout.warehouseWidth / 2,
        layout.groundY - 92,
        'cash',
      );
    }, 250);
  });

  game.bus.on('milestoneReached', (e) => {
    const layout = layoutSignal.peek();
    if (!layout) return;
    const x =
      e.unit.kind === 'logistics'
        ? layout.width * 0.75
        : e.unit.kind === 'elevator'
          ? layout.width * 0.25
          : layout.width - 70;
    const y = e.unit.kind === 'shaft' ? rowTop(layout, e.unit.index) + 24 : 70;
    getFloating()?.spawn(t('fx.milestone', { mult: e.multiplier }), x, y, 'milestone');
    vibrate(25);
  });

  game.bus.on('shaftUnlocked', (e) =>
    showToast(t('fx.shaftUnlocked', { n: e.index + 1 }), 'success'),
  );
  game.bus.on('barrierCleared', () => showToast(t('fx.barrierCleared'), 'success'));
  game.bus.on('depotEmpty', () => {
    const layout = layoutSignal.peek();
    if (!layout) return;
    getFloating()?.spawn(
      t('fx.depotEmpty'),
      layout.depotX + layout.depotWidth / 2,
      layout.groundY - 70,
      'info',
    );
  });

  // Keep the signal in sync after a reset so the UI never shows a stale state.
  game.subscribe((reason) => {
    if (reason === 'reset') stateSignal.value = game.state;
  });
}

boot();
