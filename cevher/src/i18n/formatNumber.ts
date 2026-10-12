/**
 * Number formatting for idle-game magnitudes (GDD 5.8).
 *
 * - Always 3 significant digits (12,3K · 456M), trailing zeros trimmed, at most 2 decimals.
 * - Suffixes: K, M, B, T, then aa, ab … az, ba … zz; beyond that scientific notation.
 * - Optional scientific notation (1,23e45).
 * - Locale-aware decimal separator (tr: comma, en: dot).
 * - Rounding mode: cash is floored (never show more than you own), costs are ceiled (never show
 *   less than you need), everything else rounds to nearest.
 */
import { D, type Decimal, type DecimalSource } from '../core/BigNum';
import type { Locale } from './t';

export type Notation = 'short' | 'scientific';
export type Rounding = 'nearest' | 'floor' | 'ceil';

export interface FormatOptions {
  locale?: Locale;
  notation?: Notation;
  rounding?: Rounding;
}

const NAMED_SUFFIXES = ['', 'K', 'M', 'B', 'T'];
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const ALPHA_SUFFIX_COUNT = LETTERS.length * LETTERS.length; // aa … zz

/** Returns the suffix for a power-of-1000 tier, or null when the tier is beyond `zz`. */
export function suffixForTier(tier: number): string | null {
  if (tier < 0) return null;
  if (tier < NAMED_SUFFIXES.length) return NAMED_SUFFIXES[tier] ?? null;
  const index = tier - NAMED_SUFFIXES.length;
  if (index >= ALPHA_SUFFIX_COUNT) return null;
  const first = LETTERS[Math.floor(index / LETTERS.length)] ?? '';
  const second = LETTERS[index % LETTERS.length] ?? '';
  return first + second;
}

const EPS = 1e-9;

function roundTo(value: number, decimals: number, rounding: Rounding): number {
  const f = 10 ** decimals;
  const scaled = value * f;
  let r: number;
  if (rounding === 'floor') r = Math.floor(scaled + EPS);
  else if (rounding === 'ceil') r = Math.ceil(scaled - EPS);
  else r = Math.round(scaled);
  return r / f;
}

/** Decimal places that yield 3 significant digits for a value in [1, 1000), capped at 2. */
function decimalsFor(abs: number): number {
  if (abs < 10) return 2;
  if (abs < 100) return 1;
  return 0;
}

function toLocaleString(value: number, decimals: number, locale: Locale): string {
  let s = value.toFixed(decimals);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return locale === 'tr' ? s.replace('.', ',') : s;
}

function signedRounding(rounding: Rounding, negative: boolean): Rounding {
  if (!negative || rounding === 'nearest') return rounding;
  return rounding === 'floor' ? 'ceil' : 'floor';
}

/** Mantissa/exponent of |value| normalised to 1 ≤ m < 10 (exponent may exceed 2^53 safely). */
function split(value: Decimal): { mantissa: number; exponent: number } {
  const abs = value.abs();
  return { mantissa: abs.mantissa, exponent: abs.exponent };
}

function formatScientific(value: Decimal, locale: Locale, rounding: Rounding): string {
  const negative = value.lt(0);
  let { mantissa, exponent } = split(value);
  mantissa = roundTo(mantissa, 2, signedRounding(rounding, negative));
  if (mantissa >= 10) {
    mantissa /= 10;
    exponent += 1;
  }
  const body = `${toLocaleString(mantissa, 2, locale)}e${exponent}`;
  return negative ? `-${body}` : body;
}

/** Formats a (possibly huge) number for display. */
export function formatNumber(input: DecimalSource, options: FormatOptions = {}): string {
  const locale = options.locale ?? 'tr';
  const notation = options.notation ?? 'short';
  const rounding = options.rounding ?? 'nearest';
  const value = D(input);

  if (!Number.isFinite(value.mantissa) || !Number.isFinite(value.exponent)) return '∞';
  if (value.eq(0)) return '0';

  const negative = value.lt(0);
  const mode = signedRounding(rounding, negative);
  const sign = negative ? '-' : '';
  const { exponent } = split(value);

  // Small values: plain number with up to 2 decimals.
  if (exponent < 3) {
    const abs = value.abs().toNumber();
    const decimals = decimalsFor(abs);
    const rounded = roundTo(abs, decimals, mode);
    if (rounded >= 1000) {
      // e.g. 999.7 rounds to 1000 → continue as 1K below.
      return formatNumber(negative ? -1000 : 1000, options);
    }
    if (rounded === 0) return '0';
    return sign + toLocaleString(rounded, decimals, locale);
  }

  if (notation === 'scientific') return formatScientific(value, locale, rounding);

  let tier = Math.floor(exponent / 3);
  const { mantissa } = split(value);
  let scaled = mantissa * 10 ** (exponent - tier * 3); // in [1, 1000)
  let decimals = decimalsFor(scaled);
  scaled = roundTo(scaled, decimals, mode);
  if (scaled >= 1000) {
    tier += 1;
    scaled = 1;
    decimals = 2;
  }
  const suffix = suffixForTier(tier);
  if (suffix === null) return formatScientific(value, locale, rounding);
  return `${sign}${toLocaleString(scaled, decimals, locale)}${suffix}`;
}

/** Formats a duration in seconds as m:ss or h:mm:ss (ceil to whole seconds). */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds - 1e-6));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  return `${m}:${ss}`;
}

/** Formats a plain small number (seconds, multipliers) with locale separator and ≤ 2 decimals. */
export function formatPlain(value: number, locale: Locale = 'tr', maxDecimals = 2): string {
  return toLocaleString(roundTo(value, maxDecimals, 'nearest'), maxDecimals, locale);
}
