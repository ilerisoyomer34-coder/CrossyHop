import { describe, expect, it } from 'vitest';
import { D } from '../src/core/BigNum';
import { formatDuration, formatNumber, formatPlain, suffixForTier } from '../src/i18n/formatNumber';

describe('formatNumber — short notation', () => {
  it.each([
    [0, '0'],
    [8.4, '8,4'],
    [12.34, '12,3'],
    [123.4, '123'],
    [999, '999'],
    [1_000, '1K'],
    [1_234, '1,23K'],
    [12_345, '12,3K'],
    [456_000_000, '456M'],
    [1e9, '1B'],
    [1.5e12, '1,5T'],
    [1e15, '1aa'],
    [2.5e18, '2,5ab'],
    [1e90, '1az'],
    [1e93, '1ba'],
  ])('%s → %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });

  it('uses the English decimal separator', () => {
    expect(formatNumber(12_345, { locale: 'en' })).toBe('12.3K');
    expect(formatNumber(8.4, { locale: 'en' })).toBe('8.4');
  });

  it('rounds 999.95 up to the next tier', () => {
    expect(formatNumber(999.96)).toBe('1K');
    expect(formatNumber(999_960)).toBe('1M');
  });

  it('floors cash and ceils costs', () => {
    expect(formatNumber(1_239, { rounding: 'floor' })).toBe('1,23K');
    expect(formatNumber(1_231, { rounding: 'ceil' })).toBe('1,24K');
    expect(formatNumber(1_230, { rounding: 'floor' })).toBe('1,23K');
    expect(formatNumber(1_230, { rounding: 'ceil' })).toBe('1,23K');
    expect(formatNumber(999_999, { rounding: 'floor' })).toBe('999K');
  });

  it('formats Decimals beyond 1e308', () => {
    expect(formatNumber(D('1.234e1000'))).toBe('12,3mq');
    expect(formatNumber(D('5e2100'))).toBe('5e2100');
  });

  it('handles negatives and tiny values', () => {
    expect(formatNumber(-1_234)).toBe('-1,23K');
    expect(formatNumber(0.05)).toBe('0,05');
    expect(formatNumber(0.001)).toBe('0');
  });
});

describe('formatNumber — scientific notation', () => {
  it('shows 3 significant digits and keeps small numbers plain', () => {
    expect(formatNumber(1_234, { notation: 'scientific' })).toBe('1,23e3');
    expect(formatNumber(D('9.996e44'), { notation: 'scientific' })).toBe('1e45');
    expect(formatNumber(D('1.23e45'), { notation: 'scientific', locale: 'en' })).toBe('1.23e45');
    expect(formatNumber(512, { notation: 'scientific' })).toBe('512');
  });
});

describe('suffixes', () => {
  it('runs K, M, B, T, aa … zz', () => {
    expect(suffixForTier(1)).toBe('K');
    expect(suffixForTier(4)).toBe('T');
    expect(suffixForTier(5)).toBe('aa');
    expect(suffixForTier(30)).toBe('az');
    expect(suffixForTier(31)).toBe('ba');
    expect(suffixForTier(5 + 26 * 26 - 1)).toBe('zz');
    expect(suffixForTier(5 + 26 * 26)).toBeNull();
  });
});

describe('formatDuration / formatPlain', () => {
  it('formats timers', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(59.2)).toBe('1:00');
    expect(formatDuration(61)).toBe('1:01');
    expect(formatDuration(3_600)).toBe('1:00:00');
    expect(formatDuration(4 * 3600 + 5 * 60 + 9)).toBe('4:05:09');
  });

  it('formats plain small numbers per locale', () => {
    expect(formatPlain(4.2)).toBe('4,2');
    expect(formatPlain(4.2, 'en')).toBe('4.2');
    expect(formatPlain(10)).toBe('10');
  });
});
