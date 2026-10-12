/**
 * Press-and-hold repeat for purchase buttons (GDD 10.2): a short press buys once; holding for
 * `initialDelayMs` starts repeating, accelerating from `startRatePerSec` to `maxRatePerSec` over
 * `rampMs`. Moving the pointer beyond the drag threshold cancels (the user is scrolling).
 * Keyboard activation (Enter/Space) triggers a single purchase.
 */
import { useEffect, useRef } from 'preact/hooks';
import { feelConfig } from '../../data/config';

export interface HoldHandlers {
  onPointerDown: (e: PointerEvent) => void;
  onClick: (e: MouseEvent) => void;
  onContextMenu: (e: Event) => void;
}

interface HoldState {
  active: boolean;
  repeated: boolean;
  startY: number;
  startX: number;
  pointerId: number;
  holdStart: number;
  timer: number;
  cleanup: (() => void) | null;
}

export function useHoldRepeat(trigger: () => boolean | void, enabled: boolean): HoldHandlers {
  const cfg = feelConfig.holdToBuy;
  const dragThreshold = feelConfig.scroll.dragThresholdPx;
  const state = useRef<HoldState>({
    active: false,
    repeated: false,
    startY: 0,
    startX: 0,
    pointerId: -1,
    holdStart: 0,
    timer: 0,
    cleanup: null,
  });
  const triggerRef = useRef(trigger);
  triggerRef.current = trigger;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const stop = (): void => {
    const s = state.current;
    s.active = false;
    window.clearTimeout(s.timer);
    s.cleanup?.();
    s.cleanup = null;
  };

  useEffect(() => stop, []);

  const scheduleRepeat = (): void => {
    const s = state.current;
    if (!s.active) return;
    const held = performance.now() - s.holdStart;
    const k = Math.min(1, held / cfg.rampMs);
    const rate = cfg.startRatePerSec + (cfg.maxRatePerSec - cfg.startRatePerSec) * k;
    s.timer = window.setTimeout(() => {
      if (!s.active || !enabledRef.current) return stop();
      const ok = triggerRef.current();
      if (ok === false) return stop();
      scheduleRepeat();
    }, 1000 / rate);
  };

  return {
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      stop();
      const s = state.current;
      s.active = true;
      s.repeated = false;
      s.startX = e.clientX;
      s.startY = e.clientY;
      s.pointerId = e.pointerId;
      const onMove = (ev: PointerEvent): void => {
        if (ev.pointerId !== s.pointerId) return;
        if (Math.hypot(ev.clientX - s.startX, ev.clientY - s.startY) > dragThreshold) stop();
      };
      const onUp = (ev: PointerEvent): void => {
        if (ev.pointerId !== s.pointerId) return;
        const wasRepeating = s.repeated;
        const wasActive = s.active;
        stop();
        // Short press: the click handler performs the single purchase (keeps a11y semantics).
        // After a hold or a cancelled (scrolling) press, swallow the click that may follow.
        if (wasRepeating || !wasActive) {
          s.repeated = true;
          window.setTimeout(() => (s.repeated = false), 80);
        }
      };
      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onUp, true);
      window.addEventListener('pointercancel', onUp, true);
      s.cleanup = () => {
        window.removeEventListener('pointermove', onMove, true);
        window.removeEventListener('pointerup', onUp, true);
        window.removeEventListener('pointercancel', onUp, true);
      };
      s.timer = window.setTimeout(() => {
        if (!s.active || !enabledRef.current) return;
        s.repeated = true;
        s.holdStart = performance.now();
        const ok = triggerRef.current();
        if (ok === false) return stop();
        scheduleRepeat();
      }, cfg.initialDelayMs);
    },
    onClick: (e: MouseEvent) => {
      const s = state.current;
      const fromKeyboard = e.detail === 0;
      if (s.repeated && !fromKeyboard) {
        // The hold already bought (or the press became a scroll); swallow this click.
        s.repeated = false;
        e.preventDefault();
        return;
      }
      s.repeated = false;
      if (enabledRef.current) triggerRef.current();
    },
    onContextMenu: (e: Event) => e.preventDefault(),
  };
}
