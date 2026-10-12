/** ×1 / ×10 / ×50 / MAKS / next-milestone selector (segmented or a single cycling chip). */
import { t, type TKey } from '../../i18n/t';
import { BUY_MODES, type BuyMode } from '../../state/selectors';
import { buyMode } from '../store';

const LABELS: Record<BuyMode, TKey> = {
  x1: 'buyMode.x1',
  x10: 'buyMode.x10',
  x50: 'buyMode.x50',
  max: 'buyMode.max',
  milestone: 'buyMode.milestone',
};

export function BuyModeSegmented() {
  const current = buyMode.value;
  return (
    <div class="segmented" role="radiogroup" aria-label={t('buyMode.label')}>
      {BUY_MODES.map((mode) => (
        <button
          type="button"
          key={mode}
          role="radio"
          aria-checked={current === mode}
          aria-label={mode === 'milestone' ? t('buyMode.milestoneAria') : t(LABELS[mode])}
          class={`segmented__item ${current === mode ? 'is-active' : ''}`}
          onClick={() => (buyMode.value = mode)}
        >
          {t(LABELS[mode])}
        </button>
      ))}
    </div>
  );
}

export function BuyModeChip() {
  const current = buyMode.value;
  const next = (): void => {
    const i = BUY_MODES.indexOf(current);
    buyMode.value = BUY_MODES[(i + 1) % BUY_MODES.length] ?? 'x1';
  };
  return (
    <button
      type="button"
      class="buy-chip"
      onClick={next}
      aria-label={`${t('buyMode.label')}: ${current === 'milestone' ? t('buyMode.milestoneAria') : t(LABELS[current])}`}
      data-testid="buy-mode-chip"
    >
      <span class="buy-chip__caption">{t('buyMode.label')}</span>
      <span class="buy-chip__value">{t(LABELS[current])}</span>
    </button>
  );
}
