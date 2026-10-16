/**
 * Transfer station row between two elevator zones: the station's ore stock, the card of the deeper
 * elevator (it docks here) and the tap area that sends that elevator down.
 */
import { t } from '../../i18n/t';
import { stationTop, type WorldLayout } from '../../render/layout';
import { tapUnit } from '../../state/actions';
import type { GameState } from '../../state/GameState';
import { unitAutomated } from '../../state/selectors';
import { zoneView } from '../../sim/zones';
import { formatter } from '../format';
import { useRuntime } from '../runtime';
import { px } from './px';
import { UnitCard } from './SurfaceWidgets';
import { TapArea } from './TapArea';

export function StationRow({
  state,
  layout,
  station,
}: {
  state: GameState;
  layout: WorldLayout;
  station: number;
}) {
  const { game } = useRuntime();
  const cfg = game.cfg;
  const mineId = state.activeMineId;
  const mine = state.mines[mineId];
  const elevatorIndex = station + 1;
  const elevator = mine?.elevators[elevatorIndex];
  if (!mine || !elevator) return null;
  const fmt = formatter(state.settings);
  const L = (v: number): string => px(layout, v);
  const unit = { kind: 'elevator' as const, index: elevatorIndex };
  const top = stationTop(layout, station);
  const idle = elevator.phase.kind === 'idle';
  const automated = unitAutomated(state, mineId, unit);
  const view = zoneView(cfg, mine, elevatorIndex);
  const zoneOre =
    mine.shafts.slice(view.first, view.first + view.count).some((s) => s.stored.gt(0)) ||
    (view.hasStationBelow && (mine.stations[elevatorIndex]?.gt(0) ?? false));
  const stock = mine.stations[station];
  const chamberX = layout.columnX + layout.columnWidth;

  return (
    <div
      class="row station-row"
      style={{ top: L(top), height: L(layout.stationHeight) }}
      data-testid={`station-row-${station}`}
    >
      <div
        class="world-label world-label--station"
        style={{ left: L(chamberX + 70), top: L(14) }}
        aria-label={t('station.aria', { n: station + 1, amount: fmt.num(stock ?? 0) })}
        data-testid={`station-stock-${station}`}
      >
        <span class="world-label__caption">{t('station.label', { n: station + 1 })}</span>
        {fmt.num(stock ?? 0, 'floor')}
      </div>
      <UnitCard
        state={state}
        unit={unit}
        level={elevator.level}
        every={cfg.econ.elevator.milestoneEvery}
        testId={`elevator-card-${elevatorIndex}`}
        showManagerSlot={layout.width >= 440}
        style={{
          left: L(chamberX + 8),
          top: L(layout.stationUpperFloor + 12),
          width: L(layout.width - chamberX - 18),
        }}
      />
      <TapArea
        label={t('tap.elevatorNAria', { n: elevatorIndex + 1 })}
        testId={`tap-elevator-${elevatorIndex}`}
        style={{
          left: L(layout.columnX - 4),
          top: L(layout.stationUpperFloor + 8),
          width: L(layout.columnWidth + 8),
          height: L(layout.stationHeight - layout.stationUpperFloor - 6),
        }}
        idle={idle}
        automated={automated}
        emphasize={idle && zoneOre}
        hintClass="tap-hint--elevator"
        onTap={() => game.dispatch((s) => tapUnit(s, mineId, unit, cfg))}
      />
    </div>
  );
}
