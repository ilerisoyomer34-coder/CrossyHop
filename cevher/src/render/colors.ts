/** Colour helpers for the placeholder art (GDD 11.2 palette). */
export const PALETTE = {
  ink: 0x3b2a20,
  paper: 0xf6ebd9,
  turquoise: 0x2a9d8f,
  lanternGold: 0xe9b949,
  amber: 0xf4a261,
  rust: 0xc8553d,
  slate: 0x4a4e69,
  sky: 0xa8c5d6,
  navy: 0x264653,
  olive: 0x6a7f3a,
  fireOrange: 0xe76f51,
  skin: 0xf0c49a,
  skinShade: 0xd9a57a,
  wood: 0x9c6b3f,
  woodDark: 0x6e4527,
  iron: 0x6f7480,
  ironDark: 0x4b4f59,
  brass: 0xc9a227,
  deepRock: 0x2c2a3e,
} as const;

export function hexToNumber(hex: string): number {
  const clean = hex.replace('#', '');
  const value = Number.parseInt(clean, 16);
  return Number.isNaN(value) ? 0xff00ff : value;
}

function channels(c: number): [number, number, number] {
  return [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff];
}

export function lerpColor(a: number, b: number, t: number): number {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  const k = Math.min(1, Math.max(0, t));
  const r = Math.round(ar + (br - ar) * k);
  const g = Math.round(ag + (bg - ag) * k);
  const bl = Math.round(ab + (bb - ab) * k);
  return (r << 16) | (g << 8) | bl;
}

export function shade(c: number, amount: number): number {
  return amount >= 0 ? lerpColor(c, 0xffffff, amount) : lerpColor(c, 0x000000, -amount);
}

/** Samples a multi-stop gradient (array of hex strings) at t in [0, 1]. */
export function sampleGradient(stops: readonly string[], t: number): number {
  if (stops.length === 0) return PALETTE.slate;
  if (stops.length === 1) return hexToNumber(stops[0] ?? '#4A4E69');
  const k = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(k));
  return lerpColor(
    hexToNumber(stops[i] ?? '#000000'),
    hexToNumber(stops[i + 1] ?? '#000000'),
    k - i,
  );
}
