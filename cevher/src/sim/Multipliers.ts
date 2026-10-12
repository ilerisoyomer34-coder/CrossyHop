/**
 * Multiplier stack (GDD 5.6): bonuses are summed inside a category and categories are multiplied.
 *
 *   total = (1 + Σ research) × (1 + Σ fossil sets) × (1 + Σ achievements) × (1 + Σ mastery)
 *         × rank multiplier × active skill × boosts × event
 *
 * Phase 0 has no sources yet, so every category is neutral (×1). The breakdown is already exposed so
 * the "Gelir ayrıntısı" panel (Phase 2) can list every source and the product equals the total.
 */
import type { GameState } from '../state/GameState';
import type { GameConfig } from './GameConfig';

export type AdditiveCategory = 'research' | 'fossils' | 'achievements' | 'mastery';
export type MultiplicativeCategory = 'rank' | 'skill' | 'boost' | 'event';
export type MultiplierCategory = AdditiveCategory | MultiplicativeCategory;

export interface MultiplierEntry {
  category: MultiplierCategory;
  /** Factor this category contributes to the total (1 = neutral). */
  factor: number;
  /** Individual contributions (additive bonuses or multiplicative factors) for the breakdown UI. */
  sources: { id: string; value: number }[];
}

export interface MultiplierBreakdown {
  total: number;
  entries: MultiplierEntry[];
}

const ADDITIVE: readonly AdditiveCategory[] = ['research', 'fossils', 'achievements', 'mastery'];
const MULTIPLICATIVE: readonly MultiplicativeCategory[] = ['rank', 'skill', 'boost', 'event'];

/** Collects the bonus sources of one category. Phase 0: none. */
function sourcesFor(
  _state: GameState,
  _mineId: string,
  _cfg: GameConfig,
  _category: MultiplierCategory,
): { id: string; value: number }[] {
  return [];
}

/** Income (sale value) multiplier for a mine with its full breakdown. */
export function incomeMultiplier(
  state: GameState,
  mineId: string,
  cfg: GameConfig,
): MultiplierBreakdown {
  const entries: MultiplierEntry[] = [];
  let total = 1;
  for (const category of ADDITIVE) {
    const sources = sourcesFor(state, mineId, cfg, category);
    const factor = 1 + sources.reduce((sum, s) => sum + s.value, 0);
    entries.push({ category, factor, sources });
    total *= factor;
  }
  for (const category of MULTIPLICATIVE) {
    const sources = sourcesFor(state, mineId, cfg, category);
    const factor = sources.reduce((product, s) => product * s.value, 1);
    entries.push({ category, factor, sources });
    total *= factor;
  }
  return { total, entries };
}
