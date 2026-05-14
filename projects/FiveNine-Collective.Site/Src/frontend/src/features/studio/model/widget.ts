import type { CanvasItemKind } from './canvasItem'

export type WidgetType = Widget['type']

interface WidgetBase {
  id: string
  /** The CanvasItem (profile or project) this widget lives inside. Edit
   *  rights are checked against the container: profile owner for profile
   *  widgets, project creator/collaborators for project widgets. */
  canvasItemId: string
  /** Denormalized kind of the parent container — set by the server when it
   *  serializes the widget so clients don't have to cross-reference. */
  canvasItemKind: CanvasItemKind
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
