/**
 * The rock below the deepest open shaft: undug rock with the outline of the next tunnel, a rock
 * barrier (kaya engeli) with dynamite while it is being blasted, or bedrock at the mine's bottom.
 */
import { Container, Graphics, Sprite } from 'pixi.js';
import type { UnlockStatus } from '../state/selectors';
import { PALETTE, shade } from './colors';
import { bottomRowTop, type WorldLayout } from './layout';
import type { PlaceholderArt } from './placeholders/PlaceholderArt';

const INK = PALETTE.ink;

export class BottomView {
  readonly container = new Container();
  private readonly g = new Graphics();
  private readonly fuse: Sprite;
  private key = '';

  constructor(art: PlaceholderArt) {
    this.fuse = new Sprite(art.get('glint'));
    this.fuse.anchor.set(0.5);
    this.fuse.tint = 0xffd166;
    this.container.addChild(this.g, this.fuse);
  }

  layout(layout: WorldLayout, status: UnlockStatus, rockColor: number): void {
    this.container.y = bottomRowTop(layout);
    const key = `${layout.width}|${layout.shaftCount}|${status}|${rockColor}`;
    if (key === this.key) return;
    this.key = key;
    const g = this.g.clear();
    const W = layout.width;
    // Rock continues far below so tall screens never show an empty background.
    const H = layout.bottomRowHeight + 1600;
    const rock = status === 'maxReached' ? shade(rockColor, -0.35) : rockColor;
    g.rect(0, 0, W, H).fill(rock);
    for (let i = 0; i < 40; i++) {
      const x = (i * 61) % W;
      const y = (i * 37) % H;
      g.ellipse(x, y, 4 + (i % 4), 2 + (i % 3)).fill(shade(rock, i % 2 ? -0.15 : 0.08));
    }
    // Continue the elevator column a little as dark rock.
    g.rect(layout.columnX, 0, layout.columnWidth, 18).fill(shade(rock, -0.4));

    if (status === 'available') {
      const tx = layout.columnX + layout.columnWidth;
      g.roundRect(tx + 4, 18, W - tx - 40, 92, 10).stroke({
        width: 2,
        color: shade(rock, 0.25),
        alpha: 0.7,
      });
    } else if (status === 'barrier' || status === 'blasting') {
      // Big cracked boulders blocking the way down.
      const boulders: [number, number, number, number][] = [
        [W * 0.2, 54, 46, 34],
        [W * 0.45, 46, 54, 40],
        [W * 0.72, 56, 48, 34],
        [W * 0.33, 96, 40, 26],
        [W * 0.6, 98, 44, 28],
      ];
      for (const [x, y, rx, ry] of boulders) {
        g.ellipse(x, y, rx, ry).fill(shade(rock, 0.12)).stroke({ width: 2, color: INK });
        g.moveTo(x - rx * 0.4, y - ry * 0.3)
          .lineTo(x - rx * 0.05, y + ry * 0.1)
          .lineTo(x + rx * 0.3, y - ry * 0.2);
        g.stroke({ width: 1.5, color: shade(rock, -0.45) });
      }
      if (status === 'blasting') {
        for (let k = 0; k < 3; k++) {
          const x = W * 0.38 + k * 16;
          g.roundRect(x, 34, 9, 30, 3).fill(PALETTE.rust).stroke({ width: 1.5, color: INK });
          g.rect(x, 40, 9, 3).fill(PALETTE.paper);
        }
        g.moveTo(W * 0.38 + 20, 34).quadraticCurveTo(W * 0.38 + 30, 14, W * 0.38 + 48, 20);
        g.stroke({ width: 1.5, color: INK });
      }
    } else {
      // Bedrock hatching.
      for (let x = -H; x < W; x += 14) {
        g.moveTo(x, H)
          .lineTo(x + H, 0)
          .stroke({ width: 2, color: shade(rock, -0.2), alpha: 0.6 });
      }
    }
    this.fuse.visible = status === 'blasting';
    this.fuse.position.set(W * 0.38 + 48, 20);
  }

  update(time: number, reducedMotion: boolean): void {
    if (!this.fuse.visible) return;
    const flicker = reducedMotion ? 1 : 0.7 + Math.abs(Math.sin(time / 70)) * 0.8;
    this.fuse.scale.set(flicker);
    this.fuse.rotation = reducedMotion ? 0 : time / 200;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
