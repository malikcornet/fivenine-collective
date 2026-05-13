import type { HttpClient } from '../../lib/http'
import type { Widget, WidgetType } from './model'

export interface Profile {
  id: string
  /** Auth0 sub of the owner. */
  ownerSub: string
  name: string
  role: string
  bio: string
}

export interface Studio {
  id: string
  version: number
  /** Profile owned by the current viewer (null when anonymous). Only widgets
   *  with this profileId may be edited. */
  currentProfileId: string | null
  profiles: Profile[]
  widgets: Widget[]
  updatedAt: string
}

interface ServerWidget {
  id: string
  profileId: string
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
  profiles: Profile[]
  widgets: ServerWidget[]
  updatedAt: string
}

function fromServer(c: ServerStudio): Studio {
  return {
    id: c.id,
    version: c.version,
    currentProfileId: c.currentProfileId,
    profiles: c.profiles,
    widgets: c.widgets as Widget[],
    updatedAt: c.updatedAt,
  }
}

export async function getStudio(http: HttpClient): Promise<Studio> {
  return fromServer(await http.get<ServerStudio>('/api/studio'))
}

/**
 * Saves the current user's widgets. Server validates ownership: only widgets
 * whose profileId matches the caller's profile are touched. Draft-prefixed ids
 * are replaced by canonical server-issued GUIDs in the returned studio.
 */
export async function saveMyWidgets(
  http: HttpClient,
  widgets: Widget[],
): Promise<Studio> {
  const payload = {
    widgets: widgets.map(w => ({
      id: w.id,
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
