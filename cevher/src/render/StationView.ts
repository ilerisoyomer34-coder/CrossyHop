/**
 * Transfer station (aktarma istasyonu) between two elevator zones: a rock band with the shaft column
 * running through it, the upper landing where the elevator above collects, the winch the deeper
 * elevator hangs from, and an ore pile that grows with the station's stock.
 */
import { Container, Graphics, Sprite } from 'pixi.js';
import { PALETTE, shade } from './colors';
import { stationTop, type WorldLayout } from './layout';
import type { PlaceholderArt } from './placeholders/PlaceholderArt';

const INK = PALETTE.ink;

export class StationView {
  readonly container = new Container();
  private readonly g = new Graphics();
  private readonly winch = new Graphics();
  private readonly pile: Sprite;
  private key = '';
  private winchAngle = 0;

  constructor(
    art: PlaceholderArt,
    readonly station: number,
  ) {
    this.pile = new Sprite(art.get('pile'));
    this.pile.anchor.set(0.5, 1);
    this.container.addChild(this.g, this.pile, this.winch);
  }

  layout(layout: WorldLayout, rockColor: number, oreColor: number): void {
    this.container.y = stationTop(layout, this.station);
    const key = `${layout.width}|${layout.zoneSize}|${rockColor}|${oreColor}`;
    if (key === this.key) return;
    this.key = key;
    const W = layout.width;
    const H = layout.stationHeight;
    const cx = layout.columnX;
    const cw = layout.columnWidth;
    const upper = layout.stationUpperFloor;
    const rock = shade(rockColor, -0.12);
    const g = this.g.clear();

    // Rock band with a reinforced chamber carved into it.
    g.rect(0, 0, W, H).fill(rock);
    for (let i = 0; i < 18; i++) {
      g.ellipse((i * 53) % W, (i * 29) % H, 3 + (i % 3), 2 + (i % 2)).fill(
        shade(rock, i % 2 ? -0.18 : 0.08),
      );
    }
    const chamberX = cx + cw;
    g.roundRect(chamberX + 2, 8, W - chamberX - 12, upper - 4, 10)
      .fill(shade(rock, -0.35))
      .stroke({ width: 2, color: shade(rock, -0.55) });
    // Steel arches.
    for (let x = chamberX + 26; x < W - 20; x += 70) {
      g.rect(x, 10, 6, upper - 6).fill(PALETTE.ironDark);
    }
    g.rect(chamberX + 2, 8, W - chamberX - 12, 6).fill(PALETTE.iron);
    // Landing deck at the upper floor.
    g.rect(chamberX, upper, W - chamberX - 10, 7)
      .fill(PALETTE.wood)
      .stroke({ width: 1.5, color: INK });
    // Hazard stripes on the landing edge.
    for (let x = chamberX + 4; x < chamberX + 44; x += 10) {
      g.rect(x, upper + 1, 5, 5).fill(PALETTE.lanternGold);
    }

    // Shaft column through the station, with the winch beam between the two elevators.
    g.rect(cx, 0, cw, H).fill(0x1f1d29);
    g.rect(cx + 4, 0, 3, H).fill(PALETTE.woodDark);
    g.rect(cx + cw - 7, 0, 3, H).fill(PALETTE.woodDark);
    g.rect(cx - 2, upper + 1, cw + 4, 8)
      .fill(PALETTE.ironDark)
      .stroke({ width: 1.5, color: INK });

    const w = this.winch.clear();
    w.circle(0, 0, 9).fill(PALETTE.ironDark).stroke({ width: 2, color: INK });
    w.circle(0, 0, 6).fill(PALETTE.iron);
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI) / 3;
      w.moveTo(Math.cos(a) * -6, Math.sin(a) * -6)
        .lineTo(Math.cos(a) * 6, Math.sin(a) * 6)
        .stroke({ width: 1.6, color: INK });
    }
    w.circle(0, 0, 2).fill(PALETTE.brass);
    this.winch.position.set(cx + cw / 2, upper + 5);

    this.pile.position.set(chamberX + 70, upper);
    this.pile.tint = oreColor;
  }

  /** `fill` 0..1 sizes the ore pile; `spin` turns the winch with the elevator below. */
  update(fill: number, spin: number, reducedMotion: boolean): void {
    this.pile.visible = fill > 0;
    this.pile.width = 40 + 40 * fill;
    this.pile.height = 10 + 22 * fill;
    if (!reducedMotion) this.winchAngle += spin;
    this.winch.rotation = this.winchAngle;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
