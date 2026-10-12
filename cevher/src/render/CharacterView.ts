/**
 * Character views. Gameplay code only talks to the {@link CharacterView} interface, so the
 * placeholder rigs below can later be swapped for Spine / DragonBones skeletons (GDD 11.4)
 * without touching the scene logic.
 */
import { Container, Sprite, type Texture } from 'pixi.js';
import type { PlaceholderArt } from './placeholders/PlaceholderArt';

export type MinerPose = 'idle' | 'walk' | 'dig' | 'carry' | 'dump';
export type CarrierPose = 'idle' | 'push' | 'unload' | 'return';

export interface CharacterView<P extends string> {
  readonly container: Container;
  /**
   * @param pose      current animation state
   * @param progress  0..1 progress inside the pose (drives swings, steps)
   * @param time      render time in ms (for idle breathing / walk cycles)
   */
  setPose(pose: P, progress: number, time: number): void;
  setFacing(direction: 1 | -1): void;
  destroy(): void;
}

function sprite(texture: Texture, ax: number, ay: number): Sprite {
  const s = new Sprite(texture);
  s.anchor.set(ax, ay);
  return s;
}

/** Turquoise miner with pickaxe and ore sack. Feet at (0, 0), ~48 units tall, faces right. */
export class PlaceholderMinerView implements CharacterView<MinerPose> {
  readonly container = new Container();
  private readonly body: Sprite;
  private readonly head: Sprite;
  private readonly legBack: Sprite;
  private readonly legFront: Sprite;
  private readonly gloveBack: Sprite;
  private readonly gloveFront: Sprite;
  private readonly pickaxe: Sprite;
  private readonly sack: Sprite;
  private readonly rig = new Container();
  private readonly phaseSeed: number;

  constructor(art: PlaceholderArt, seed = 0) {
    this.phaseSeed = seed;
    this.legBack = sprite(art.get('miner.leg'), 0.5, 0.05);
    this.legFront = sprite(art.get('miner.leg'), 0.5, 0.05);
    this.body = sprite(art.get('miner.body'), 0.5, 0.92);
    this.head = sprite(art.get('miner.head'), 0.48, 0.86);
    this.gloveBack = sprite(art.get('miner.glove'), 0.5, 0.5);
    this.gloveFront = sprite(art.get('miner.glove'), 0.5, 0.5);
    this.pickaxe = sprite(art.get('miner.pickaxe'), 0.16, 0.86);
    this.sack = sprite(art.get('miner.sack'), 0.5, 0.6);

    this.legBack.tint = 0xcfcfcf;
    this.gloveBack.tint = 0xcfcfcf;
    this.legBack.position.set(-3, -12);
    this.legFront.position.set(4, -12);
    this.body.position.set(0, -9);
    this.head.position.set(1, -31);
    this.sack.position.set(-11, -28);

    this.rig.addChild(
      this.legBack,
      this.gloveBack,
      this.sack,
      this.body,
      this.legFront,
      this.head,
      this.pickaxe,
      this.gloveFront,
    );
    this.container.addChild(this.rig);
  }

  setFacing(direction: 1 | -1): void {
    this.container.scale.x = direction;
  }

