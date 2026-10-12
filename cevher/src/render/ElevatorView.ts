/** Elevator cage, cable and headframe pulley; position is derived from the elevator phase. */
import { Container, Graphics, Sprite } from 'pixi.js';
import type { ElevatorPhase } from '../state/GameState';
import { PALETTE, shade } from './colors';
import { elevatorStopY, type WorldLayout } from './layout';
import { easeInOut, PhaseTracker, phaseProgress } from './PhaseTracker';
import type { PlaceholderArt } from './placeholders/PlaceholderArt';

const INK = PALETTE.ink;

export class ElevatorView {
  readonly container = new Container();
  private readonly cable: Sprite;
  private readonly cage = new Container();
  private readonly cageFrame = new Graphics();
  private readonly operator: Sprite;
  private readonly ore: Sprite;
  private readonly pulley = new Graphics();
  private readonly tracker = new PhaseTracker<ElevatorPhase>();
  private lastY = 0;
  private pulleyAngle = 0;
  private layoutRef: WorldLayout | null = null;

  constructor(art: PlaceholderArt) {
    this.cable = new Sprite(art.get('px'));
    this.cable.tint = 0x2b2b30;
    this.operator = new Sprite(art.get('operator'));
    this.operator.anchor.set(0.5, 1);
    this.ore = new Sprite(art.get('pile'));
    this.ore.anchor.set(0.5, 1);
    this.ore.tint = 0x3a3640;
    this.cage.addChild(this.ore, this.operator, this.cageFrame);
    this.container.addChild(this.cable, this.cage, this.pulley);
  }

  layout(layout: WorldLayout): void {
    if (this.layoutRef === layout) return;
    this.layoutRef = layout;
    const w = layout.cageWidth;
    const h = layout.cageHeight;
    const g = this.cageFrame.clear();
    // Cage drawn with its bottom-centre at (0,0).
    g.rect(-w / 2, -h, w, 5)
      .fill(PALETTE.ironDark)
      .stroke({ width: 2, color: INK });
    g.rect(-w / 2, -4, w, 5)
      .fill(PALETTE.wood)
      .stroke({ width: 2, color: INK });
    g.rect(-w / 2, -h, 4, h)
      .fill(PALETTE.iron)
      .stroke({ width: 1.5, color: INK });
    g.rect(w / 2 - 4, -h, 4, h)
      .fill(PALETTE.iron)
      .stroke({ width: 1.5, color: INK });
    for (let x = -w / 2 + 10; x < w / 2 - 4; x += 9) {
      g.moveTo(x, -h + 5)
        .lineTo(x, -4)
        .stroke({ width: 1.2, color: shade(PALETTE.iron, -0.2), alpha: 0.9 });
    }
    g.circle(0, -h - 4, 4)
      .fill(PALETTE.brass)
      .stroke({ width: 1.5, color: INK });
    this.operator.position.set(-10, -4);
    this.ore.position.set(8, -4);
    this.ore.width = 28;

    const p = this.pulley.clear();
    p.circle(0, 0, 13).fill(PALETTE.ironDark).stroke({ width: 2, color: INK });
    p.circle(0, 0, 9).fill(PALETTE.iron);
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 4;
      p.moveTo(Math.cos(a) * -9, Math.sin(a) * -9)
        .lineTo(Math.cos(a) * 9, Math.sin(a) * 9)
        .stroke({ width: 2, color: INK });
    }
    p.circle(0, 0, 3).fill(PALETTE.brass);
    this.pulley.position.set(layout.columnX + layout.columnWidth / 2, layout.headframeTop - 1);
  }

  update(
    phase: ElevatorPhase,
    time: number,
    layout: WorldLayout,
    loadFill: number,
    reducedMotion: boolean,
  ): void {
    this.tracker.observe(phase);
    const active = this.tracker.sample(time) ?? phase;
    const fromY = elevatorStopY(layout, active.from);
    const toY = elevatorStopY(layout, active.to);
    let progress = phaseProgress(active, time);
    if (active.kind === 'down' || active.kind === 'up') progress = easeInOut(progress);
    const y = fromY + (toY - fromY) * progress;
    const x = layout.columnX + layout.columnWidth / 2;

    const dy = y - this.lastY;
    this.lastY = y;
    const sway = reducedMotion ? 0 : Math.max(-0.05, Math.min(0.05, dy * 0.004));
    this.cage.position.set(x, y);
    this.cage.rotation = sway;
    this.ore.visible = loadFill > 0;
    this.ore.scale.y = 0.4 + 0.6 * loadFill;

    const cableTop = layout.headframeTop + 8;
    const cableBottom = y - layout.cageHeight - 6;
    this.cable.position.set(x - 1, cableTop);
    this.cable.width = 2;
    this.cable.height = Math.max(0, cableBottom - cableTop);

    if (!reducedMotion) this.pulleyAngle += dy * 0.08;
    this.pulley.rotation = this.pulleyAngle;
  }

  /** Current cage y (logical) for overlays. */
  get cageY(): number {
    return this.lastY;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
