/**
 * Translation lookup. Every user-facing string comes from `src/data/i18n/<locale>.json`.
 * `TKey` is derived from the Turkish table, so a typo in a key is a compile error, and the English
 * table is type-checked to contain every key.
 */
import trTable from '../data/i18n/tr.json';
import enTable from '../data/i18n/en.json';

export type Locale = 'tr' | 'en';
export type TKey = keyof typeof trTable;
export type TParams = Record<string, string | number>;

const en: Record<TKey, string> = enTable;
const tables: Record<Locale, Record<TKey, string>> = { tr: trTable, en };

export const LOCALES: readonly Locale[] = ['tr', 'en'];

let current: Locale = 'tr';

export function setLocale(locale: Locale): void {
  current = locale;
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
}

export function getLocale(): Locale {
  return current;
}

export function isLocale(value: unknown): value is Locale {
  return value === 'tr' || value === 'en';
}

const PARAM_RE = /\{(\w+)\}/g;

export function translate(locale: Locale, key: TKey, params?: TParams): string {
  const template = tables[locale][key];
  if (!params) return template;
  return template.replace(PARAM_RE, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/** Translates `key` in the current locale, replacing `{name}` placeholders with `params`. */
export function t(key: TKey, params?: TParams): string {
  return translate(current, key, params);
}

/** Lists keys present in one table but missing in another (used by tests). */
export function missingKeys(from: Locale, to: Locale): string[] {
  const target = tables[to];
  return Object.keys(tables[from]).filter((k) => !(k in target));
}
