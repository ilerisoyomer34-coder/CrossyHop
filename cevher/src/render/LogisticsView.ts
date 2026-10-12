/** Carriers pushing wagons between the depot and the warehouse. */
import { Container } from 'pixi.js';
import type { CarrierPhase, CarrierState } from '../state/GameState';
import { PlaceholderCarrierView, type CarrierPose } from './CharacterView';
import type { WorldLayout } from './layout';
import { PhaseTracker, phaseProgress } from './PhaseTracker';
import type { PlaceholderArt } from './placeholders/PlaceholderArt';

interface CarrierSlot {
  view: PlaceholderCarrierView;
  tracker: PhaseTracker<CarrierPhase>;
}

export class LogisticsView {
  readonly container = new Container();
  private readonly slots: CarrierSlot[] = [];

  constructor(private readonly art: PlaceholderArt) {}

  private ensure(count: number): void {
    while (this.slots.length < count) {
      const view = new PlaceholderCarrierView(this.art, this.slots.length * 0.53);
      this.slots.push({ view, tracker: new PhaseTracker<CarrierPhase>() });
      // Later carriers walk slightly behind (smaller, dimmer) to suggest depth.
      const lane = this.slots.length - 1;
      view.container.scale.set(1 - (lane % 3) * 0.06);
      view.container.alpha = 1 - (lane % 3) * 0.08;
      this.container.addChildAt(view.container, 0);
    }
  }

  update(carriers: readonly CarrierState[], time: number, layout: WorldLayout): void {
    this.ensure(carriers.length);
    const x0 = layout.railStartX;
    const x1 = layout.railEndX - 34;
    carriers.forEach((carrier, i) => {
      const slot = this.slots[i];
      if (!slot) return;
      slot.tracker.observe(carrier.phase);
      const phase = slot.tracker.sample(time) ?? carrier.phase;
      const p = phaseProgress(phase, time);
      const lane = (i % 3) * 3;
      let x = x0 - lane;
      let pose: CarrierPose = 'idle';
      let facing: 1 | -1 = 1;
      let loaded = false;
      switch (phase.kind) {
        case 'idle':
        case 'wait':
        case 'delay':
          break;
        case 'load':
          loaded = p > 0.5;
          break;
        case 'toWarehouse':
          pose = 'push';
          x = x0 + (x1 - x0) * p - lane;
          loaded = true;
          break;
        case 'unload':
          pose = 'unload';
          x = x1 - lane;
          loaded = p < 0.5;
          break;
        case 'return':
          pose = 'return';
          facing = -1;
          x = x1 + (x0 - x1) * p - lane;
          break;
      }
      slot.view.container.position.set(x, layout.groundY - 1 - lane * 0.5);
      slot.view.setFacing(facing);
      slot.view.setLoaded(loaded);
      slot.view.setPose(pose, p, time);
    });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
