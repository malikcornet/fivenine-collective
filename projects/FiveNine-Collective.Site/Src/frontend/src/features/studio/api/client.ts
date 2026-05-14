import type { HttpClient } from '../../../lib/http'
import type { CanvasItem, CanvasItemKind } from '../model/canvasItem'
import type { Widget, WidgetType } from '../model/widget'

export interface Studio {
  id: string
  version: number
  /** The current viewer's profile id, null when anonymous. */
  currentProfileId: string | null
  canvasItems: CanvasItem[]
  widgets: Widget[]
  updatedAt: string
}

interface ServerWidget {
  id: string
  canvasItemId: string
  canvasItemKind: CanvasItemKind
  type: WidgetType
  col: number
  row: number
  w: number
  h: number
  data: unknown
}

interface ServerStudio {
  id: string
  version: number
  currentProfileId: string | null
  canvasItems: CanvasItem[]
  widgets: ServerWidget[]
  updatedAt: string
}

function fromServer(c: ServerStudio): Studio {
  return {
    id: c.id,
    version: c.version,
    currentProfileId: c.currentProfileId,
    canvasItems: c.canvasItems,
    widgets: c.widgets as Widget[],
    updatedAt: c.updatedAt,
  }
}

export async function getStudio(http: HttpClient): Promise<Studio> {
  return fromServer(await http.get<ServerStudio>('/api/studio'))
}

/**
 * Creates a single widget inside the given container. Server validates
 * edit rights and mints a canonical GUID when the supplied id is a draft.
 */
export async function createWidget(
  http: HttpClient,
  widget: Widget,
): Promise<Widget> {
  const payload = {
    id: widget.id,
    canvasItemId: widget.canvasItemId,
    type: widget.type,
    col: widget.col,
    row: widget.row,
    w: widget.w,
    h: widget.h,
    data: widget.data,
  }
  const created = await http.post<ServerWidget>('/api/studio/widgets', payload)
  return created as Widget
}

/**
 * Saves the caller's widgets across every container they can edit. Server
 * groups by canvasItemId, validates each container individually, and silently
 * drops rows belonging to containers the caller doesn't own.
 */
export async function saveMyWidgets(
  http: HttpClient,
  widgets: Widget[],
): Promise<Studio> {
  const payload = {
    widgets: widgets.map(w => ({
      id: w.id,
      canvasItemId: w.canvasItemId,
      type: w.type,
      col: w.col,
      row: w.row,
      w: w.w,
      h: w.h,
      data: w.data,
    })),
  }
  return fromServer(await http.put<ServerStudio>('/api/studio/widgets', payload))
}
