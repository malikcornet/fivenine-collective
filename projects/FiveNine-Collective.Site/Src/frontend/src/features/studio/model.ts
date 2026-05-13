export const CELL_W = 80
export const CELL_H = 64
export const GAP = 12
export const STEP_X = CELL_W + GAP
export const STEP_Y = CELL_H + GAP
export const NAV_H = 60
export const BOUNDS_PADDING_PX = 0

export type WidgetType = Widget['type']

interface WidgetBase {
  id: string
  /** Owning profile. Editing is restricted to widgets whose profileId matches
   *  the current user's profile (see Studio.currentProfileId). */
  profileId: string
  col: number
  row: number
  w: number
  h: number
}

export interface TextWidget extends WidgetBase {
  type: 'text'
  data: { body: string }
}

export interface PictureWidget extends WidgetBase {
  type: 'picture'
  data: { url: string | null; caption: string }
}

export interface VideoWidget extends WidgetBase {
  type: 'video'
  data: { url: string | null; title: string }
}

export type Widget = TextWidget | PictureWidget | VideoWidget

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

export interface BoundsRect {
  left: number
  top: number
  width: number
  height: number
  centerX: number
  centerY: number
}

/** Something the viewport can snap-fit onto. Today: a profile (group of
 *  widgets sharing a profileId). Future: a project, etc. New kinds plug in by
 *  extending {@link SnapKind} and {@link getSnapTargets}. */
export type SnapKind = 'profile'

export interface SnapTarget {
  kind: SnapKind
  id: string
  bounds: BoundsRect
}

export interface ProfileBoundsEntry extends BoundsRect {
  profileId: string
}

/** One bounds rectangle per profile, grouping widgets by profileId. */
export function getProfileBoundsList(widgets: Widget[]): ProfileBoundsEntry[] {
  const groups = new Map<string, Widget[]>()
  for (const w of widgets) {
    let g = groups.get(w.profileId)
    if (!g) {
      g = []
      groups.set(w.profileId, g)
    }
    g.push(w)
  }
  const result: ProfileBoundsEntry[] = []
  for (const [profileId, ws] of groups) {
    const b = getStudioBounds(ws)
    if (b) result.push({ profileId, ...b })
  }
  return result
}

/** Bounds for a single profile's widgets, or null if the profile has none. */
export function getProfileBounds(widgets: Widget[], profileId: string) {
  return getStudioBounds(widgets.filter(w => w.profileId === profileId))
}

/** All snap targets in the studio. Currently one per profile; project snap
 *  targets will be added here later. */
export function getSnapTargets(widgets: Widget[]): SnapTarget[] {
  return getProfileBoundsList(widgets).map(p => ({
    kind: 'profile' as const,
    id: p.profileId,
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

type DefaultDataMap = { [T in WidgetType]: WidgetData<T> }

const DEFAULT_DATA: DefaultDataMap = {
  text: { body: 'A quote, a thought, a manifesto.' },
  picture: { url: null, caption: 'Caption' },
  video: { url: null, title: 'Video' },
}

export function defaultData<T extends WidgetType>(type: T): WidgetData<T> {
  return DEFAULT_DATA[type] as WidgetData<T>
}
