/**
 * Game orchestrator: owns the current immutable state, applies actions and simulation steps,
 * publishes domain events on the bus and notifies subscribers (UI bridge). It is the only place
 * where the "current state" reference changes.
 */
import type { ActionResult } from '../state/actions';
import type { GameEvent, GameEventMap } from '../state/events';
import type { GameState } from '../state/GameState';
import { getMine } from '../state/update';
import { greedyBotTick } from '../sim/bots/GreedyBot';
import type { GameConfig } from '../sim/GameConfig';
import { stepSimulation } from '../sim/Simulation';
import { type Decimal, ZERO } from './BigNum';
import { EventBus } from './EventBus';

export type ChangeReason = 'step' | 'action' | 'reset';
export type ChangeListener = (reason: ChangeReason) => void;

/** How long (simulated ms) sales are remembered for the measured-income readout. */
const SALES_WINDOW_MS = 30_000;
/** The bot reacts every N simulation steps (4 × 50 ms = 200 ms, a quick human). */
const BOT_EVERY_STEPS = 4;

export class Game {
  readonly bus = new EventBus<GameEventMap>();
  private current: GameState;
  private readonly listeners = new Set<ChangeListener>();
  private sales: { at: number; amount: Decimal }[] = [];
  private stepCounter = 0;
  /** Debug: let the greedy bot play (GDD 13.10 strategy). */
  botEnabled = false;
  /** When false, events from steps are not published (used by fast-forward). */
  private publishing = true;

  constructor(
    readonly cfg: GameConfig,
    initial: GameState,
  ) {
    this.current = initial;
  }

  get state(): GameState {
    return this.current;
  }

  subscribe(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Applies a pure action; on success publishes its events and notifies subscribers. */
  dispatch(action: (state: GameState) => ActionResult): ActionResult {
    const result = action(this.current);
    if (result.ok) {
      this.current = result.state;
      this.publish(result.events);
      this.notify('action');
    }
    return result;
  }

  /** Advances the simulation by one fixed step (and lets the bot play if enabled). */
  step(dtMs: number): void {
    if (this.botEnabled && this.stepCounter % BOT_EVERY_STEPS === 0) {
      const bot = greedyBotTick(this.current, this.current.activeMineId, this.cfg);
      this.current = bot.state;
      this.publish(bot.events);
    }
    this.stepCounter++;
    const result = stepSimulation(this.current, dtMs, this.cfg);
    this.current = result.state;
    this.publish(result.events);
    this.notify('step');
  }

  /** Runs `durationMs` of simulation as fast as possible (debug fast-forward). */
  fastForward(durationMs: number, stepMs: number): void {
    this.publishing = false;
    try {
      const steps = Math.floor(durationMs / stepMs);
      for (let i = 0; i < steps; i++) this.step(stepMs);
    } finally {
      this.publishing = true;
    }
    this.notify('step');
  }

  /** Replaces the whole state (reset / load). */
  replaceState(state: GameState): void {
    this.current = state;
    this.sales = [];
    this.notify('reset');
  }

  /** Average sale value per second over the last 30 simulated seconds (debug readout). */
  measuredIncome(): Decimal {
    const now = this.current.time;
    const from = now - SALES_WINDOW_MS;
    let total = ZERO;
    for (const s of this.sales) if (s.at > from) total = total.add(s.amount);
    const span = Math.min(SALES_WINDOW_MS, Math.max(1000, now));
    return total.div(span / 1000);
  }

  /** Cash of the active mine (convenience for UI hot paths). */
  get cash(): Decimal {
    return getMine(this.current, this.current.activeMineId).cash;
  }

  private publish(events: GameEvent[]): void {
    for (const event of events) {
      if (event.type === 'saleCompleted') {
        this.sales.push({ at: event.at, amount: event.amount });
      }
      if (this.publishing) this.emit(event);
    }
    if (
      this.sales.length > 512 ||
      (this.sales[0] && this.sales[0].at < this.current.time - SALES_WINDOW_MS)
    ) {
      const cutoff = this.current.time - SALES_WINDOW_MS;
      this.sales = this.sales.filter((s) => s.at > cutoff);
    }
  }

  private emit(event: GameEvent): void {
    // Narrow the union per type so the bus stays fully typed.
    switch (event.type) {
      case 'saleCompleted':
        this.bus.emit('saleCompleted', event);
        break;
      case 'elevatorUnloaded':
        this.bus.emit('elevatorUnloaded', event);
        break;
      case 'levelsBought':
        this.bus.emit('levelsBought', event);
        break;
      case 'milestoneReached':
        this.bus.emit('milestoneReached', event);
        break;
      case 'shaftUnlocked':
        this.bus.emit('shaftUnlocked', event);
        break;
      case 'elevatorBuilt':
        this.bus.emit('elevatorBuilt', event);
        break;
      case 'barrierStarted':
        this.bus.emit('barrierStarted', event);
        break;
      case 'barrierCleared':
        this.bus.emit('barrierCleared', event);
        break;
      case 'unitStarted':
        this.bus.emit('unitStarted', event);
        break;
      case 'depotEmpty':
        this.bus.emit('depotEmpty', event);
        break;
    }
  }

  private notify(reason: ChangeReason): void {
    for (const listener of this.listeners) listener(reason);
  }
}
