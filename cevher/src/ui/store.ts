/**
 * Bridge between the game and the Preact UI. Simulation-driven updates reach the UI at most
 * `uiUpdateHz` times per second (GDD 13.3); player actions are reflected immediately.
 */
import { signal } from '@preact/signals';
import type { Game } from '../core/Game';
import type { GameState, UnitRef } from '../state/GameState';
import type { BuyMode } from '../state/selectors';
import type { WorldLayout } from '../render/layout';

export const stateSignal = signal<GameState | null>(null);
export const layoutSignal = signal<WorldLayout | null>(null);
export const selectedUnit = signal<UnitRef | null>(null);
export const buyMode = signal<BuyMode>('x1');
export const settingsOpen = signal(false);
export const debugOpen = signal(false);
export const isWide = signal(false);
export const reducedMotion = signal(false);

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'success';
}
export const toasts = signal<Toast[]>([]);

let toastId = 0;
export function showToast(text: string, tone: Toast['tone'] = 'info', durationMs = 2600): void {
  const id = ++toastId;
  toasts.value = [...toasts.value.slice(-2), { id, text, tone }];
  window.setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, durationMs);
}

export interface PerfStats {
  fps: number;
  frameMs: number;
  drawCalls: number;
  steps: number;
  /** Real ms spent in simulation steps during the last frame. */
  updateMs: number;
  /** Smoothed real ms of JS work to build/submit the frame (scene + overlay + hooks). */
  renderMs: number;
}
export const perfSignal = signal<PerfStats>({
  fps: 0,
  frameMs: 0,
  drawCalls: 0,
  steps: 0,
  updateMs: 0,
  renderMs: 0,
});

/** Subscribes the UI signals to the game; returns an unsubscribe function. */
export function bindGame(game: Game, uiUpdateHz: number): () => void {
  const minInterval = 1000 / uiUpdateHz;
  let last = 0;
  let timer: number | null = null;
  stateSignal.value = game.state;

  const flush = (): void => {
    timer = null;
    last = performance.now();
    stateSignal.value = game.state;
  };

  return game.subscribe((reason) => {
    if (reason !== 'step') {
      if (timer !== null) window.clearTimeout(timer);
      flush();
      return;
    }
    const elapsed = performance.now() - last;
    if (elapsed >= minInterval) {
      if (timer !== null) window.clearTimeout(timer);
      flush();
    } else if (timer === null) {
      timer = window.setTimeout(flush, minInterval - elapsed);
    }
  });
}

export function sameUnit(a: UnitRef | null, b: UnitRef | null): boolean {
  if (!a || !b || a.kind !== b.kind) return false;
  return a.kind !== 'shaft' || (b.kind === 'shaft' && a.index === b.index);
}
