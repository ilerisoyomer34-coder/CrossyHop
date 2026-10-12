/**
 * Pixi scene for one mine (cross-section diorama). Reads the immutable game state and draws it;
 * never mutates it. The renderer runs one simulation step behind and derives every position from
 * absolute phase times, which gives smooth 60 fps motion from a 20 Hz simulation.
 */
import { Application, Container } from 'pixi.js';
import { Decimal, dmin } from '../core/BigNum';
import type { GameState, MineState } from '../state/GameState';
import { getMine } from '../state/update';
import { quoteUnlock } from '../state/selectors';
import { mineDef, oreForShaft, regionDef, type GameConfig } from '../sim/GameConfig';
import { BottomView } from './BottomView';
import { hexToNumber, PALETTE, sampleGradient } from './colors';
import { ElevatorView } from './ElevatorView';
import { bottomRowTop, rowTop, type WorldLayout } from './layout';
import { LogisticsView } from './LogisticsView';
import { PlaceholderArt } from './placeholders/PlaceholderArt';
import { ShaftView, type ShaftVisualParams } from './ShaftView';
import { SurfaceView } from './SurfaceView';

export interface SceneOptions {
  host: HTMLElement;
  cfg: GameConfig;
  mineId: string;
  maxResolution: number;
  cullMarginPx: number;
  antialias: boolean;
}

export class MineScene {
  readonly world = new Container();
  private readonly art: PlaceholderArt;
  private readonly surface: SurfaceView;
  private readonly elevator: ElevatorView;
  private readonly logistics: LogisticsView;
  private readonly bottom: BottomView;
  private readonly shaftLayer = new Container();
  private readonly shafts: ShaftView[] = [];
  private layoutRef: WorldLayout | null = null;
  private readonly visualParams: ShaftVisualParams[] = [];

  private constructor(
    readonly app: Application,
    private readonly opts: SceneOptions,
  ) {
    this.art = new PlaceholderArt(app.renderer, 2);
    this.art.warmUp();
    const mine = mineDef(opts.cfg, opts.mineId);
    const region = regionDef(opts.cfg, mine.regionId);
    this.surface = new SurfaceView(this.art, region);
    this.elevator = new ElevatorView(this.art);
    this.logistics = new LogisticsView(this.art);
    this.bottom = new BottomView(this.art);
    this.world.addChild(
      this.surface.container,
      this.shaftLayer,
      this.bottom.container,
      this.logistics.container,
      this.elevator.container,
    );
    app.stage.addChild(this.world);

    // Visual parameters per shaft number (depth gradient + ore band richness).
    const depthStops = region.depthGradient;
    for (let n = 1; n <= mine.shaftCount; n++) {
      const ore = oreForShaft(mine, n);
      const visual = region.ores[ore];
      const band = mine.oreBands.filter((b) => b.ore === ore).at(-1);
      const next = mine.oreBands.find((b) => b.fromShaft > n);
      const from = band?.fromShaft ?? 1;
      const to = (next?.fromShaft ?? mine.shaftCount + 1) - 1;
      this.visualParams.push({
        rockColor: sampleGradient(
          depthStops,
          mine.shaftCount > 1 ? (n - 1) / (mine.shaftCount - 1) : 0,
        ),
        oreColor: hexToNumber(visual?.color ?? '#555555'),
        oreGlint: hexToNumber(visual?.glint ?? '#ffffff'),
        richness: to > from ? (n - from) / (to - from) : 0.5,
      });
    }
  }

