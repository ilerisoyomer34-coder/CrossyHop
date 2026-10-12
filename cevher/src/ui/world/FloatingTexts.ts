/**
 * Pooled floating numbers ("+12,3K", "×2!") in world space (GDD 10.4). At most `maxActive` are
 * alive at once; DOM nodes are reused and animated with the Web Animations API.
 */
import { feelConfig } from '../../data/config';

export type FloatTone = 'cash' | 'milestone' | 'info';

interface Slot {
  el: HTMLSpanElement;
  busyUntil: number;
}

export class FloatingTexts {
  private readonly slots: Slot[] = [];
  private cursor = 0;

  constructor(
    host: HTMLElement,
    private readonly getScale: () => number,
    private readonly reducedMotion: () => boolean,
  ) {
    const cfg = feelConfig.floatingText;
    for (let i = 0; i < cfg.maxActive; i++) {
      const el = document.createElement('span');
      el.className = 'float-text';
      el.setAttribute('aria-hidden', 'true');
      el.style.opacity = '0';
      host.appendChild(el);
      this.slots.push({ el, busyUntil: 0 });
    }
  }

  /** Spawns text at a logical world position. Returns false when the pool is exhausted. */
  spawn(text: string, x: number, y: number, tone: FloatTone = 'cash'): boolean {
    const cfg = feelConfig.floatingText;
    const now = performance.now();
    let slot: Slot | undefined;
    for (let k = 0; k < this.slots.length; k++) {
      const candidate = this.slots[(this.cursor + k) % this.slots.length];
      if (candidate && candidate.busyUntil <= now) {
        slot = candidate;
        this.cursor = (this.cursor + k + 1) % this.slots.length;
        break;
      }
    }
    if (!slot) return false;
    const scale = this.getScale();
    const el = slot.el;
    el.textContent = text;
    el.className = `float-text float-text--${tone}`;
    el.style.left = `${x * scale}px`;
    el.style.top = `${y * scale}px`;
    slot.busyUntil = now + cfg.durationMs;
    const rise = this.reducedMotion() ? 0 : cfg.risePx;
    el.getAnimations().forEach((a) => a.cancel());
    el.animate(
      [
        { opacity: 0, transform: 'translate(-50%, 0) scale(0.85)' },
        { opacity: 1, transform: 'translate(-50%, -12px) scale(1.06)', offset: 0.18 },
        { opacity: 1, transform: `translate(-50%, ${-rise * 0.7}px) scale(1)`, offset: 0.7 },
        { opacity: 0, transform: `translate(-50%, ${-rise}px) scale(0.96)` },
      ],
      { duration: cfg.durationMs, easing: 'ease-out', fill: 'forwards' },
    );
    return true;
  }
}
