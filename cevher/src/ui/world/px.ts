import type { WorldLayout } from '../../render/layout';

/** Logical world units → CSS pixel string. */
export function px(layout: WorldLayout, value: number): string {
  return `${Math.round(value * layout.scale * 100) / 100}px`;
}
