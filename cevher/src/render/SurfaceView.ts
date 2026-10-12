/**
 * Surface scene (yüzey): sky, misty Black-Sea-style hills with tea terraces, the headframe above
 * the shaft, the shaft-head depot, rails to the warehouse, and Defne + Kösti.
 * Static art is drawn once per layout; only clouds, fog, the characters and the depot pile move.
 */
import { Container, FillGradient, Graphics, Sprite } from 'pixi.js';
import type { RegionDef } from '../data/config';
import { hexToNumber, PALETTE, shade } from './colors';
import type { WorldLayout } from './layout';
import type { PlaceholderArt } from './placeholders/PlaceholderArt';

const INK = PALETTE.ink;

export class SurfaceView {
  readonly container = new Container();
  private readonly back = new Graphics();
  private readonly clouds = new Container();
  private readonly fog = new Container();
  private readonly front = new Graphics();
  private readonly defne: Sprite;
  private readonly kosti: Sprite;
  private readonly depotPile: Sprite;
  private width = 0;

  constructor(
    private readonly art: PlaceholderArt,
    private readonly region: RegionDef,
  ) {
    this.defne = new Sprite(art.get('defne'));
    this.defne.anchor.set(0.5, 1);
    this.kosti = new Sprite(art.get('kosti'));
    this.kosti.anchor.set(0.5, 1);
    this.depotPile = new Sprite(art.get('pile'));
    this.depotPile.anchor.set(0.5, 1);
    this.depotPile.tint = 0x3a3640;
    this.container.addChild(
      this.back,
      this.clouds,
      this.fog,
      this.defne,
      this.kosti,
      this.front,
      this.depotPile,
    );
  }

  layout(layout: WorldLayout): void {
    if (layout.width === this.width) return;
    this.width = layout.width;
    this.drawBack(layout);
    this.drawFront(layout);
    this.buildClouds(layout);
    this.defne.position.set(
      layout.railStartX + (layout.railEndX - layout.railStartX) * 0.66,
      layout.groundY - 24,
    );
    this.kosti.position.set(this.defne.x + 36, layout.groundY - 22);
    this.depotPile.position.set(layout.depotX + layout.depotWidth / 2, layout.groundY - 22);
  }