  setPose(pose: MinerPose, progress: number, time: number): void {
    const t = time / 1000 + this.phaseSeed;
    const walking = pose === 'walk' || pose === 'carry';
    const stride = walking ? Math.sin(t * 14) : 0;
    const bob = walking ? Math.abs(Math.sin(t * 14)) * 1.6 : Math.sin(t * 2.4) * 0.5;

    this.rig.y = -bob;
    this.legBack.rotation = stride * 0.5;
    this.legFront.rotation = -stride * 0.5;
    this.sack.visible = pose === 'carry' || pose === 'dump';
    this.head.rotation = pose === 'dig' ? 0.08 : 0;

    if (pose === 'dig') {
      // Three swings: raise slowly, strike fast.
      const swing = (progress * 3) % 1;
      const angle = swing < 0.7 ? -1.9 * (swing / 0.7) : -1.9 + 2.6 * ((swing - 0.7) / 0.3);
      this.pickaxe.visible = true;
      this.pickaxe.position.set(6, -22);
      this.pickaxe.rotation = angle;
      this.gloveFront.position.set(7, -22);
      this.gloveBack.position.set(3, -21);
    } else {
      this.pickaxe.visible = pose !== 'carry' && pose !== 'dump';
      this.pickaxe.position.set(-6, -18);
      this.pickaxe.rotation = -0.5 + stride * 0.05;
      const armSwing = walking ? stride * 4 : 0;
      this.gloveFront.position.set(6 + armSwing, -16);
      this.gloveBack.position.set(-5 - armSwing, -17);
      if (pose === 'carry') {
        this.gloveFront.position.set(-4, -27);
        this.gloveBack.position.set(-8, -24);
      }
      if (pose === 'dump') {
        const lift = Math.sin(progress * Math.PI);
        this.sack.position.set(-6 + lift * 14, -28 - lift * 8);
        this.sack.rotation = lift * 1.2;
        this.gloveFront.position.set(4 + lift * 6, -26 - lift * 6);
      } else {
        this.sack.position.set(-11, -28);
        this.sack.rotation = 0;
      }
    }
  }

  /** Strike frame of the current dig swing (0..1 → true right after impact). */
  static isImpact(progress: number): boolean {
    const swing = (progress * 3) % 1;
    return swing > 0.92;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

/** Olive-vested carrier pushing a rail wagon. Feet at (0, 0), wagon in front. */
export class PlaceholderCarrierView implements CharacterView<CarrierPose> {
  readonly container = new Container();
  private readonly rig = new Container();
  private readonly body: Sprite;
  private readonly head: Sprite;
  private readonly legBack: Sprite;
  private readonly legFront: Sprite;
  private readonly gloveFront: Sprite;
  private readonly wagon = new Container();
  private readonly ore: Sprite;
  private readonly phaseSeed: number;

  constructor(art: PlaceholderArt, seed = 0) {
    this.phaseSeed = seed;
    this.legBack = sprite(art.get('miner.leg'), 0.5, 0.05);
    this.legFront = sprite(art.get('miner.leg'), 0.5, 0.05);
    this.body = sprite(art.get('carrier.body'), 0.5, 0.92);
    this.head = sprite(art.get('carrier.head'), 0.48, 0.86);
    this.gloveFront = sprite(art.get('miner.glove'), 0.5, 0.5);
    this.legBack.tint = 0xcfcfcf;
    this.legBack.position.set(-3, -12);
    this.legFront.position.set(4, -12);
    this.body.position.set(0, -9);
    this.head.position.set(1, -31);
    this.gloveFront.position.set(12, -19);
    this.rig.addChild(this.legBack, this.body, this.legFront, this.head, this.gloveFront);

    const wagon = sprite(art.get('wagon'), 0.5, 1);
    this.ore = sprite(art.get('wagon.ore'), 0.5, 1);
    this.ore.position.set(0, -24);
    wagon.position.set(0, 0);
    this.wagon.addChild(this.ore, wagon);
    this.wagon.position.set(34, 0);

    this.container.addChild(this.wagon, this.rig);
  }

  setFacing(direction: 1 | -1): void {
    // The wagon always stays on the warehouse side (pushed out, pulled back); only the rig turns.
    this.rig.scale.x = direction;
  }

  setLoaded(loaded: boolean): void {
    this.ore.visible = loaded;
  }

  setPose(pose: CarrierPose, progress: number, time: number): void {
    const t = time / 1000 + this.phaseSeed;
    const walking = pose === 'push' || pose === 'return';
    const stride = walking ? Math.sin(t * 12) : 0;
    this.rig.y = walking ? -Math.abs(Math.sin(t * 12)) * 1.5 : Math.sin(t * 2.2) * 0.4;
    this.legBack.rotation = stride * 0.45;
    this.legFront.rotation = -stride * 0.45;
    this.rig.rotation = pose === 'push' ? 0.12 : 0;
    this.gloveFront.position.set(
      pose === 'push' ? 13 : 7 + stride * 3,
      pose === 'push' ? -19 : -15,
    );
    this.wagon.rotation = pose === 'unload' ? -Math.sin(progress * Math.PI) * 0.45 : 0;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
