/**
 * One shaft row (maden katı): rock band, tunnel with timber supports, the elevator column segment
 * with its landing, the crate, the ore vein at the rock face and the miners.
 */
import { Container, Graphics, Sprite } from 'pixi.js';
import type { ShaftState } from '../state/GameState';
import { minerCycleStart } from '../sim/ShaftSystem';
import type { ShaftCycleConfig } from '../data/config';
import { PlaceholderMinerView, type MinerPose } from './CharacterView';
import { PALETTE, shade } from './colors';
import { rowTop, type WorldLayout } from './layout';
import type { PlaceholderArt } from './placeholders/PlaceholderArt';

const INK = PALETTE.ink;
const MAX_MINERS = 8;

export interface ShaftVisualParams {
  rockColor: number;
  oreColor: number;
  oreGlint: number;
  /** 0..1 how "rich" the vein looks (deeper inside an ore band = more glints). */
  richness: number;
}

export interface ShaftFrame {
  shaft: ShaftState;
  minerCount: number;
  cycleMs: number;
  cycle: ShaftCycleConfig;
  /** Crate fill 0..1 for the ore pile. */
  crateFill: number;
  time: number;
  reducedMotion: boolean;
}

export class ShaftView {
  readonly container = new Container();
  private readonly back = new Graphics();
  private readonly veinLayer = new Container();
  private readonly crate: Sprite;
  private readonly pile: Sprite;
  private readonly lamp: Sprite;
  private readonly minerLayer = new Container();
  private readonly miners: PlaceholderMinerView[] = [];
  private readonly sparks: Sprite[] = [];
  private readonly glints: Sprite[] = [];
  private width = 0;
  private params: ShaftVisualParams | null = null;

  constructor(
    private readonly art: PlaceholderArt,
    readonly index: number,
  ) {
    this.crate = new Sprite(art.get('crate'));
    this.crate.anchor.set(0, 1);
    this.pile = new Sprite(art.get('pile'));
    this.pile.anchor.set(0.5, 1);
    this.lamp = new Sprite(art.get('lamp'));
    this.lamp.anchor.set(0.5, 0);
    this.container.addChild(
      this.back,
      this.veinLayer,
      this.lamp,
      this.pile,
      this.crate,
      this.minerLayer,
    );
  }

  layout(layout: WorldLayout, params: ShaftVisualParams): void {
    this.container.y = rowTop(layout, this.index);
    if (this.width === layout.width && this.params === params) return;
    this.width = layout.width;
    this.params = params;
    this.drawBack(layout, params);
    this.buildVein(layout, params);
    const floor = layout.floorOffset;
    this.crate.position.set(layout.crateX, floor);
    this.pile.position.set(layout.crateX + layout.crateWidth / 2, floor - layout.crateHeight + 9);
    this.pile.tint = params.oreColor;
    this.lamp.position.set(
      layout.walkStartX + (layout.faceX - layout.walkStartX) * 0.45,
      layout.tunnelTop + 4,
    );
  }

  private drawBack(l: WorldLayout, p: ShaftVisualParams): void {
    const g = this.back.clear();
    const W = l.width;
    const top = l.tunnelTop;
    const floor = l.floorOffset;
    const rock = p.rockColor;
    const tunnel = shade(rock, -0.38);

    // Rock band (whole row) with speckles.
    g.rect(0, 0, W, l.rowHeight).fill(rock);
    for (let i = 0; i < 26; i++) {
      const x = (i * 71 + this.index * 37) % W;
      const y = (i * 29 + this.index * 13) % l.rowHeight;
      g.ellipse(x, y, 3 + (i % 3), 2 + (i % 2)).fill(shade(rock, i % 2 === 0 ? -0.12 : 0.1));
    }
    // Tunnel interior.
    const tx = l.columnX + l.columnWidth;
    g.roundRect(tx, top, W - tx - 30, floor - top, 10).fill(tunnel);
    g.rect(tx, top + 6, 40, floor - top - 6).fill(tunnel);
    g.roundRect(tx, top, W - tx - 30, 10, 6).fill(shade(tunnel, -0.15));
    // Floor planks.
    g.rect(tx, floor - 3, W - tx - 34, 7)
      .fill(shade(PALETTE.wood, -0.1))
      .stroke({ width: 1.5, color: INK });
    // Timber supports.
    for (let x = tx + 70; x < W - 70; x += 92) {
      g.rect(x, top + 4, 7, floor - top - 6)
        .fill(PALETTE.wood)
        .stroke({ width: 1.5, color: INK });
      g.rect(x - 10, top + 2, 27, 7)
        .fill(PALETTE.woodDark)
        .stroke({ width: 1.5, color: INK });
    }
    // Rock face at the end of the tunnel.
    g.moveTo(W - 46, top + 4)
      .quadraticCurveTo(W - 26, top + 30, W - 40, top + 52)
      .quadraticCurveTo(W - 22, top + 76, W - 38, floor)
      .lineTo(W, floor)
      .lineTo(W, top)
      .closePath()
      .fill(shade(rock, -0.1))
      .stroke({ width: 2, color: shade(rock, -0.45) });

    // Elevator column segment + landing.
    const cx = l.columnX;
    const cw = l.columnWidth;
    g.rect(cx, 0, cw, l.rowHeight).fill(0x1f1d29);
    g.rect(cx + 4, 0, 3, l.rowHeight).fill(PALETTE.woodDark);
    g.rect(cx + cw - 7, 0, 3, l.rowHeight).fill(PALETTE.woodDark);
    for (let y = 10; y < l.rowHeight; y += 30) {
      g.rect(cx + 2, y, cw - 4, 3).fill({ color: PALETTE.woodDark, alpha: 0.7 });
    }
    g.rect(cx + cw - 6, floor - 2, 18, 6)
      .fill(PALETTE.wood)
      .stroke({ width: 1.5, color: INK });
    // Shaft number plate.
    g.roundRect(cx + cw + 2, top + 2, 4, 26, 2).fill(shade(rock, -0.5));
  }

