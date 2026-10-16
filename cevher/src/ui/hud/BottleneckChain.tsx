/**
 * Production chain with the bottleneck indicator (USP: "what should I upgrade now?").
 * The slowest link is marked with colour, an icon and a text label (never colour alone) and
 * tapping any link scrolls to it and opens its upgrade panel.
 */
import { Fragment } from 'preact';
import { t, type TKey } from '../../i18n/t';
import type { GameState } from '../../state/GameState';
import { CHAIN_ORDER, chainFlows, type ChainLink } from '../../state/selectors';
import { Icon, type IconName } from '../components/Icon';
import { formatter } from '../format';
import { focusUnit, unitForLink } from '../navigation';
import { useRuntime } from '../runtime';

const META: Record<ChainLink, { label: TKey; icon: IconName }> = {
  shafts: { label: 'chain.shafts', icon: 'pickaxe' },
  elevator: { label: 'chain.elevator', icon: 'elevator' },
  logistics: { label: 'chain.logistics', icon: 'cart' },
};

export function BottleneckChain({ state }: { state: GameState }) {
  const runtime = useRuntime();
  const fmt = formatter(state.settings);
  const flows = chainFlows(state, state.activeMineId, runtime.game.cfg);

  return (
    <nav class="chain" aria-label={t('chain.label')} id="production-chain">
      {CHAIN_ORDER.map((link, i) => {
        const isBottleneck = flows.bottleneck === link;
        // With several elevators, the elevator link names the one to upgrade.
        const name =
          link === 'elevator' && flows.elevators.length > 1
            ? t('elevator.nameN', { n: flows.weakestElevator + 1 })
            : t(META[link].label);
        const value = fmt.rate(flows[link]);
        return (
          <Fragment key={link}>
            {i > 0 && (
              <span class="chain__arrow" aria-hidden="true">
                <Icon name="chevron" size={14} />
              </span>
            )}
            <button
              type="button"
              class={`chain__link ${isBottleneck ? 'is-bottleneck' : ''}`}
              data-testid={`chain-${link}`}
              data-bottleneck={isBottleneck ? 'true' : 'false'}
              aria-label={t(isBottleneck ? 'chain.bottleneckAria' : 'chain.itemAria', {
                name,
                value,
              })}
              onClick={() => focusUnit(runtime, unitForLink(runtime, link))}
            >
              {isBottleneck && (
                <span class="chain__badge">
                  <Icon name="warning" size={13} />
                  {t('chain.bottleneck')}
                </span>
              )}
              <span class="chain__name">
                <Icon name={META[link].icon} size={15} />
                {name}
              </span>
              <span class="chain__value">{value}</span>
            </button>
          </Fragment>
        );
      })}
    </nav>
  );
}
