import type { CanvasItemKind } from './canvasItem'
import type { Widget } from './widget'

export const CELL_W = 80
export const CELL_H = 64
export const GAP = 12
export const STEP_X = CELL_W + GAP
export const STEP_Y = CELL_H + GAP
export const NAV_H = 60
export const BOUNDS_PADDING_PX = 0

export interface BoundsRect {
  left: number
  top: number
  width: number
  height: number
  centerX: number
  centerY: number
}

/** Something the viewport can snap-fit onto. Mirrors {@link CanvasItemKind} — every
 *  CanvasItem with at least one widget produces a snap target. */
export type SnapKind = CanvasItemKind

export interface SnapTarget {
  kind: SnapKind
  /** The CanvasItem id. */
  id: string
  bounds: BoundsRect
}

export interface CanvasItemBoundsEntry extends BoundsRect {
  canvasItemId: string
  kind: SnapKind
}

/** One bounds rectangle per CanvasItem, grouping widgets by canvasItemId. The
 *  kind comes from the widget's denormalized canvasItemKind. */
export function getCanvasItemBoundsList(widgets: Widget[]): CanvasItemBoundsEntry[] {
  const groups = new Map<string, { kind: SnapKind; widgets: Widget[] }>()
  for (const w of widgets) {
    let g = groups.get(w.canvasItemId)
    if (!g) {
      g = { kind: w.canvasItemKind, widgets: [] }
      groups.set(w.canvasItemId, g)
    }
    g.widgets.push(w)
  }
  const result: CanvasItemBoundsEntry[] = []
  for (const [canvasItemId, { kind, widgets: ws }] of groups) {
    const b = getStudioBounds(ws)
    if (b) result.push({ canvasItemId, kind, ...b })
  }
  return result
}

/** Bounds for a single CanvasItem's widgets, or null if it has none. */
export function getCanvasItemBounds(widgets: Widget[], canvasItemId: string) {
  return getStudioBounds(widgets.filter(w => w.canvasItemId === canvasItemId))
}

/** All snap targets in the studio — one per CanvasItem. */
export function getSnapTargets(widgets: Widget[]): SnapTarget[] {
  return getCanvasItemBoundsList(widgets).map(p => ({
    kind: p.kind,
    id: p.canvasItemId,
    bounds: {
      left: p.left,
      top: p.top,
      width: p.width,
      height: p.height,
      centerX: p.centerX,
      centerY: p.centerY,
    },
  }))
}

export function findSnapTarget(
  widgets: Widget[],
  kind: SnapKind,
  id: string,
): SnapTarget | null {
  return getSnapTargets(widgets).find(t => t.kind === kind && t.id === id) ?? null
}

export function getStudioBounds(widgets: Widget[]) {
  if (widgets.length === 0) return null
  let minCol = Infinity,
    minRow = Infinity,
    maxCol = -Infinity,
    maxRow = -Infinity
  for (const w of widgets) {
    if (w.col < minCol) minCol = w.col
    if (w.row < minRow) minRow = w.row
    if (w.col + w.w > maxCol) maxCol = w.col + w.w
    if (w.row + w.h > maxRow) maxRow = w.row + w.h
  }
  const left = minCol * STEP_X - BOUNDS_PADDING_PX
  const top = minRow * STEP_Y - BOUNDS_PADDING_PX
  const width = (maxCol - minCol) * STEP_X + BOUNDS_PADDING_PX * 2
  const height = (maxRow - minRow) * STEP_Y + BOUNDS_PADDING_PX * 2
  return { left, top, width, height, centerX: left + width / 2, centerY: top + height / 2 }
}
