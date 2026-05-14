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

export interface CanvasItemBoundsEntry extends BoundsRect {
  canvasItemId: string
  kind: CanvasItemKind
}

/** One bounds rectangle per CanvasItem, grouping widgets by canvasItemId. The
 *  kind comes from the widget's denormalized canvasItemKind. */
export function getCanvasItemBoundsList(widgets: Widget[]): CanvasItemBoundsEntry[] {
  const groups = new Map<string, { kind: CanvasItemKind; widgets: Widget[] }>()
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

/** Bounds rect for a single CanvasItem identified by id, or null if it has
 *  no widgets. Used to frame the camera when entering/exiting a dimension. */
export function findCanvasItemBoundsById(
  widgets: Widget[],
  canvasItemId: string,
): BoundsRect | null {
  return getStudioBounds(widgets.filter(w => w.canvasItemId === canvasItemId))
}

export function getStudioBounds(widgets: Widget[]): BoundsRect | null {
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