  static async create(opts: SceneOptions): Promise<MineScene> {
    const app = new Application();
    const width = Math.max(1, opts.host.clientWidth);
    const height = Math.max(1, opts.host.clientHeight);
    await app.init({
      width,
      height,
      background: PALETTE.deepRock,
      antialias: opts.antialias,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, opts.maxResolution),
      preference: 'webgl',
      autoStart: false,
      sharedTicker: false,
      powerPreference: 'high-performance',
    });
    app.ticker.stop();
    app.canvas.setAttribute('aria-hidden', 'true');
    app.canvas.classList.add('mine-canvas');
    opts.host.appendChild(app.canvas);
    return new MineScene(app, opts);
  }

  resize(width: number, height: number): void {
    this.app.renderer.resize(Math.max(1, width), Math.max(1, height));
  }

  private sync(mine: MineState, layout: WorldLayout, state: GameState): void {
    const layoutChanged = layout !== this.layoutRef;
    this.layoutRef = layout;
    while (this.shafts.length < mine.shafts.length) {
      const view = new ShaftView(this.art, this.shafts.length);
      this.shafts.push(view);
      this.shaftLayer.addChild(view.container);
    }
    while (this.shafts.length > mine.shafts.length) this.shafts.pop()?.destroy();
    if (layoutChanged) {
      this.surface.layout(layout);
      this.elevator.layout(layout);
    }
    this.shafts.forEach((view, i) => {
      const params = this.visualParams[i] ?? this.visualParams[this.visualParams.length - 1];
      if (params) view.layout(layout, params);
    });
    const status = quoteUnlock(state, mine.id, this.opts.cfg).status;
    const nextParams =
      this.visualParams[Math.min(mine.shafts.length, this.visualParams.length - 1)];
    this.bottom.layout(layout, status, nextParams?.rockColor ?? PALETTE.slate);
  }

  /**
   * Draws the mine at simulation time `time` with the world scrolled by `scrollY` CSS pixels.
   */
  render(
    state: GameState,
    layout: WorldLayout,
    time: number,
    scrollY: number,
    reducedMotion: boolean,
  ): void {
    const mine = getMine(state, this.opts.mineId);
    this.sync(mine, layout, state);
    const cfg = this.opts.cfg;
    const eco = cfg.economy;
    const scale = layout.scale;
    this.world.scale.set(scale);
    this.world.position.set(0, -scrollY);

    const viewTop = (scrollY - this.opts.cullMarginPx) / scale;
    const viewBottom = (scrollY + layout.viewHeight + this.opts.cullMarginPx) / scale;
    const mineScale = mineDef(cfg, mine.id).mineScale;

    // Surface.
    const surfaceVisible = viewTop < layout.surfaceHeight;
    this.surface.container.visible = surfaceVisible;
    if (surfaceVisible) {
      const perCycle = eco
        .logisticsFlow(mine.logistics.level, mineScale)
        .mul(eco.logisticsCycleMs() / 1000);
      this.surface.update(time, fillRatio(mine.surfaceStock, perCycle), reducedMotion);
    }

    // Shaft rows (culled).
    const cycleMs = eco.shaftCycleMs();
    mine.shafts.forEach((shaft, i) => {
      const view = this.shafts[i];
      if (!view) return;
      const top = rowTop(layout, i);
      const visible = top + layout.rowHeight > viewTop && top < viewBottom;
      view.container.visible = visible;
      if (!visible) return;
      const perCycle = eco.shaftProduction(i + 1, shaft.level, mineScale).mul(cycleMs / 1000);
      view.update(
        {
          shaft,
          minerCount: eco.minerCount(shaft.level),
          cycleMs,
          cycle: cfg.econ.shaft.cycle,
          crateFill: fillRatio(shaft.stored, perCycle.mul(3)),
          time,
          reducedMotion,
        },
        layout,
      );
    });

    const bottomTop = bottomRowTop(layout);
    this.bottom.container.visible = bottomTop < viewBottom;
    this.bottom.update(time, reducedMotion);

    const capacity = eco.elevatorCapacity(mine.elevator.level, mineScale);
    this.elevator.update(
      mine.elevator.phase,
      time,
      layout,
      fillRatio(mine.elevator.load, capacity),
      reducedMotion,
    );
    this.logistics.container.visible = surfaceVisible;
    if (surfaceVisible) this.logistics.update(mine.logistics.carriers, time, layout);

    this.app.renderer.render(this.app.stage);
  }

  destroy(): void {
    this.art.destroy();
    this.app.destroy(true, { children: true });
  }
}

/** 0 when empty, otherwise 0.15..1 growing with the amount relative to `reference`. */
function fillRatio(amount: Decimal, reference: Decimal): number {
  if (amount.lte(0)) return 0;
  if (reference.lte(0)) return 1;
  const r = dmin(amount.div(reference), new Decimal(1)).toNumber();
  return 0.15 + 0.85 * r;
}
