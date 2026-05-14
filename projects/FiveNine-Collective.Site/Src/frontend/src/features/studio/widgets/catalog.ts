import type { CanvasItemKind } from '../model/canvasItem'
import type { WidgetData, WidgetType } from '../model/widget'

/**
 * Catalog entry per widget kind: where it's allowed, its default payload,
 * and the dock-button presentation. Keeping this as a single typed record
 * means StudioDock and StudioService stay in sync — both read from
 * {@link WIDGET_CATALOG}.
 */
export interface WidgetCatalogEntry<T extends WidgetType> {
  type: T
  /** Container kinds this widget is allowed inside. Mirrors the
   *  WidgetAllowedIn map on the server. */
  allowedIn: readonly CanvasItemKind[]
  /** Single-char glyph for the dock button. */
  dockIcon: string
  /** Display label for the dock button + screen-reader announcement. */
  dockLabel: string
  /** Default payload used when the user adds a new instance via the dock. */
  defaultData: WidgetData<T>
}

type Catalog = { [T in WidgetType]: WidgetCatalogEntry<T> }

export const WIDGET_CATALOG: Catalog = {
  text: {
    type: 'text',
    allowedIn: ['profile', 'project'],
    dockIcon: 'T',
    dockLabel: 'Text',
    defaultData: { body: 'A quote, a thought, a manifesto.' },
  },
  picture: {
    type: 'picture',
    allowedIn: ['profile', 'project'],
    dockIcon: '▦',
    dockLabel: 'Picture',
    defaultData: { url: null, caption: 'Caption' },
  },
  video: {
    type: 'video',
    allowedIn: ['profile', 'project'],
    dockIcon: '▶',
    dockLabel: 'Video',
    defaultData: { url: null, title: 'Video' },
  },
}

export const ALL_WIDGET_TYPES: readonly WidgetType[] = Object.keys(WIDGET_CATALOG) as WidgetType[]

/** Widget types allowed inside a given container kind. Used by the dock to
 *  hide add-buttons that wouldn't be accepted by the server. */
export function widgetsAllowedIn(kind: CanvasItemKind): readonly WidgetType[] {
  return ALL_WIDGET_TYPES.filter(t => WIDGET_CATALOG[t].allowedIn.includes(kind))
}

export function defaultData<T extends WidgetType>(type: T): WidgetData<T> {
  return WIDGET_CATALOG[type].defaultData
}
