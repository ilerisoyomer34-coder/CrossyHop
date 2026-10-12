/**
 * Logistics (taşıyıcılar + ambar) simulation (GDD 4.3).
 *
 * Each carrier: load a wagon at the shaft-head depot → push it to the warehouse → unload (the ore is
 * sold instantly, cash goes up) → walk back. With automation carriers loop and wait at the depot
 * when it is empty; without automation one tap sends every idle carrier on one round (staggered so
 * the wagons do not overlap). Wagon capacity is derived so that all carriers together move T(L).
 */
import { dmin, ZERO, type Decimal } from '../core/BigNum';
import type { CarrierPhase, CarrierState, MineState } from '../state/GameState';
import { isAutomated } from './automation';
import type { Economy } from './Economy';
import { mineDef } from './GameConfig';
import { incomeMultiplier } from './Multipliers';
import type { SimContext } from './SimContext';

const MS = 1000;

export function carrierPhase(eco: Economy, kind: CarrierPhase['kind'], at: number): CarrierPhase {
  const c = eco.cfg.logistics.cycle;
  switch (kind) {
    case 'idle':
    case 'wait':
      return { kind, startAt: at, endAt: Infinity };
    case 'delay':
      return { kind, startAt: at, endAt: at };
    case 'load':
      return { kind, startAt: at, endAt: at + c.loadSec * MS };
    case 'toWarehouse':
    case 'return':
      return { kind, startAt: at, endAt: at + c.walkSec * MS };
    case 'unload':
      return { kind, startAt: at, endAt: at + c.unloadSec * MS };
  }
}

/** Manual start: every idle carrier begins a round, staggered by `manualStaggerSec`. */
export function dispatchIdleCarriers(
  eco: Economy,
  carriers: readonly CarrierState[],
  at: number,
): CarrierState[] | null {
  const stagger = eco.cfg.logistics.manualStaggerSec * MS;
  let started = 0;
  const next = carriers.map((c) => {
    if (c.phase.kind !== 'idle') return c;
    const startAt = at + started * stagger;
    started++;
    return { ...c, phase: { kind: 'delay' as const, startAt: at, endAt: startAt } };
  });
  return started > 0 ? next : null;
}

export function updateLogistics(mine: MineState, ctx: SimContext): MineState {
  const { cfg, state, t0, t1, events } = ctx;
  const eco = cfg.economy;
  const scale = mineDef(cfg, mine.id).mineScale;
  const automated = isAutomated(state, mine.logistics);
  const capacity = eco.wagonCapacity(mine.logistics.level, scale);
  const cycleMs = eco.logisticsCycleMs();

  let carriers: CarrierState[] | null = null;
  let stock = mine.surfaceStock;
  let cash = mine.cash;
  let earned = mine.earnedThisRun;
  let saleMultiplier: number | null = null;
  let depotWasEmpty = false;
  const count = mine.logistics.carriers.length;

  for (let i = 0; i < count; i++) {
    const original = mine.logistics.carriers[i];
    if (!original) continue;
    let carrier = original;

    for (let guard = 0; guard < 100_000; guard++) {
      const phase = carrier.phase;
      if (phase.kind === 'idle') {
        if (!automated) break;
        // Automation just started: spread carriers evenly over one cycle.
        const from = Math.max(t0, phase.startAt);
        carrier = {
          ...carrier,
          phase: { kind: 'delay', startAt: from, endAt: from + (i * cycleMs) / count },
        };
        continue;
      }
      if (phase.kind === 'wait') {
        if (!automated) {
          carrier = { ...carrier, phase: carrierPhase(eco, 'idle', Math.max(t0, phase.startAt)) };
          continue;
        }
        if (stock.lte(0)) break;
        carrier = { ...carrier, phase: carrierPhase(eco, 'load', Math.max(t0, phase.startAt)) };
        continue;
      }
      if (phase.endAt > t1) break;
      const at = phase.endAt;

      switch (phase.kind) {
        case 'delay':
          carrier = { ...carrier, phase: carrierPhase(eco, 'load', at) };
          break;
        case 'load': {
          const take: Decimal = dmin(capacity, stock);
          if (take.gt(0)) {
            stock = stock.sub(take);
            carrier = { load: take, phase: carrierPhase(eco, 'toWarehouse', at) };
          } else {
            depotWasEmpty = !automated;
            carrier = { load: ZERO, phase: carrierPhase(eco, automated ? 'wait' : 'idle', at) };
          }
          break;
        }
        case 'toWarehouse':
          carrier = { ...carrier, phase: carrierPhase(eco, 'unload', at) };
          break;
        case 'unload': {
          if (carrier.load.gt(0)) {
            saleMultiplier ??= incomeMultiplier(state, mine.id, cfg).total;
            const amount = carrier.load.mul(saleMultiplier);
            cash = cash.add(amount);
            earned = earned.add(amount);
            events.push({ type: 'saleCompleted', mineId: mine.id, amount, at });
          }
          carrier = { load: ZERO, phase: carrierPhase(eco, 'return', at) };
          break;
        }
        case 'return': {
          const nextKind = !automated ? 'idle' : stock.gt(0) ? 'load' : 'wait';
          carrier = { ...carrier, phase: carrierPhase(eco, nextKind, at) };
          break;
        }
      }
    }

    if (carrier !== original) {
      carriers ??= mine.logistics.carriers.slice();
      carriers[i] = carrier;
    }
  }

  if (depotWasEmpty) events.push({ type: 'depotEmpty', mineId: mine.id });
  if (!carriers && stock === mine.surfaceStock) return mine;
  return {
    ...mine,
    logistics: carriers ? { ...mine.logistics, carriers } : mine.logistics,
    surfaceStock: stock,
    cash,
    earnedThisRun: earned,
  };
}
