export const CELL_W = 80
export const CELL_H = 64
export const GAP = 12
export const STEP_X = CELL_W + GAP
export const STEP_Y = CELL_H + GAP
export const NAV_H = 60
export const BOUNDS_PADDING_CELLS = 1

export type WidgetType = Widget['type']

interface WidgetBase {
  id: string
  col: number
  row: number
  w: number
  h: number
}

export interface ProfileWidget extends WidgetBase {
  type: 'profile'
  data: { name: string; role: string; bio: string }
}

export interface AboutWidget extends WidgetBase {
  type: 'about'
  data: { title: string; body: string }
}

export interface TextWidget extends WidgetBase {
  type: 'text'
  data: { body: string }
}

export interface LinksWidget extends WidgetBase {
  type: 'links'
  data: { items: string[] }
}

export interface GalleryWidget extends WidgetBase {
  type: 'gallery'
  data: { count: number }
}

export interface SocialsWidget extends WidgetBase {
  type: 'socials'
  data: { items: string[] }
}

export interface VideoWidget extends WidgetBase {
  type: 'video'
  data: { title: string }
}

export interface ProjectWidget extends WidgetBase {
  type: 'project'
  data: {
    title: string
    status: string
    year: string
    blurb: string
    accent: string
  }
}

export type Widget =
  | ProfileWidget
  | AboutWidget
  | TextWidget
  | LinksWidget
  | GalleryWidget
  | SocialsWidget
  | VideoWidget
  | ProjectWidget

export type WidgetData<T extends WidgetType> = Extract<Widget, { type: T }>['data']

export type DragState =
  | { kind: 'move'; id: string; startX: number; startY: number; origCol: number; origRow: number }
  | { kind: 'resize'; id: string; startX: number; startY: number; origW: number; origH: number }
  | { kind: 'pan'; startX: number; startY: number; origPanX: number; origPanY: number }
  | null

export const nextId = () => crypto.randomUUID()

/**
 * IDs for client-minted widgets that haven't been persisted yet.
 * The server returns canonical IDs on save and the client reconciles by
 * matching the `draft-` prefix.
 */
export const nextDraftId = () => `draft-${crypto.randomUUID()}`
export const isDraftId = (id: string) => id.startsWith('draft-')

export function getClusterBounds(widgets: Widget[]) {
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
  const left = (minCol - BOUNDS_PADDING_CELLS) * STEP_X
  const top = (minRow - BOUNDS_PADDING_CELLS) * STEP_Y
  const width = (maxCol - minCol + BOUNDS_PADDING_CELLS * 2) * STEP_X
  const height = (maxRow - minRow + BOUNDS_PADDING_CELLS * 2) * STEP_Y
  return { left, top, width, height, centerX: left + width / 2, centerY: top + height / 2 }
}

type DefaultDataMap = { [T in WidgetType]: WidgetData<T> }

const DEFAULT_DATA: DefaultDataMap = {
  profile: { name: 'Your name', role: 'Role · Location', bio: 'One-line bio.' },
  about: { title: 'About', body: 'Tell people who you are.' },
  text: { body: 'A quote, a thought, a manifesto.' },
  links: { items: ['Link one', 'Link two'] },
  gallery: { count: 3 },
  socials: { items: ['IG', 'YT', 'SC'] },
  video: { title: 'Video' },
  project: {
    title: 'Untitled project',
    status: 'In progress',
    year: '2026',
    blurb: 'What this project is about.',
    accent: '#d4ff00',
  },
}

export function defaultData<T extends WidgetType>(type: T): WidgetData<T> {
  return DEFAULT_DATA[type] as WidgetData<T>
}
