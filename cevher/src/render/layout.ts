/**
 * World layout: the single source of truth for where things are, shared by the Pixi views and the
 * DOM overlay so canvas art and HTML widgets always line up.
 *
 * Coordinates are logical world units. `scale` converts them to CSS pixels; on phones the scale is 1
 * (390 px wide design), tablets/desktops get a slightly larger scale and a wider world.
 */
export interface WorldLayout {
  viewWidth: number;
  viewHeight: number;
  scale: number;
  /** Logical world width. */
  width: number;
  shaftCount: number;
  surfaceHeight: number;
  groundY: number;
  rowHeight: number;
  bottomRowHeight: number;
  worldHeight: number;
  /** Elevator shaft column. */
  columnX: number;
  columnWidth: number;
  cageWidth: number;
  cageHeight: number;
  /** Shaft row geometry (relative to a row's top). */
  tunnelTop: number;
  floorOffset: number;
  crateX: number;
  crateWidth: number;
  crateHeight: number;
  walkStartX: number;
  faceX: number;
  /** Surface geometry. */
  depotX: number;
  depotWidth: number;
  railStartX: number;
  railEndX: number;
  warehouseX: number;
  warehouseWidth: number;
  headframeTop: number;
}

const DESIGN_WIDTH = 400;
const MAX_SCALE = 1.35;

export function computeLayout(
  viewWidth: number,
  viewHeight: number,
  shaftCount: number,
): WorldLayout {
  const scale = Math.min(MAX_SCALE, Math.max(1, viewWidth / DESIGN_WIDTH));
  const width = Math.max(320, viewWidth / scale);
  const surfaceHeight = 300;
  const groundY = 236;
  const rowHeight = 124;
  const bottomRowHeight = 168;
  const columnX = 8;
  const columnWidth = 64;
  const crateX = columnX + columnWidth + 10;
  const crateWidth = 48;
  const warehouseWidth = Math.min(120, Math.max(96, width * 0.25));
  return {
    viewWidth,
    viewHeight,
    scale,
    width,
    shaftCount,
    surfaceHeight,
    groundY,
    rowHeight,
    bottomRowHeight,
    worldHeight: surfaceHeight + shaftCount * rowHeight + bottomRowHeight + 60,
    columnX,
    columnWidth,
    cageWidth: 50,
    cageHeight: 58,
    tunnelTop: 6,
    floorOffset: 104,
    crateX,
    crateWidth,
    crateHeight: 34,
    walkStartX: crateX + crateWidth + 8,
    faceX: width - 52,
    depotX: columnX + columnWidth + 8,
    depotWidth: 54,
    railStartX: columnX + columnWidth + 70,
    railEndX: width - warehouseWidth - 14,
    warehouseX: width - warehouseWidth - 8,
    warehouseWidth,
    headframeTop: 104,
  };
}

/** Logical y of the top of shaft row `index` (0-based). */
export function rowTop(layout: WorldLayout, index: number): number {
  return layout.surfaceHeight + index * layout.rowHeight;
}

/** Logical y of the floor of shaft row `index`. */
export function rowFloor(layout: WorldLayout, index: number): number {
  return rowTop(layout, index) + layout.floorOffset;
}

export function bottomRowTop(layout: WorldLayout): number {
  return layout.surfaceHeight + layout.shaftCount * layout.rowHeight;
}

/** Logical y of the cage's bottom edge when parked at elevator stop `stop` (0 = surface dock). */
export function elevatorStopY(layout: WorldLayout, stop: number): number {
  return stop <= 0 ? layout.groundY : rowFloor(layout, stop - 1);
}

/** Maximum scroll offset in CSS pixels. */
export function maxScroll(layout: WorldLayout): number {
  return Math.max(0, layout.worldHeight * layout.scale - layout.viewHeight);
}

/** Scroll offset (CSS px) that centres a logical y in the view. */
export function scrollToCenter(layout: WorldLayout, logicalY: number): number {
  const target = logicalY * layout.scale - layout.viewHeight / 2;
  return Math.min(maxScroll(layout), Math.max(0, target));
}
