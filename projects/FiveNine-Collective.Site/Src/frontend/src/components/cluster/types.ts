export const CELL_W = 80
export const CELL_H = 64
export const GAP = 12
export const STEP_X = CELL_W + GAP
export const STEP_Y = CELL_H + GAP

export type WidgetType = 'profile' | 'about' | 'links' | 'gallery' | 'text' | 'socials' | 'video' | 'project'

export interface Widget {
  id: string
  type: WidgetType
  col: number
  row: number
  w: number
  h: number
  data: Record<string, unknown>
}

export type DragState =
  | { kind: 'move'; id: string; startX: number; startY: number; origCol: number; origRow: number }
  | { kind: 'resize'; id: string; startX: number; startY: number; origW: number; origH: number }
  | { kind: 'pan'; startX: number; startY: number; origPanX: number; origPanY: number }
  | null

let idCounter = 100
export const nextId = () => `w${++idCounter}`

export const BOUNDS_PADDING_CELLS = 1

export function getClusterBounds(widgets: Widget[]) {
  if (widgets.length === 0) return null
  let minCol = Infinity, minRow = Infinity, maxCol = -Infinity, maxRow = -Infinity
  for (const w of widgets) {
    if (w.col < minCol) minCol = w.col
    if (w.row < minRow) minRow = w.row
    if (w.col + w.w > maxCol) maxCol = w.col + w.w
    if (w.row + w.h > maxRow) maxRow = w.row + w.h
  }
  const left = (minCol - BOUNDS_PADDING_CELLS) * STEP_X
  const top = (minRow - BOUNDS_PADDING_CELLS) * STEP_Y
  const width = (maxCol - minCol + BOUNDS_PADDING_CELLS * 2) * STEP_X
  const height = (maxRow - minRow + BOUNDS_PADDING_CELLS * 2) * STEP_Y
  return { left, top, width, height, centerX: left + width / 2, centerY: top + height / 2 }
}

export function defaultData(type: WidgetType): Record<string, unknown> {
  switch (type) {
    case 'profile': return { name: 'Your name', role: 'Role · Location', bio: 'One-line bio.' }
    case 'about': return { title: 'About', body: 'Tell people who you are.' }
    case 'text': return { body: 'A quote, a thought, a manifesto.' }
    case 'links': return { items: ['Link one', 'Link two'] }
    case 'gallery': return { count: 3 }
    case 'socials': return { items: ['IG', 'YT', 'SC'] }
    case 'video': return { title: 'Video' }
    case 'project': return {
      title: 'Untitled project',
      status: 'In progress',
      year: '2026',
      blurb: 'What this project is about.',
      accent: '#d4ff00',
    }
  }
}
