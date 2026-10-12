/**
 * Vertical scroll camera for the mine view (GDD 10.1): drag with inertia and rubber-band edges,
 * mouse wheel, keyboard, and animated "go to" scrolling. The canvas and the DOM overlay both read
 * `y` in the same animation frame, so art and buttons never drift apart (native scrolling would
 * update the DOM on the compositor thread one frame ahead of the canvas).
 */
import type { FeelConfig } from '../../data/config';

type ScrollFeel = FeelConfig['scroll'];

interface Sample {
  t: number;
  y: number;
}

export class ScrollCamera {
  /** Scroll offset in CSS pixels (may be briefly outside [0, max] while rubber-banding). */
  y = 0;
  private max = 0;
  private viewHeight = 1;
  private velocity = 0;
  private dragging = false;
  private pointerId: number | null = null;
  private startPointerY = 0;
  private startScroll = 0;
  private samples: Sample[] = [];
  private anim: { from: number; to: number; start: number; duration: number } | null = null;
  private suppressClick = false;
  private element: HTMLElement | null = null;
  private readonly cleanup: (() => void)[] = [];
  private nowMs = 0;

  constructor(private readonly feel: ScrollFeel) {}

  get isDragging(): boolean {
    return this.dragging;
  }

  setBounds(maxScroll: number, viewHeight: number): void {
    this.max = Math.max(0, maxScroll);
    this.viewHeight = Math.max(1, viewHeight);
    if (!this.dragging && this.anim === null && this.y > this.max) this.y = this.max;
  }

  get maxScroll(): number {
    return this.max;
  }

  /** Scrolls to `target` (clamped); animated unless reduced motion is requested. */
  scrollTo(target: number, animated = true): void {
    const to = Math.min(this.max, Math.max(0, target));
    this.velocity = 0;
    if (!animated) {
      this.anim = null;
      this.y = to;
      return;
    }
    this.anim = { from: this.y, to, start: this.nowMs, duration: this.feel.animateMs };
  }

  /** Makes sure the band [top, top + height] (CSS px in world space) is visible. */
  ensureVisible(top: number, height: number, margin = 24): void {
    if (top - margin < this.y) this.scrollTo(top - margin);
    else if (top + height + margin > this.y + this.viewHeight) {
      this.scrollTo(top + height + margin - this.viewHeight);
    }
  }

  attach(element: HTMLElement): void {
    this.element = element;
    const on = <K extends keyof HTMLElementEventMap>(
      type: K,
      handler: (e: HTMLElementEventMap[K]) => void,
      options?: AddEventListenerOptions,
    ): void => {
      element.addEventListener(type, handler, options);
      this.cleanup.push(() => element.removeEventListener(type, handler, options));
    };
    on('pointerdown', (e) => this.onPointerDown(e));
    on('pointermove', (e) => this.onPointerMove(e));
    on('pointerup', (e) => this.onPointerUp(e));
    on('pointercancel', (e) => this.onPointerUp(e));
    on('wheel', (e) => this.onWheel(e), { passive: false });
    on('keydown', (e) => this.onKey(e));
    on(
      'click',
      (e) => {
        if (this.suppressClick) {
          e.stopPropagation();
          e.preventDefault();
          this.suppressClick = false;
        }
      },
      { capture: true },
    );
  }

  detach(): void {
    for (const fn of this.cleanup.splice(0)) fn();
    this.element = null;
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (this.pointerId !== null) return;
    this.pointerId = e.pointerId;
    this.startPointerY = e.clientY;
    this.startScroll = this.y;
    this.velocity = 0;
    this.anim = null;
    this.samples = [{ t: e.timeStamp, y: e.clientY }];
    this.suppressClick = false;
  }

