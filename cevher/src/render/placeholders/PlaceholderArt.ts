/**
 * Procedurally drawn placeholder art (GDD 11.4: the game must run without any art files).
 *
 * Every sprite part is drawn once with Pixi Graphics in the "warm hand-painted diorama" style
 * (rounded chunky shapes, dark-brown outlines, light from the top left) and baked into a texture,
 * so characters are plain batched Sprites at runtime. Phase 1 puts an asset manifest in front of
 * this: when an atlas frame exists for a key it is used, otherwise this placeholder is generated.
 */
import { Graphics, Rectangle, type Renderer, type Texture } from 'pixi.js';
import { PALETTE, shade } from '../colors';

export type ArtKey =
  | 'px'
  | 'circle'
  | 'softCircle'
  | 'miner.leg'
  | 'miner.body'
  | 'miner.head'
  | 'miner.glove'
  | 'miner.pickaxe'
  | 'miner.sack'
  | 'carrier.body'
  | 'carrier.head'
  | 'wagon'
  | 'wagon.ore'
  | 'operator'
  | 'defne'
  | 'kosti'
  | 'crate'
  | 'pile'
  | 'ore.chunk'
  | 'glint'
  | 'lamp';

const INK = PALETTE.ink;
const OUTLINE = { width: 2, color: INK, alignment: 0.5 } as const;
const THIN = { width: 1.5, color: INK, alignment: 0.5 } as const;

type Painter = (g: Graphics) => void;

interface ArtSpec {
  w: number;
  h: number;
  draw: Painter;
}

