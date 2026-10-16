/** Stat rows for the upgrade panel: current value and the value after the quoted purchase. */
import type { Decimal } from '../../core/BigNum';
import type { TKey } from '../../i18n/t';
import type { GameConfig } from '../../sim/GameConfig';
import { mineDef } from '../../sim/GameConfig';
import { zoneView } from '../../sim/zones';
import type { GameState, UnitRef } from '../../state/GameState';
import { getMine } from '../../state/update';
import type { Formatter } from '../format';

export interface StatRow {
  label: TKey;
  now: string;
  next: string | null;
  /** Relative increase in percent (for the main output stat). */
  gainPct: number | null;
}

function pct(now: Decimal, next: Decimal): number | null {
  if (now.lte(0)) return null;
  return next.div(now).sub(1).mul(100).toNumber();
}

export function unitStats(
  state: GameState,
  unit: UnitRef,
  nextLevel: number | null,
  cfg: GameConfig,
  fmt: Formatter,
): StatRow[] {
  const mine = getMine(state, state.activeMineId);
  const eco = cfg.economy;
  const scale = mineDef(cfg, mine.id).mineScale;
  const rows: StatRow[] = [];
  const row = (
    label: TKey,
    now: string,
    next: string | null,
    gainPct: number | null = null,
  ): void => {
    rows.push({ label, now, next: next !== null && next !== now ? next : null, gainPct });
  };

  switch (unit.kind) {
    case 'shaft': {
      const n = unit.index + 1;
      const L = mine.shafts[unit.index]?.level ?? 1;
      const N = nextLevel;
      const pNow = eco.shaftProduction(n, L, scale);
      const pNext = N !== null ? eco.shaftProduction(n, N, scale) : null;
      row(
        'stat.production',
        fmt.rate(pNow),
        pNext ? fmt.rate(pNext) : null,
        pNext ? pct(pNow, pNext) : null,
      );
      row('stat.miners', String(eco.minerCount(L)), N !== null ? String(eco.minerCount(N)) : null);
      row(
        'stat.minerCapacity',
        fmt.num(eco.shaftLoadPerMiner(n, L, scale)),
        N !== null ? fmt.num(eco.shaftLoadPerMiner(n, N, scale)) : null,
      );
      row('stat.cycle', fmt.seconds(eco.shaftCycleMs() / 1000), null);
      break;
    }
    case 'elevator': {
      const L = mine.elevators[unit.index]?.level ?? 1;
      const N = nextLevel;
      const open = zoneView(cfg, mine, unit.index).deepestStop;
      const zoneScale = scale * eco.elevatorZoneFlowScale(unit.index);
      const fNow = eco.elevatorRealFlow(L, open, zoneScale);
      const fNext = N !== null ? eco.elevatorRealFlow(N, open, zoneScale) : null;
      row(
        'stat.flow',
        fmt.rate(fNow),
        fNext ? fmt.rate(fNext) : null,
        fNext ? pct(fNow, fNext) : null,
      );
      row(
        'stat.capacity',
        fmt.num(eco.elevatorCapacity(L, zoneScale)),
        N !== null ? fmt.num(eco.elevatorCapacity(N, zoneScale)) : null,
      );
      row(
        'stat.trip',
        fmt.seconds(eco.elevatorTripMs(open, L) / 1000),
        N !== null ? fmt.seconds(eco.elevatorTripMs(open, N) / 1000) : null,
      );
      row(
        'stat.speed',
        `×${fmt.plain(eco.elevatorSpeedMultiplier(L))}`,
        N !== null ? `×${fmt.plain(eco.elevatorSpeedMultiplier(N))}` : null,
      );
      break;
    }
    case 'logistics': {
      const L = mine.logistics.level;
      const N = nextLevel;
      const fNow = eco.logisticsFlow(L, scale);
      const fNext = N !== null ? eco.logisticsFlow(N, scale) : null;
      row(
        'stat.flow',
        fmt.rate(fNow),
        fNext ? fmt.rate(fNext) : null,
        fNext ? pct(fNow, fNext) : null,
      );
      row(
        'stat.carriers',
        String(eco.carrierCount(L)),
        N !== null ? String(eco.carrierCount(N)) : null,
      );
      row(
        'stat.wagonCapacity',
        fmt.num(eco.wagonCapacity(L, scale)),
        N !== null ? fmt.num(eco.wagonCapacity(N, scale)) : null,
      );
      break;
    }
  }
  return rows;
}
