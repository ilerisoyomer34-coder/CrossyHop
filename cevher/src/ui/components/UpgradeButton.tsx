/** Buy button used on rows, unit cards and in the upgrade panel (supports press-and-hold). */
import { t } from '../../i18n/t';
import { vibrate } from '../../platform/haptics';
import { buyWithMode } from '../../state/actions';
import type { GameState, UnitRef } from '../../state/GameState';
import { quoteUpgrade } from '../../state/selectors';
import { elevatorCountOf, formatter, unitName } from '../format';
import { useHoldRepeat } from '../hooks/useHoldRepeat';
import { useRuntime } from '../runtime';
import { buyMode } from '../store';
import { Icon } from './Icon';

export function UpgradeButton({
  state,
  unit,
  variant = 'compact',
  testId,
}: {
  state: GameState;
  unit: UnitRef;
  variant?: 'compact' | 'large';
  testId?: string;
}) {
  const { game } = useRuntime();
  const mode = buyMode.value;
  const mineId = state.activeMineId;
  const quote = quoteUpgrade(state, mineId, unit, mode, game.cfg);
  const fmt = formatter(state.settings);
  const enabled = quote.affordable && !quote.maxed;

  const hold = useHoldRepeat(() => {
    const r = game.dispatch((s) => buyWithMode(s, mineId, unit, buyMode.peek(), game.cfg));
    if (r.ok) vibrate(8);
    return r.ok;
  }, enabled);

  const label = quote.maxed
    ? t('upgrade.maxed')
    : t('upgrade.aria', {
        unit: unitName(unit, elevatorCountOf(state)),
        count: quote.count,
        cost: fmt.cost(quote.cost),
      });

  return (
    <button
      type="button"
      class={`upgrade-btn upgrade-btn--${variant} ${enabled ? 'is-affordable' : 'is-unaffordable'} ${quote.maxed ? 'is-maxed' : ''}`}
      aria-label={label}
      aria-disabled={!enabled}
      data-testid={testId}
      onPointerDown={hold.onPointerDown}
      onClick={hold.onClick}
      onContextMenu={hold.onContextMenu}
    >
      {quote.maxed ? (
        <span class="upgrade-btn__max">{t('level.max')}</span>
      ) : (
        <>
          <span class="upgrade-btn__icon">
            <Icon name="up" size={variant === 'large' ? 20 : 16} />
          </span>
          <span class="upgrade-btn__body">
            {variant === 'large' && (
              <span class="upgrade-btn__title">{t('panel.buy', { count: quote.count })}</span>
            )}
            <span class="upgrade-btn__cost">
              <Icon name="coin" size={variant === 'large' ? 18 : 14} />
              {fmt.cost(quote.cost)}
            </span>
          </span>
          {variant === 'compact' && quote.count > 1 && (
            <span class="upgrade-btn__count">
              {t('upgrade.levelsPlus', { count: quote.count })}
            </span>
          )}
        </>
      )}
    </button>
  );
}
