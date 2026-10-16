/** Upgrade panel (GDD 10.2): stats now → next, buy modes, milestone progress, hold-to-buy. */
import { t } from '../../i18n/t';
import type { GameState, UnitRef } from '../../state/GameState';
import { chainFlows, quoteUpgrade, type ChainLink } from '../../state/selectors';
import { mineDef, oreForShaft } from '../../sim/GameConfig';
import { BuyModeSegmented } from '../components/BuyModeToggle';
import { Icon, type IconName } from '../components/Icon';
import { ProgressBar } from '../components/ProgressBar';
import { UpgradeButton } from '../components/UpgradeButton';
import { elevatorCountOf, formatter, unitName } from '../format';
import { useRuntime } from '../runtime';
import { buyMode } from '../store';
import { unitStats } from './unitStats';

function linkOf(unit: UnitRef): ChainLink {
  return unit.kind === 'shaft' ? 'shafts' : unit.kind;
}

const ICONS: Record<UnitRef['kind'], IconName> = {
  shaft: 'pickaxe',
  elevator: 'elevator',
  logistics: 'cart',
};

export function UpgradePanel({
  state,
  unit,
  onClose,
}: {
  state: GameState;
  unit: UnitRef;
  onClose?: () => void;
}) {
  const { game } = useRuntime();
  const cfg = game.cfg;
  const mineId = state.activeMineId;
  const fmt = formatter(state.settings);
  const quote = quoteUpgrade(state, mineId, unit, buyMode.value, cfg);
  const nextLevel = quote.maxed ? null : quote.level + quote.count;
  const stats = unitStats(state, unit, nextLevel, cfg, fmt);
  const flows = chainFlows(state, mineId, cfg);
  const isBottleneck =
    flows.bottleneck === linkOf(unit) &&
    (unit.kind !== 'elevator' || unit.index === flows.weakestElevator);
  const name = unitName(unit, elevatorCountOf(state));
  const every =
    unit.kind === 'shaft'
      ? cfg.econ.shaft.milestoneEvery
      : unit.kind === 'elevator'
        ? cfg.econ.elevator.milestoneEvery
        : cfg.econ.logistics.milestoneEvery;
  const progress = (quote.level % every) / every;
  const effect =
    unit.kind === 'shaft'
      ? t('milestone.shaft', { mult: quote.milestoneMult })
      : t('milestone.transport', { mult: quote.milestoneMult });
  const ore = unit.kind === 'shaft' ? oreForShaft(mineDef(cfg, mineId), unit.index + 1) : null;

  return (
    <section class="panel" aria-label={name} data-testid="upgrade-panel">
      <header class="panel__header">
        <span class="panel__icon">
          <Icon name={ICONS[unit.kind]} size={26} />
        </span>
        <div class="panel__titles">
          <h2 class="panel__title">
            {name}
            {ore && (
              <span class={`ore-chip ore-chip--${ore}`}>{t(`ore.${ore}` as 'ore.coal')}</span>
            )}
          </h2>
          <div class="panel__level" data-testid="panel-level">
            {t('panel.level', { level: quote.level })}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            class="icon-btn icon-btn--ghost"
            aria-label={t('panel.close')}
            onClick={onClose}
          >
            <Icon name="close" size={20} />
          </button>
        )}
      </header>

      {isBottleneck && (
        <p class="panel__hint" role="note">
          <Icon name="warning" size={18} />
          {t('panel.bottleneckHint')}
        </p>
      )}

      <dl class="stats">
        {stats.map((s) => (
          <div class="stats__row" key={s.label}>
            <dt>{t(s.label)}</dt>
            <dd>
              <span class="stats__now">{s.now}</span>
              {s.next && (
                <>
                  <span class="stats__arrow" aria-hidden="true">
                    →
                  </span>
                  <span class="stats__next">{s.next}</span>
                  {s.gainPct !== null && s.gainPct > 0 && (
                    <span class="stats__gain">
                      +{fmt.plain(s.gainPct, s.gainPct < 10 ? 1 : 0)}%
                    </span>
                  )}
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <div class="milestone">
        {quote.level >= quote.maxLevel ? (
          <span>{t('panel.maxLevel')}</span>
        ) : (
          <>
            <div class="milestone__text">
              <span>{t('panel.nextMilestone', { level: quote.nextMilestone, effect })}</span>
              <span class="milestone__left">
                {t('panel.levelsLeft', { count: quote.levelsToMilestone })}
              </span>
            </div>
            <ProgressBar
              value={progress}
              label={t('panel.nextMilestone', { level: quote.nextMilestone, effect })}
            />
          </>
        )}
      </div>

      <BuyModeSegmented />
      <UpgradeButton state={state} unit={unit} variant="large" testId="panel-buy" />
      <p class="panel__foot">
        {quote.affordable || quote.maxed ? t('panel.holdHint') : t('panel.cantAfford')}
      </p>
    </section>
  );
}