  private drawBack(l: WorldLayout): void {
    const p = this.region.palette;
    const g = this.back.clear();
    const W = l.width;
    // Sky (extends above the world for pull-down overscroll).
    const sky = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: hexToNumber(p.skyTop) },
        { offset: 0.75, color: hexToNumber(p.sky) },
        { offset: 1, color: hexToNumber(p.fog) },
      ],
      textureSpace: 'local',
    });
    g.rect(0, -600, W, 600 + l.groundY).fill(sky);
    g.circle(W * 0.78, 44, 26).fill({ color: 0xfff6d8, alpha: 0.55 });
    g.circle(W * 0.78, 44, 18).fill({ color: 0xfffbea, alpha: 0.8 });

    // Far hills.
    const far = hexToNumber(p.hillFar);
    g.moveTo(0, 150);
    for (let x = 0; x <= W; x += W / 6) {
      g.quadraticCurveTo(x + W / 12, 96 + ((x * 7) % 30), x + W / 6, 140 + ((x * 3) % 18));
    }
    g.lineTo(W, l.groundY).lineTo(0, l.groundY).closePath().fill(far);

    // Mid hill with tea terraces.
    const mid = hexToNumber(p.hillMid);
    const terrace = hexToNumber(p.terrace);
    g.moveTo(0, 196)
      .bezierCurveTo(W * 0.2, 128, W * 0.42, 132, W * 0.62, 176)
      .bezierCurveTo(W * 0.78, 206, W * 0.9, 168, W, 158)
      .lineTo(W, l.groundY)
      .lineTo(0, l.groundY)
      .closePath()
      .fill(mid);
    for (let row = 0; row < 6; row++) {
      const y = 164 + row * 11;
      g.moveTo(W * 0.1 + row * 6, y)
        .quadraticCurveTo(W * 0.32, y - 16 + row * 2, W * 0.58 - row * 4, y + 4)
        .stroke({ width: 3, color: terrace, alpha: 0.9 });
    }
    // Tea house on the hill (a nod to the region).
    const hx = W * 0.3;
    g.rect(hx, 140, 22, 14).fill(PALETTE.paper).stroke({ width: 1.5, color: INK });
    g.moveTo(hx - 4, 141)
      .lineTo(hx + 11, 131)
      .lineTo(hx + 26, 141)
      .closePath()
      .fill(PALETTE.rust)
      .stroke({ width: 1.5, color: INK });
    g.rect(hx + 8, 146, 6, 8).fill(PALETTE.woodDark);

    // Near hill + ground.
    const near = hexToNumber(p.hillNear);
    g.moveTo(0, 214)
      .quadraticCurveTo(W * 0.25, 192, W * 0.5, 210)
      .quadraticCurveTo(W * 0.75, 226, W, 204)
      .lineTo(W, l.groundY)
      .lineTo(0, l.groundY)
      .closePath()
      .fill(near);
    for (let i = 0; i < 9; i++) {
      const x = ((i * 97) % W) + 6;
      const y = 206 + ((i * 13) % 18);
      g.ellipse(x, y, 9, 6)
        .fill(shade(near, -0.12))
        .stroke({ width: 1.2, color: shade(near, -0.35) });
    }
  }

  private drawFront(l: WorldLayout): void {
    const p = this.region.palette;
    const g = this.front.clear();
    const W = l.width;
    const ground = l.groundY;
    const grass = hexToNumber(p.grass);
    const soil = hexToNumber(p.soil);

    // Ground band and soil down to the first shaft row.
    g.rect(0, ground, W, l.surfaceHeight - ground).fill(soil);
    g.rect(0, ground - 4, W, 8).fill(grass);
    for (let x = 4; x < W; x += 9) {
      g.moveTo(x, ground - 2)
        .lineTo(x + 2, ground - 9)
        .lineTo(x + 4, ground - 2)
        .fill(shade(grass, 0.12));
    }
    g.moveTo(0, ground + 4)
      .lineTo(W, ground + 4)
      .stroke({ width: 2, color: shade(soil, -0.35) });
    for (let i = 0; i < 14; i++) {
      const x = (i * 53) % W;
      g.ellipse(x + 10, ground + 22 + ((i * 17) % 34), 6, 3).fill(shade(soil, -0.18));
    }

    // Headframe (kuyu kulesi) above the elevator column.
    const cx = l.columnX;
    const cw = l.columnWidth;
    const wood = hexToNumber(p.wood);
    const woodDark = hexToNumber(p.woodDark);
    g.moveTo(cx + 2, ground)
      .lineTo(cx + cw / 2 - 5, l.headframeTop)
      .lineTo(cx + cw / 2 + 5, l.headframeTop)
      .lineTo(cx + cw - 2, ground);
    g.stroke({ width: 5, color: INK, join: 'round' });
    g.moveTo(cx + 2, ground)
      .lineTo(cx + cw / 2 - 5, l.headframeTop)
      .lineTo(cx + cw / 2 + 5, l.headframeTop)
      .lineTo(cx + cw - 2, ground);
    g.stroke({ width: 3, color: wood, join: 'round' });
    for (let k = 1; k < 4; k++) {
      const y = l.headframeTop + ((ground - l.headframeTop) * k) / 4;
      const inset = ((cw / 2 - 6) * (4 - k)) / 4;
      g.moveTo(cx + 4 + inset, y)
        .lineTo(cx + cw - 4 - inset, y)
        .stroke({ width: 3, color: woodDark });
    }
    g.roundRect(cx + cw / 2 - 12, l.headframeTop - 6, 24, 10, 3)
      .fill(woodDark)
      .stroke({ width: 2, color: INK });
    // Shaft mouth.
    g.rect(cx, ground - 2, cw, l.surfaceHeight - ground + 2).fill(0x1f1d29);
    g.rect(cx, ground - 4, cw, 5).fill(woodDark);

    // Depot (kuyu ağzı deposu): wooden bin with a chute.
    const dx = l.depotX;
    const dw = l.depotWidth;
    g.moveTo(cx + cw - 2, ground - 44)
      .lineTo(dx + 8, ground - 30)
      .stroke({ width: 5, color: INK });
    g.moveTo(cx + cw - 2, ground - 44)
      .lineTo(dx + 8, ground - 30)
      .stroke({ width: 3, color: PALETTE.iron });
    g.roundRect(dx, ground - 30, dw, 30, 4)
      .fill(wood)
      .stroke({ width: 2, color: INK });
    g.moveTo(dx + 2, ground - 20)
      .lineTo(dx + dw - 2, ground - 20)
      .stroke({ width: 1.2, color: woodDark });
    g.moveTo(dx + 2, ground - 10)
      .lineTo(dx + dw - 2, ground - 10)
      .stroke({ width: 1.2, color: woodDark });

    // Rails.
    const rx0 = l.railStartX - 18;
    const rx1 = l.warehouseX + 18;
    g.rect(rx0, ground - 1, rx1 - rx0, 3).fill(PALETTE.ironDark);
    for (let x = rx0; x < rx1; x += 14) g.rect(x, ground + 1, 8, 4).fill(woodDark);

    // Warehouse (ambar).
    const wx = l.warehouseX;
    const ww = l.warehouseWidth;
    const wallTop = ground - 66;
    g.rect(wx, wallTop, ww, 66).fill(0xb5603c).stroke({ width: 2, color: INK });
    for (let x = wx + 8; x < wx + ww; x += 10) {
      g.moveTo(x, wallTop + 2)
        .lineTo(x, ground - 1)
        .stroke({ width: 1, color: shade(0xb5603c, -0.2) });
    }
    g.moveTo(wx - 8, wallTop + 2)
      .lineTo(wx + ww / 2, wallTop - 30)
      .lineTo(wx + ww + 8, wallTop + 2)
      .closePath();
    g.fill(0x7a3b2e).stroke({ width: 2, color: INK });
    // The warehouse sign itself is a DOM label (fits any translation).
    g.roundRect(wx + 10, ground - 42, ww - 20, 42, 3)
      .fill(0x4a2a22)
      .stroke({ width: 2, color: INK });
    g.moveTo(wx + 10, ground - 42)
      .lineTo(wx + ww - 10, ground)
      .stroke({ width: 2, color: shade(0x4a2a22, 0.25) });
    g.moveTo(wx + ww - 10, ground - 42)
      .lineTo(wx + 10, ground)
      .stroke({ width: 2, color: shade(0x4a2a22, 0.25) });
  }

  private buildClouds(l: WorldLayout): void {
    this.clouds.removeChildren().forEach((c) => c.destroy());
    this.fog.removeChildren().forEach((c) => c.destroy());
    const tex = this.art.get('circle');
    for (let i = 0; i < 4; i++) {
      const cloud = new Container();
      for (let k = 0; k < 4; k++) {
        const puff = new Sprite(tex);
        puff.anchor.set(0.5);
        const r = 12 + ((k * 7 + i * 3) % 9);
        puff.width = r * 2;
        puff.height = r * 1.7;
        puff.position.set(k * 14 - 20, ((k * 5) % 7) - 3);
        cloud.addChild(puff);
      }
      cloud.alpha = 0.85;
      cloud.position.set((i * l.width) / 3.2 + 30, 26 + i * 17);
      this.clouds.addChild(cloud);
    }
    const soft = this.art.get('softCircle');
    for (let i = 0; i < 5; i++) {
      const band = new Sprite(soft);
      band.anchor.set(0.5);
      band.width = l.width * 0.7;
      band.height = 46;
      band.alpha = 0.55;
      band.tint = hexToNumber(this.region.palette.fog);
      band.position.set((i * l.width) / 4, 150 + (i % 2) * 22);
      this.fog.addChild(band);
    }
  }

  update(time: number, depotFill: number, reducedMotion: boolean): void {
    const t = reducedMotion ? 0 : time / 1000;
    const W = this.width;
    this.clouds.children.forEach((cloud, i) => {
      cloud.x = (((((i * W) / 3.2 + 30 + t * (4 + i)) % (W + 120)) + W + 120) % (W + 120)) - 60;
    });
    this.fog.children.forEach((band, i) => {
      band.x = (((i * W) / 4 + Math.sin(t * 0.15 + i) * 30 + W) % (W + 200)) - 100;
    });
    this.defne.scale.y = 1 + Math.sin(t * 2) * 0.012;
    this.kosti.scale.y = 1 + Math.sin(t * 2.6 + 1) * 0.03;
    this.kosti.rotation = Math.sin(t * 1.3) * 0.04;
    this.depotPile.visible = depotFill > 0;
    const s = 0.45 + 0.55 * depotFill;
    this.depotPile.scale.set(0.9 + 0.1 * depotFill, s);
  }
}
