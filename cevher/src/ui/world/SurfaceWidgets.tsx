/** Unit cards for the elevator and logistics plus surface tap areas and labels. */
import { t } from '../../i18n/t';
import type { WorldLayout } from '../../render/layout';
import { tapUnit } from '../../state/actions';
import type { GameState, UnitRef } from '../../state/GameState';
import { unitAutomated } from '../../state/selectors';
import { AutoBadge } from '../components/AutoBadge';
import { Icon } from '../components/Icon';
import { ProgressBar } from '../components/ProgressBar';
import { UpgradeButton } from '../components/UpgradeButton';
import { formatter, unitName } from '../format';
import { useRuntime } from '../runtime';
import { selectedUnit } from '../store';
import { px } from './px';
import { TapArea } from './TapArea';

function UnitCard({
  state,
  unit,
  level,
  every,
  style,
  testId,
  showManagerSlot,
}: {
  state: GameState;
  unit: UnitRef;
  level: number;
  every: number;
  style: Record<string, string>;
  testId: string;
  showManagerSlot: boolean;
}) {
  const automated = unitAutomated(state, state.activeMineId, unit);
  return (
    <div class="unit-card" style={style} data-testid={testId}>
      <button
        type="button"
        class="unit-card__info"
        onClick={() => (selectedUnit.value = unit)}
        aria-label={[unitName(unit), t('level.short', { level }), automated ? t('tap.auto') : '']
          .filter(Boolean)
          .join(', ')}
      >
        {showManagerSlot && (
          <span
            class="manager-slot manager-slot--small"
            aria-hidden="true"
            title={t('manager.slot')}
          >
            <Icon name="plus" size={14} />
          </span>
        )}
        <span class="unit-card__text">
          <span class="unit-card__name">{unitName(unit)}</span>
          <span class="level-badge" data-testid={`${testId}-level`}>
            {t('level.short', { level })}
          </span>
        </span>
      </button>
      <UpgradeButton state={state} unit={unit} testId={`${testId}-upgrade`} />
      {automated && <AutoBadge />}
      <ProgressBar value={(level % every) / every} class="unit-card__bar" />
    </div>
  );
}

export function SurfaceWidgets({ state, layout }: { state: GameState; layout: WorldLayout }) {
  const { game } = useRuntime();
  const cfg = game.cfg;
  const mineId = state.activeMineId;
  const mine = state.mines[mineId];
  if (!mine) return null;
  const fmt = formatter(state.settings);
  const L = (v: number): string => px(layout, v);
  const half = layout.width / 2;
  const elevatorIdle = mine.elevator.phase.kind === 'idle';
  const logisticsIdle = mine.logistics.carriers.every((c) => c.phase.kind === 'idle');
  const anyOre = mine.shafts.some((s) => s.stored.gt(0));
  const elevatorAuto = unitAutomated(state, mineId, { kind: 'elevator' });
  const logisticsAuto = unitAutomated(state, mineId, { kind: 'logistics' });

  return (
    <div class="surface-widgets">
      <UnitCard
        state={state}
        unit={{ kind: 'elevator' }}
        level={mine.elevator.level}
        every={cfg.econ.elevator.milestoneEvery}
        testId="elevator-card"
        showManagerSlot={layout.width >= 440}
        style={{ left: L(6), top: L(8), width: L(half - 9) }}
      />
      <UnitCard
        state={state}
        unit={{ kind: 'logistics' }}
        level={mine.logistics.level}
        every={cfg.econ.logistics.milestoneEvery}
        testId="logistics-card"
        showManagerSlot={layout.width >= 440}
        style={{ left: L(half + 3), top: L(8), width: L(half - 9) }}
      />

      <TapArea
        label={t('tap.elevatorAria')}
        testId="tap-elevator"
        style={{
          left: L(layout.columnX - 4),
          top: L(layout.headframeTop - 8),
          width: L(layout.columnWidth + 8),
          height: L(layout.surfaceHeight - layout.headframeTop + 4),
        }}
        idle={elevatorIdle}
        automated={elevatorAuto}
        emphasize={elevatorIdle && anyOre}
        hintClass="tap-hint--elevator"
        onTap={() => game.dispatch((s) => tapUnit(s, mineId, { kind: 'elevator' }, cfg))}
      />
      <TapArea
        label={t('tap.logisticsAria')}
        testId="tap-logistics"
        style={{
          left: L(layout.railStartX - 34),
          top: L(layout.groundY - 70),
          width: L(layout.railEndX - layout.railStartX + 30),
          height: L(layout.surfaceHeight - layout.groundY + 70),
        }}
        idle={logisticsIdle}
        automated={logisticsAuto}
        emphasize={logisticsIdle && mine.surfaceStock.gt(0)}
        hintClass="tap-hint--logistics"
        onTap={() => game.dispatch((s) => tapUnit(s, mineId, { kind: 'logistics' }, cfg))}
      />

      <div
        class="world-label world-label--depot"
        style={{ left: L(layout.depotX + layout.depotWidth / 2), top: L(layout.groundY - 76) }}
        aria-label={t('depot.aria', { amount: fmt.num(mine.surfaceStock) })}
        data-testid="depot-label"
      >
        <span class="world-label__caption">{t('depot.label')}</span>
        {fmt.num(mine.surfaceStock, 'floor')}
      </div>
      <div
        class="warehouse-sign"
        style={{
          left: L(layout.warehouseX + layout.warehouseWidth / 2),
          top: L(layout.groundY - 66 - 7),
        }}
        aria-hidden="true"
      >
        {t('warehouse.label')}
      </div>
    </div>
  );
}
