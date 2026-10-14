/**
 * lz-string wrapper. The package is CommonJS: bundlers (Vite, Vitest) expose its functions as named
 * exports, Node's native ESM loader (tsx tools) only as `default`. Resolving it here keeps the save
 * code working in the game, the tests and Node scripts alike.
 */
import * as lzModule from 'lz-string';

type LzString = typeof lzModule;
const lz: LzString = (lzModule as LzString & { default?: LzString }).default ?? lzModule;

export function compressText(text: string): string {
  return lz.compressToBase64(text);
}

/** Returns null (or an empty string) when the input is not lz-string Base64 data. */
export function decompressText(data: string): string | null {
  return lz.decompressFromBase64(data);
}