  private onPointerMove(e: PointerEvent): void {
    if (e.pointerId !== this.pointerId) return;
    const dy = e.clientY - this.startPointerY;
    if (!this.dragging && Math.abs(dy) > this.feel.dragThresholdPx) {
      this.dragging = true;
      this.startPointerY = e.clientY;
      this.startScroll = this.y;
      this.element?.setPointerCapture(e.pointerId);
      this.element?.classList.add('is-dragging');
    }
    if (!this.dragging) return;
    const raw = this.startScroll - (e.clientY - this.startPointerY);
    this.y = this.rubberBand(raw);
    this.samples.push({ t: e.timeStamp, y: e.clientY });
    if (this.samples.length > 8) this.samples.shift();
  }

  private onPointerUp(e: PointerEvent): void {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    if (!this.dragging) return;
    this.dragging = false;
    this.suppressClick = true;
    this.element?.classList.remove('is-dragging');
    if (this.element?.hasPointerCapture(e.pointerId))
      this.element.releasePointerCapture(e.pointerId);
    // Release velocity from the last ~100 ms of movement.
    const last = this.samples[this.samples.length - 1];
    const first =
      this.samples.find((s) => last !== undefined && last.t - s.t <= 100) ?? this.samples[0];
    if (last && first && last.t > first.t) {
      const v = -((last.y - first.y) / (last.t - first.t)) * 1000;
      const cap = this.feel.maxVelocityPxPerSec;
      this.velocity = Math.max(-cap, Math.min(cap, v));
    }
    // A click may never follow (pointer released elsewhere); do not swallow the next real tap.
    window.setTimeout(() => (this.suppressClick = false), 0);
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.viewHeight : 1;
    this.anim = null;
    this.velocity = 0;
    this.y = Math.min(this.max, Math.max(0, this.y + e.deltaY * unit * this.feel.wheelMultiplier));
  }

  private onKey(e: KeyboardEvent): void {
    if (e.target !== this.element) return;
    const page = this.viewHeight * 0.9;
    const step = this.feel.keyStepPx;
    const map: Record<string, number | 'top' | 'bottom'> = {
      ArrowDown: step,
      ArrowUp: -step,
      PageDown: page,
      PageUp: -page,
      ' ': page,
      Home: 'top',
      End: 'bottom',
    };
    const action = map[e.key];
    if (action === undefined) return;
    e.preventDefault();
    if (action === 'top') this.scrollTo(0);
    else if (action === 'bottom') this.scrollTo(this.max);
    else this.scrollTo(this.y + action);
  }

  private rubberBand(raw: number): number {
    const k = this.feel.rubberBand;
    const limit = this.feel.maxOverscrollPx;
    if (raw < 0) return -Math.min(limit, -raw * k);
    if (raw > this.max) return this.max + Math.min(limit, (raw - this.max) * k);
    return raw;
  }

  /** Advances inertia / springs / animations. `now` is the frame timestamp in ms. */
  update(now: number, dtMs: number): void {
    this.nowMs = now;
    const dt = Math.min(0.05, Math.max(0, dtMs / 1000));
    if (this.dragging) return;
    if (this.anim) {
      const k = Math.min(1, (now - this.anim.start) / Math.max(1, this.anim.duration));
      const eased = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
      this.y = this.anim.from + (this.anim.to - this.anim.from) * eased;
      if (k >= 1) this.anim = null;
      return;
    }
    if (this.velocity !== 0) {
      this.y += this.velocity * dt;
      this.velocity *= Math.exp(-this.feel.decelerationPerSec * dt);
      if (Math.abs(this.velocity) < this.feel.minVelocityPxPerSec) this.velocity = 0;
      if (this.y < 0 || this.y > this.max) this.velocity *= 0.5;
    }
    const target = Math.min(this.max, Math.max(0, this.y));
    if (target !== this.y) {
      const spring = 1 - Math.exp(-this.feel.springBackPerSec * dt);
      this.y += (target - this.y) * spring;
      if (Math.abs(target - this.y) < 0.5) this.y = target;
    }
  }
}