const SPECS: Record<ArtKey, ArtSpec> = {
  px: { w: 4, h: 4, draw: (g) => g.rect(0, 0, 4, 4).fill(0xffffff) },
  circle: { w: 32, h: 32, draw: (g) => g.circle(16, 16, 16).fill(0xffffff) },
  softCircle: {
    w: 32,
    h: 32,
    draw: (g) => {
      for (let r = 16; r > 0; r -= 2) g.circle(16, 16, r).fill({ color: 0xffffff, alpha: 0.12 });
    },
  },

  // ---------------------------------------------------------------- miner (faces right)
  'miner.leg': {
    w: 9,
    h: 12,
    draw: (g) => {
      g.roundRect(1.5, 0, 6, 8, 2).fill(0x2f5e5a).stroke(THIN);
      g.roundRect(0.75, 6.5, 8, 4.5, 2).fill(0x5a3b28).stroke(THIN);
    },
  },
  'miner.body': {
    w: 28,
    h: 28,
    draw: (g) => {
      g.roundRect(3, 3, 22, 23, 8).fill(PALETTE.turquoise).stroke(OUTLINE);
      g.roundRect(5, 4, 9, 6, 3).fill({ color: 0xffffff, alpha: 0.18 });
      g.moveTo(8, 4)
        .lineTo(10, 15)
        .stroke({ width: 2.5, color: shade(PALETTE.turquoise, 0.35) });
      g.moveTo(20, 4)
        .lineTo(18, 15)
        .stroke({ width: 2.5, color: shade(PALETTE.turquoise, 0.35) });
      g.roundRect(9, 13, 10, 7, 2).fill(shade(PALETTE.turquoise, -0.15)).stroke(THIN);
      g.rect(4, 20, 20, 2.5).fill(PALETTE.woodDark);
      g.circle(14, 21.2, 1.6).fill(PALETTE.lanternGold);
    },
  },
  'miner.head': {
    w: 30,
    h: 30,
    draw: (g) => {
      g.circle(14, 17, 9).fill(PALETTE.skin).stroke(OUTLINE);
      g.circle(18.5, 18, 1.6).fill(INK);
      g.circle(16.5, 21.5, 2).fill({ color: 0xe8846b, alpha: 0.6 });
      g.moveTo(17, 23).quadraticCurveTo(19, 24.2, 21, 22.6).stroke({ width: 1.3, color: INK });
      // helmet
      g.moveTo(3, 15)
        .bezierCurveTo(3, 3, 25, 3, 25, 15)
        .closePath()
        .fill(PALETTE.lanternGold)
        .stroke(OUTLINE);
      g.roundRect(2, 13.5, 26, 4, 2).fill(shade(PALETTE.lanternGold, -0.18)).stroke(THIN);
      g.roundRect(7, 6, 7, 3, 1.5).fill({ color: 0xffffff, alpha: 0.35 });
      // lamp
      g.circle(24, 9.5, 3.6).fill(0xfff3b0).stroke(THIN);
      g.circle(24, 9.5, 1.6).fill(0xffffff);
    },
  },
  'miner.glove': {
    w: 12,
    h: 12,
    draw: (g) => {
      g.circle(6, 6, 4.6).fill(0xd9822b).stroke(THIN);
      g.circle(4.6, 4.6, 1.4).fill({ color: 0xffffff, alpha: 0.35 });
    },
  },
  'miner.pickaxe': {
    w: 32,
    h: 32,
    draw: (g) => {
      g.moveTo(5, 28).lineTo(22, 9).stroke({ width: 5, color: INK, cap: 'round' });
      g.moveTo(5, 28).lineTo(22, 9).stroke({ width: 3, color: PALETTE.wood, cap: 'round' });
      g.moveTo(12, 3)
        .quadraticCurveTo(24, 2, 31, 13)
        .lineTo(28, 14)
        .quadraticCurveTo(22, 7, 13, 6.5)
        .closePath()
        .fill(PALETTE.iron)
        .stroke(THIN);
    },
  },
  'miner.sack': {
    w: 22,
    h: 20,
    draw: (g) => {
      g.moveTo(5, 6)
        .quadraticCurveTo(0, 18, 11, 19)
        .quadraticCurveTo(22, 18, 17, 6)
        .closePath()
        .fill(0x9b7653)
        .stroke(OUTLINE);
      g.roundRect(7, 3, 8, 4, 2).fill(0x7b5a3c).stroke(THIN);
      g.circle(9, 12, 1.6).fill(0x3d3a40);
      g.circle(13, 14, 1.3).fill(0x3d3a40);
    },
  },

  // ---------------------------------------------------------------- carrier
  'carrier.body': {
    w: 26,
    h: 28,
    draw: (g) => {
      g.roundRect(3, 3, 20, 23, 8).fill(0xe9dcc3).stroke(OUTLINE);
      g.moveTo(4, 8).lineTo(10, 25).lineTo(4, 25).closePath().fill(PALETTE.olive);
      g.moveTo(22, 8).lineTo(16, 25).lineTo(22, 25).closePath().fill(PALETTE.olive);
      g.roundRect(3, 3, 20, 23, 8).stroke(OUTLINE);
      g.rect(4, 20, 18, 2.5).fill(PALETTE.woodDark);
    },
  },
  'carrier.head': {
    w: 30,
    h: 30,
    draw: (g) => {
      g.circle(14, 17, 9).fill(PALETTE.skin).stroke(OUTLINE);
      g.circle(18.5, 18, 1.6).fill(INK);
      g.circle(16.5, 21.5, 2).fill({ color: 0xe8846b, alpha: 0.6 });
      g.moveTo(5, 14)
        .bezierCurveTo(5, 5, 23, 5, 23, 14)
        .closePath()
        .fill(PALETTE.rust)
        .stroke(OUTLINE);
      g.circle(9, 10, 1).fill({ color: 0xffffff, alpha: 0.7 });
      g.circle(15, 9, 1).fill({ color: 0xffffff, alpha: 0.7 });
      g.moveTo(5, 13).lineTo(0, 17).lineTo(2, 11).closePath().fill(PALETTE.rust).stroke(THIN);
    },
  },
  wagon: {
    w: 48,
    h: 30,
    draw: (g) => {
      g.moveTo(2, 4)
        .lineTo(46, 4)
        .lineTo(42, 22)
        .lineTo(6, 22)
        .closePath()
        .fill(PALETTE.iron)
        .stroke(OUTLINE);
      g.rect(2, 3, 44, 4).fill(PALETTE.wood).stroke(THIN);
      g.moveTo(10, 9)
        .lineTo(38, 9)
        .stroke({ width: 1, color: shade(PALETTE.iron, 0.25) });
      g.circle(13, 24, 5).fill(PALETTE.ironDark).stroke(OUTLINE);
      g.circle(35, 24, 5).fill(PALETTE.ironDark).stroke(OUTLINE);
      g.circle(13, 24, 1.6).fill(PALETTE.brass);
      g.circle(35, 24, 1.6).fill(PALETTE.brass);
    },
  },
  'wagon.ore': {
    w: 40,
    h: 16,
    draw: (g) => {
      g.moveTo(1, 15)
        .quadraticCurveTo(8, 2, 20, 3)
        .quadraticCurveTo(32, 2, 39, 15)
        .closePath()
        .fill(0x3a3640)
        .stroke(THIN);
      g.circle(13, 9, 2.4).fill(0xc2673a);
      g.circle(24, 7, 2).fill(0xe9b949);
      g.circle(30, 11, 1.8).fill(0x8a6656);
      g.circle(18, 12, 1.2).fill(0xffffff);
    },
  },
  operator: {
    w: 22,
    h: 32,
    draw: (g) => {
      g.roundRect(4, 15, 14, 15, 5).fill(PALETTE.navy).stroke(OUTLINE);
      g.circle(11, 10, 6.5).fill(PALETTE.skin).stroke(OUTLINE);
      g.circle(13.5, 10.5, 1.2).fill(INK);
      g.roundRect(3, 3, 16, 4.5, 2).fill(PALETTE.navy).stroke(THIN);
      g.roundRect(9, 5.5, 13, 2.5, 1).fill(shade(PALETTE.navy, -0.3));
      g.circle(11, 20, 1.3).fill(PALETTE.brass);
    },
  },

  // ---------------------------------------------------------------- story characters
  defne: {
    w: 48,
    h: 74,
    draw: (g) => {
      // legs
      g.roundRect(15, 54, 7, 16, 3).fill(0x3d4a5c).stroke(THIN);
      g.roundRect(25, 54, 7, 16, 3).fill(0x3d4a5c).stroke(THIN);
      g.roundRect(13, 67, 10, 5, 2).fill(0x5a3b28).stroke(THIN);
      g.roundRect(24, 67, 10, 5, 2).fill(0x5a3b28).stroke(THIN);
      // jacket
      g.roundRect(10, 30, 28, 28, 9).fill(PALETTE.turquoise).stroke(OUTLINE);
      g.rect(11, 42, 26, 3).fill(PALETTE.fireOrange);
      g.rect(11, 48, 26, 3).fill(PALETTE.amber);
      g.moveTo(24, 31)
        .lineTo(24, 57)
        .stroke({ width: 1.2, color: shade(PALETTE.turquoise, -0.35) });
      g.circle(9, 44, 4.5).fill(PALETTE.skin).stroke(THIN);
      g.circle(39, 44, 4.5).fill(PALETTE.skin).stroke(THIN);
      // head + curly hair
      for (const [x, y, r] of [
        [14, 15, 6],
        [20, 9, 6.5],
        [28, 9, 6.5],
        [34, 15, 6],
        [12, 22, 5],
        [36, 22, 5],
        [24, 7, 6],
      ] as const) {
        g.circle(x, y, r).fill(0x2e1f1a).stroke(THIN);
      }
      g.circle(24, 21, 10).fill(PALETTE.skin).stroke(OUTLINE);
      g.moveTo(15, 15).quadraticCurveTo(24, 9, 33, 15).stroke({ width: 4, color: 0x2e1f1a });
      // brass round glasses
      g.circle(20, 21, 3.6).stroke({ width: 1.6, color: PALETTE.brass });
      g.circle(28.5, 21, 3.6).stroke({ width: 1.6, color: PALETTE.brass });
      g.moveTo(23.6, 21).lineTo(24.9, 21).stroke({ width: 1.4, color: PALETTE.brass });
      g.circle(20, 21, 1.1).fill(INK);
      g.circle(28.5, 21, 1.1).fill(INK);
      g.moveTo(21, 26.5).quadraticCurveTo(24.5, 29, 28, 26.5).stroke({ width: 1.4, color: INK });
    },
  },
  kosti: {
    w: 42,
    h: 42,
    draw: (g) => {
      g.ellipse(21, 28, 15, 12.5).fill(0x8b6e5a).stroke(OUTLINE);
      g.ellipse(21, 32, 9, 7).fill(0xb89a82);
      g.ellipse(33, 25, 3.5, 2.6).fill(0xf2a0a0).stroke(THIN);
      g.circle(18, 23, 4.5)
        .fill({ color: 0xffffff, alpha: 0.8 })
        .stroke({ width: 1.6, color: PALETTE.brass });
      g.circle(27, 23, 4.5)
        .fill({ color: 0xffffff, alpha: 0.8 })
        .stroke({ width: 1.6, color: PALETTE.brass });
      g.circle(18.8, 23.4, 1.5).fill(INK);
      g.circle(27.8, 23.4, 1.5).fill(INK);
      // helmet with side lamp
      g.moveTo(8, 18)
        .bezierCurveTo(8, 4, 34, 4, 34, 18)
        .closePath()
        .fill(PALETTE.lanternGold)
        .stroke(OUTLINE);
      g.circle(9, 13, 3.4).fill(0xfff3b0).stroke(THIN);
      // notebook
      g.roundRect(29, 30, 10, 12, 1.5).fill(PALETTE.rust).stroke(THIN);
      g.rect(30.5, 32, 7, 1.2).fill(PALETTE.paper);
      g.ellipse(14, 39, 4, 2.4).fill(0x6d5444).stroke(THIN);
      g.ellipse(28, 39, 4, 2.4).fill(0x6d5444).stroke(THIN);
    },
  },

  // ---------------------------------------------------------------- props
  crate: {
    w: 50,
    h: 36,
    draw: (g) => {
      g.roundRect(1, 6, 48, 29, 3).fill(PALETTE.wood).stroke(OUTLINE);
      g.moveTo(2, 15.5).lineTo(48, 15.5).stroke({ width: 1.2, color: PALETTE.woodDark });
      g.moveTo(2, 25).lineTo(48, 25).stroke({ width: 1.2, color: PALETTE.woodDark });
      g.rect(1, 6, 6, 29).fill(PALETTE.ironDark);
      g.rect(43, 6, 6, 29).fill(PALETTE.ironDark);
      g.roundRect(1, 6, 48, 29, 3).stroke(OUTLINE);
      g.circle(4, 10, 1).fill(PALETTE.brass);
      g.circle(46, 10, 1).fill(PALETTE.brass);
      g.circle(4, 31, 1).fill(PALETTE.brass);
      g.circle(46, 31, 1).fill(PALETTE.brass);
    },
  },
  pile: {
    w: 44,
    h: 18,
    draw: (g) => {
      g.moveTo(1, 17)
        .quadraticCurveTo(6, 3, 18, 4)
        .quadraticCurveTo(26, 0, 33, 5)
        .quadraticCurveTo(42, 7, 43, 17)
        .closePath()
        .fill(0xffffff)
        .stroke(THIN);
      g.circle(14, 10, 2.2).fill({ color: 0x000000, alpha: 0.2 });
      g.circle(27, 8, 2).fill({ color: 0x000000, alpha: 0.18 });
      g.circle(33, 12, 1.6).fill({ color: 0x000000, alpha: 0.2 });
      g.circle(20, 7, 1.4).fill({ color: 0xffffff, alpha: 0.9 });
    },
  },
  'ore.chunk': {
    w: 18,
    h: 16,
    draw: (g) => {
      g.poly([2, 9, 6, 2, 13, 1, 17, 7, 14, 14, 5, 15]).fill(0xffffff).stroke(THIN);
      g.poly([6, 4, 11, 3, 9, 8]).fill({ color: 0xffffff, alpha: 0.6 });
      g.poly([12, 9, 15, 8, 13, 13]).fill({ color: 0x000000, alpha: 0.18 });
    },
  },
  glint: {
    w: 12,
    h: 12,
    draw: (g) => {
      g.poly([6, 0, 7.3, 4.7, 12, 6, 7.3, 7.3, 6, 12, 4.7, 7.3, 0, 6, 4.7, 4.7]).fill(0xffffff);
    },
  },
  lamp: {
    w: 14,
    h: 18,
    draw: (g) => {
      g.moveTo(7, 0).lineTo(7, 4).stroke({ width: 1.5, color: INK });
      g.roundRect(2, 4, 10, 12, 3).fill(0xfff1b8).stroke(THIN);
      g.rect(2, 4, 10, 2.5).fill(PALETTE.brass);
      g.rect(2, 13.5, 10, 2.5).fill(PALETTE.brass);
    },
  },
};

export class PlaceholderArt {
  private readonly cache = new Map<ArtKey, Texture>();

  constructor(
    private readonly renderer: Renderer,
    private readonly resolution = 2,
  ) {}

  get(key: ArtKey): Texture {
    let texture = this.cache.get(key);
    if (!texture) {
      texture = this.bake(SPECS[key]);
      this.cache.set(key, texture);
    }
    return texture;
  }

  /** Bakes every texture up front so no generation happens mid-game. */
  warmUp(): void {
    for (const key of Object.keys(SPECS) as ArtKey[]) this.get(key);
  }

  private bake(spec: ArtSpec): Texture {
    const g = new Graphics();
    spec.draw(g);
    const texture = this.renderer.generateTexture({
      target: g,
      frame: new Rectangle(0, 0, spec.w, spec.h),
      resolution: this.resolution,
    });
    g.destroy();
    return texture;
  }

  destroy(): void {
    for (const t of this.cache.values()) t.destroy(true);
    this.cache.clear();
  }
}
