/**
 * Cash readout that flows smoothly toward the real value (GDD 5.8 tweening). It reads the live
 * game cash every frame and writes the text node directly, so the rest of the UI can stay on the
 * 10 Hz update budget.
 */
import { useEffect, useRef } from 'preact/hooks';
import type { Decimal } from '../../core/BigNum';
import { feelConfig } from '../../data/config';
import { formatNumber } from '../../i18n/formatNumber';
import { useRuntime, type FrameHook } from '../runtime';
import { stateSignal } from '../store';

export function CashCounter() {
  const runtime = useRuntime();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let display: Decimal | null = null;
    let lastText = '';
    const tau = feelConfig.cashTween.timeConstantMs;
    const hook: FrameHook = (_now, dt) => {
      const el = ref.current;
      const settings = stateSignal.peek()?.settings;
      if (!el || !settings) return;
      const target = runtime.game.cash;
      if (display === null || target.lte(display)) {
        display = target; // spending is shown instantly
      } else {
        const k = 1 - Math.exp(-Math.max(0, dt) / tau);
        display = display.add(target.sub(display).mul(k));
        if (target.sub(display).lte(target.mul(0.001))) display = target;
      }
      const text = formatNumber(display, {
        locale: settings.locale,
        notation: settings.notation,
        rounding: 'floor',
      });
      if (text !== lastText) {
        el.textContent = text;
        lastText = text;
      }
    };
    runtime.frameHooks.add(hook);
    return () => {
      runtime.frameHooks.delete(hook);
    };
  }, [runtime]);

  return <span ref={ref} class="cash__value" data-testid="cash-value" />;
}