  private buildVein(l: WorldLayout, p: ShaftVisualParams): void {
    this.veinLayer.removeChildren().forEach((c) => c.destroy());
    this.glints.length = 0;
    const W = l.width;
    const chunk = this.art.get('ore.chunk');
    const count = 6 + Math.round(p.richness * 4);
    for (let i = 0; i < count; i++) {
      const s = new Sprite(chunk);
      s.anchor.set(0.5);
      s.tint = p.oreColor;
      const fx = W - 30 + ((i * 11) % 22) - 8;
      const fy = l.tunnelTop + 14 + ((i * 23) % (l.floorOffset - l.tunnelTop - 22));
      s.position.set(fx, fy);
      s.rotation = (i * 1.7) % Math.PI;
      s.scale.set(0.8 + ((i * 7) % 5) / 10);
      this.veinLayer.addChild(s);
    }
    const glintCount = 1 + Math.round(p.richness * 3);
    for (let i = 0; i < glintCount; i++) {
      const glint = new Sprite(this.art.get('glint'));
      glint.anchor.set(0.5);
      glint.tint = p.oreGlint;
      glint.position.set(W - 24 - ((i * 13) % 20), l.tunnelTop + 20 + ((i * 31) % 60));
      this.veinLayer.addChild(glint);
      this.glints.push(glint);
    }
  }

  private ensureMiners(count: number): void {
    while (this.miners.length < Math.min(count, MAX_MINERS)) {
      const miner = new PlaceholderMinerView(this.art, this.miners.length * 0.37 + this.index);
      this.miners.push(miner);
      this.minerLayer.addChild(miner.container);
      const spark = new Sprite(this.art.get('glint'));
      spark.anchor.set(0.5);
      spark.visible = false;
      this.sparks.push(spark);
      this.minerLayer.addChild(spark);
    }
    this.miners.forEach((m, j) => {
      m.container.visible = j < count;
    });
  }

  update(frame: ShaftFrame, layout: WorldLayout): void {
    const { shaft, minerCount, cycleMs, cycle, time } = frame;
    this.ensureMiners(minerCount);
    const floor = layout.floorOffset;
    const walkMs = cycle.walkSec * 1000;
    const digMs = cycle.digSec * 1000;

    for (let j = 0; j < minerCount && j < this.miners.length; j++) {
      const miner = this.miners[j];
      const spark = this.sparks[j];
      if (!miner || !spark) continue;
      const homeX = layout.walkStartX + 6 + j * 9;
      const faceX = layout.faceX - 14 - ((j * 13) % 40);
      const start = minerCycleStart(shaft, j, time, cycleMs);
      let pose: MinerPose = 'idle';
      let x = homeX;
      let progress = 0;
      let facing: 1 | -1 = 1;
      if (start !== null) {
        const local = time - start;
        if (local < walkMs) {
          pose = 'walk';
          progress = local / walkMs;
          x = homeX + (faceX - homeX) * progress;
        } else if (local < walkMs + digMs) {
          pose = 'dig';
          progress = (local - walkMs) / digMs;
          x = faceX;
        } else if (local < 2 * walkMs + digMs) {
          pose = 'carry';
          progress = (local - walkMs - digMs) / walkMs;
          x = faceX + (homeX - faceX) * progress;
          facing = -1;
        } else {
          pose = 'dump';
          progress = Math.min(1, (local - 2 * walkMs - digMs) / (cycle.dumpSec * 1000));
          x = homeX;
          facing = -1;
        }
      }
      miner.container.position.set(x, floor);
      miner.setFacing(facing);
      miner.setPose(pose, progress, time);
      const impact =
        pose === 'dig' && PlaceholderMinerView.isImpact(progress) && !frame.reducedMotion;
      spark.visible = impact;
      if (impact) {
        spark.position.set(faceX + 24, floor - 18);
        spark.tint = this.params?.oreGlint ?? 0xffffff;
        spark.scale.set(0.9 + Math.random() * 0.5);
      }
    }

    // Crate pile.
    this.pile.visible = frame.crateFill > 0;
    this.pile.scale.set(0.7 + 0.3 * frame.crateFill, 0.35 + 0.75 * frame.crateFill);

    // Twinkling vein.
    if (!frame.reducedMotion) {
      this.glints.forEach((g, i) => {
        const tw = Math.sin(time / 380 + i * 2.1 + this.index);
        g.alpha = Math.max(0, tw);
        g.scale.set(0.6 + Math.max(0, tw) * 0.6);
      });
    }
    this.lamp.rotation = frame.reducedMotion ? 0 : Math.sin(time / 900 + this.index) * 0.05;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
