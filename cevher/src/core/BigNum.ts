/**
 * Big-number helpers. All money math goes through break_infinity.js `Decimal` so values beyond
 * 1e308 stay exact enough for an idle game. Levels and counters stay plain `number`s.
 *
 * Decimal instances are treated as immutable: arithmetic methods return new instances and we never
 * call the mutating `from*` methods on shared values.
 */
import Decimal, { type DecimalSource } from 'break_infinity.js';

export { Decimal };
export type { DecimalSource };

export const ZERO: Decimal = new Decimal(0);
export const ONE: Decimal = new Decimal(1);

/** Converts any Decimal source into a Decimal (reusing the instance when it already is one). */
export function D(value: DecimalSource): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

export function dmin(a: Decimal, b: Decimal): Decimal {
  return a.lte(b) ? a : b;
}

export function dmax(a: Decimal, b: Decimal): Decimal {
  return a.gte(b) ? a : b;
}

export function dsum(values: readonly Decimal[]): Decimal {
  let total = ZERO;
  for (const v of values) total = total.add(v);
  return total;
}

export function isPositive(value: Decimal): boolean {
  return value.gt(0);
}

/** Relative closeness check used by tests and tie-breaking (|a-b| <= tol * max(|a|,|b|)). */
export function nearlyEqual(a: Decimal, b: Decimal, relTol = 1e-9): boolean {
  if (a.eq(b)) return true;
  const scale = dmax(a.abs(), b.abs());
  return a.sub(b).abs().lte(scale.mul(relTol));
}

/** Stable string form for saves (Decimal → string). */
export function toSaveString(value: Decimal): string {
  return value.toString();
}

/** Parses a saved Decimal string; invalid input becomes 0 so a corrupt field never crashes. */
export function fromSaveString(raw: unknown): Decimal {
  if (typeof raw !== 'string' && typeof raw !== 'number') return ZERO;
  const parsed = new Decimal(raw);
  return Number.isFinite(parsed.mantissa) && Number.isFinite(parsed.exponent) ? parsed : ZERO;
}
