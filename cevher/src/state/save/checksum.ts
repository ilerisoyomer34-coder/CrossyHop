/**
 * FNV-1a (32-bit) over UTF-16 code units. Detects storage corruption and truncated copy-paste;
 * it is deliberately not an anti-cheat measure (GDD 13.6).
 */
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function fnv1a(text: string): string {
  let hash = FNV_OFFSET;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
