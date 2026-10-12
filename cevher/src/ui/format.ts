/** UI-side formatting helpers bound to the player's settings. */
import type { Decimal, DecimalSource } from '../core/BigNum';
import { formatNumber, formatPlain, type Rounding } from '../i18n/formatNumber';
import { t } from '../i18n/t';
import type { Settings, UnitRef } from '../state/GameState';

export interface Formatter {
  num(value: DecimalSource, rounding?: Rounding): string;
  cash(value: Decimal): string;
  cost(value: Decimal): string;
  rate(value: DecimalSource): string;
  seconds(value: number): string;
  plain(value: number, decimals?: number): string;
}

export function formatter(settings: Settings): Formatter {
  const opts = { locale: settings.locale, notation: settings.notation };
  const num = (value: DecimalSource, rounding: Rounding = 'nearest'): string =>
    formatNumber(value, { ...opts, rounding });
  return {
    num,
    cash: (v) => num(v, 'floor'),
    cost: (v) => num(v, 'ceil'),
    rate: (v) => t('unit.perSec', { value: num(v) }),
    seconds: (v) => t('unit.seconds', { value: formatPlain(v, settings.locale, 1) }),
    plain: (v, d = 2) => formatPlain(v, settings.locale, d),
  };
}

export function unitName(unit: UnitRef): string {
  switch (unit.kind) {
    case 'shaft':
      return t('shaft.name', { n: unit.index + 1 });
    case 'elevator':
      return t('elevator.name');
    case 'logistics':
      return t('logistics.name');
  }
}
