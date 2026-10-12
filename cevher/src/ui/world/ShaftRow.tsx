/** DOM widgets of one shaft row, positioned over the Pixi art from the shared layout. */
import { t } from '../../i18n/t';
import { rowTop, type WorldLayout } from '../../render/layout';
import { tapUnit } from '../../state/actions';
import type { GameState, ShaftState } from '../../state/GameState';
import { unitAutomated } from '../../state/selectors';
import { oreForShaft, mineDef } from '../../sim/GameConfig';
import { Icon } from '../components/Icon';
import { ProgressBar } from '../components/ProgressBar';
import { UpgradeButton } from '../components/UpgradeButton';
import { formatter } from '../format';
import { useRuntime } from '../runtime';
import { selectedUnit } from '../store';
import { px } from './px';
import { TapArea } from './TapArea';

export function ShaftRow({
  state,
  layout,
  index,
  shaft,
}: {
  state: GameState;
  layout: WorldLayout;
  index: number;
  shaft: ShaftState;
}) {
  const runtime = useRuntime();
  const { game } = runtime;
  const cfg = game.cfg;
  const fmt = formatter(state.settings);
  const mineId = state.activeMineId;
  const unit = { kind: 'shaft' as const, index };
  const n = index + 1;
  const ore = oreForShaft(mineDef(cfg, mineId), n);
  const automated = unitAutomated(state, mineId, unit);
  const idle = shaft.manualCycleEndsAt === null;
  const every = cfg.econ.shaft.milestoneEvery;
  const milestoneProgress = (shaft.level % every) / every;
  const top = rowTop(layout, index);
  const L = (v: number): string => px(layout, v);
  const name = t('shaft.name', { n });

  return (
    <div
      class="row"
      style={{ top: L(top), height: L(layout.rowHeight) }}
      data-testid={`shaft-row-${index}`}
    >
      <TapArea
        label={t('tap.shaftAria', { unit: name })}
        testId={`tap-shaft-${index}`}
        style={{
          left: L(layout.walkStartX - 4),
          top: L(layout.tunnelTop + 50),
          width: L(layout.faceX - layout.walkStartX + 40),
          height: L(layout.floorOffset - layout.tunnelTop - 48),
        }}
        idle={idle}
        automated={automated}
        emphasize={idle && shaft.stored.eq(0)}
        onTap={() => game.dispatch((s) => tapUnit(s, mineId, unit, cfg))}
      />

      <button
        type="button"
        class="manager-slot"
        disabled
        title={t('manager.slot')}
        aria-label={t('manager.slot')}
        style={{ left: L(layout.crateX), top: L(layout.tunnelTop + 6) }}
      >
        <Icon name="plus" size={18} />
      </button>

      <button
        type="button"
        class="row-info"
        style={{ left: L(layout.crateX + 52), top: L(layout.tunnelTop + 4) }}
        onClick={() => (selectedUnit.value = unit)}
        aria-label={`${name}, ${t(`ore.${ore}` as 'ore.coal')}, ${t('level.short', { level: shaft.level })}`}
        data-testid={`shaft-info-${index}`}
      >
        <span class="row-info__title">
          {name}
          <span class={`ore-chip ore-chip--${ore}`}>{t(`ore.${ore}` as 'ore.coal')}</span>
          {automated && <span class="auto-chip">{t('tap.auto')}</span>}
        </span>
        <span class="row-info__level">
          <span class="level-badge" data-testid={`shaft-level-${index}`}>
            {t('level.short', { level: shaft.level })}
          </span>
          <ProgressBar value={milestoneProgress} class="row-info__bar" />
        </span>
      </button>

      <div class="row-upgrade" style={{ right: L(10), top: L(layout.tunnelTop + 6) }}>
        <UpgradeButton state={state} unit={unit} testId={`upgrade-shaft-${index}`} />
      </div>

      <div
        class="crate-label"
        style={{
          left: L(layout.crateX + layout.crateWidth / 2),
          top: L(layout.floorOffset - layout.crateHeight - 18),
        }}
        aria-label={t('crate.aria', { amount: fmt.num(shaft.stored) })}
        data-testid={`crate-${index}`}
      >
        {fmt.num(shaft.stored, 'floor')}
      </div>
    </div>
  );
}
