import { DebugLabel } from '../../../components/DebugLabel'
import { identityOpacity } from '../canvas/math'
import { getCanvasItemBoundsList } from '../model/bounds'
import type { CanvasItem } from '../model/canvasItem'
import type { LayoutPosition } from '../model/overviewLayout'
import type { Widget } from '../model/widget'
import { CanvasItemCard } from './CanvasItemCard'

const CARD_WIDTH = 1400
const CARD_HEIGHT = 1750

interface Props {
  widgets: Widget[]
  canvasItems: CanvasItem[]
  zoom: number
  /** In overview mode the cards are the only thing on the canvas — opacity
   *  threshold doesn't apply. In inside mode (a dimension) the cards are
   *  hidden entirely. */
  alwaysVisible?: boolean
  /** Optional override placing each card at an explicit canvas-space center.
   *  When provided, takes precedence over widget-bounds-derived positions —
   *  used by the overview layout switcher (explorer / space). */
  positions?: Map<string, LayoutPosition>
  /** Click handler that dives into the item's dimension. */
  onEnter?: (id: string) => void
}

/** Positions a fixed-size card on top of every CanvasItem's bounds (or at
 *  the explicit `positions` override when present). In overview mode every
 *  card is a clickable button that dives into that item's dimension. */
export function CanvasItemCardLayer({
  widgets,
  canvasItems,
  zoom,
  alwaysVisible = false,
  positions,
  onEnter,
}: Props) {
  const opacity = alwaysVisible ? 1 : identityOpacity(zoom)
  const groups = getCanvasItemBoundsList(widgets)
  if (groups.length === 0) return null

  const byId = new Map(canvasItems.map(i => [i.id, i]))

  return (
    <>
      {groups.map(b => {
        const item = byId.get(b.canvasItemId)
        if (!item) return null
        const override = positions?.get(b.canvasItemId)
        const centerX = override ? override.x : b.left + b.width / 2
        const centerY = override ? override.y : b.top + b.height / 2
        const cardLeft = centerX - CARD_WIDTH / 2
        const cardTop = centerY - CARD_HEIGHT / 2
        const clickable = Boolean(onEnter)
        const commonStyle: React.CSSProperties = {
          left: cardLeft,
          top: cardTop,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
        }
        if (clickable) {
          return (
            <button
              key={b.canvasItemId}
              type="button"
              className="studio-identity studio-identity--clickable"
              data-kind={item.kind}
              data-hidden={opacity === 0 || undefined}
              style={commonStyle}
              onClick={e => {
                e.stopPropagation()
                onEnter!(b.canvasItemId)
              }}
              onPointerDown={e => e.stopPropagation()}
              aria-label={`Enter ${item.name || item.kind} dimension`}
            >
              <DebugLabel name={`CanvasItemCard(${item.kind})`} />
              <CanvasItemCard item={item} width={CARD_WIDTH} height={CARD_HEIGHT} />
            </button>
          )
        }
        return (
          <div
            key={b.canvasItemId}
            className="studio-identity"
            data-kind={item.kind}
            data-hidden={opacity === 0 || undefined}
            style={commonStyle}
            aria-hidden
          >
            <DebugLabel name={`CanvasItemCard(${item.kind})`} />
            <CanvasItemCard item={item} width={CARD_WIDTH} height={CARD_HEIGHT} />
          </div>
        )
      })}
    </>
  )
}
CanvasItemCardLayer.displayName = 'CanvasItemCardLayer'
