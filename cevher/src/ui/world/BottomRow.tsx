/** Below the deepest shaft: open the next shaft, blast a rock barrier, or the mine's bottom. */
import { t } from '../../i18n/t';
import { formatDuration } from '../../i18n/formatNumber';
import { bottomRowTop, type WorldLayout } from '../../render/layout';
import { startBarrierBlast, unlockNextShaft } from '../../state/actions';
import type { GameState } from '../../state/GameState';
import { quoteUnlock } from '../../state/selectors';
import { Icon } from '../components/Icon';
import { ProgressBar } from '../components/ProgressBar';
import { formatter } from '../format';
import { useRuntime } from '../runtime';
import { px } from './px';

export function BottomRow({ state, layout }: { state: GameState; layout: WorldLayout }) {
  const { game } = useRuntime();
  const cfg = game.cfg;
  const mineId = state.activeMineId;
  const quote = quoteUnlock(state, mineId, cfg);
  const fmt = formatter(state.settings);
  const L = (v: number): string => px(layout, v);
  const oreName = t(`ore.${quote.ore}` as 'ore.coal');

  let content;
  if (quote.status === 'available') {
    content = (
      <button
        type="button"
        class={`unlock-btn ${quote.affordable ? 'is-affordable' : 'is-unaffordable'}`}
        aria-disabled={!quote.affordable}
        aria-label={t('shaft.unlockAria', { n: quote.shaftNumber, cost: fmt.cost(quote.cost) })}
        data-testid="unlock-shaft"
        onClick={() => game.dispatch((s) => unlockNextShaft(s, mineId, cfg))}
      >
        <span class="unlock-btn__title">
          <Icon name="pickaxe" size={22} />
          {t('shaft.unlock')}
        </span>
        <span class="unlock-btn__sub">
          {quote.newElevator !== null
            ? t('shaft.unlockSubElevator', {
                n: quote.shaftNumber,
                ore: oreName,
                e: quote.newElevator + 1,
              })
            : t('shaft.unlockSub', { n: quote.shaftNumber, ore: oreName })}
        </span>
        <span class="unlock-btn__cost">
          <Icon name="coin" size={18} />
          {fmt.cost(quote.cost)}
        </span>
      </button>
    );
  } else if ((quote.status === 'barrier' || quote.status === 'blasting') && quote.barrier) {
    const barrier = quote.barrier;
    const blasting = quote.status === 'blasting' && barrier.endsAt !== null;
    const remainingSec = blasting
      ? Math.max(0, ((barrier.endsAt ?? 0) - state.time) / 1000)
      : barrier.durationSec;
    const free = barrier.cost.lte(0);
    content = (
      <div class="barrier-card" data-testid="barrier-card">
        <div class="barrier-card__head">
          <Icon name="dynamite" size={26} />
          <div>
            <div class="barrier-card__title">{t('barrier.title')}</div>
            <div class="barrier-card__desc">
              {blasting ? t('barrier.blasting') : t('barrier.desc')}
            </div>
          </div>
        </div>
        {blasting ? (
          <div class="barrier-card__timer" data-testid="barrier-timer">
            <ProgressBar value={1 - remainingSec / barrier.durationSec} tone="amber" />
            <span>
              <Icon name="clock" size={16} />{' '}
              {t('barrier.remaining', { time: formatDuration(remainingSec) })}
            </span>
          </div>
        ) : (
          <button
            type="button"
            class={`blast-btn ${barrier.affordable ? 'is-affordable' : 'is-unaffordable'}`}
            aria-disabled={!barrier.affordable}
            aria-label={t('barrier.blastAria', {
              cost: free ? t('barrier.free') : fmt.cost(barrier.cost),
            })}
            data-testid="blast-barrier"
            onClick={() => game.dispatch((s) => startBarrierBlast(s, mineId, cfg))}
          >
            <span>{t('barrier.blast')}</span>
            <span class="blast-btn__cost">
              {free ? t('barrier.free') : fmt.cost(barrier.cost)} ·{' '}
              {formatDuration(barrier.durationSec)}
            </span>
          </button>
        )}
      </div>
    );
  } else {
    content = (
      <div class="bottom-card">
        <div class="bottom-card__title">{t('shaft.bottom')}</div>
        <div class="bottom-card__sub">{t('shaft.bottomSub')}</div>
      </div>
    );
  }

  return (
    <div
      class="bottom-row"
      data-testid="bottom-row"
      style={{ top: L(bottomRowTop(layout) + 18), height: L(layout.bottomRowHeight - 30) }}
    >
      {content}
    </div>
  );
}
