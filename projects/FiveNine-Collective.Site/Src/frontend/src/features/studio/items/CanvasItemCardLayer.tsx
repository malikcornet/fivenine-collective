import { DebugLabel } from '../../../components/DebugLabel'
import { identityOpacity } from '../canvas/math'
import { getCanvasItemBoundsList } from '../model/bounds'
import type { CanvasItem } from '../model/canvasItem'
import type { Widget } from '../model/widget'
import { CanvasItemCard } from './CanvasItemCard'

const CARD_WIDTH = 800
const CARD_HEIGHT = 1000

interface Props {
  widgets: Widget[]
  canvasItems: CanvasItem[]
  zoom: number
}

/** Positions a fixed-size card on top of every CanvasItem's bounds. The card
 *  fades in below the {@link identityOpacity} threshold via a CSS transition;
 *  kept mounted in both states so the animation runs both directions. */
export function CanvasItemCardLayer({ widgets, canvasItems, zoom }: Props) {
  const opacity = identityOpacity(zoom)
  const groups = getCanvasItemBoundsList(widgets)
  if (groups.length === 0) return null

  const byId = new Map(canvasItems.map(i => [i.id, i]))

  return (
    <>
      {groups.map(b => {
        const item = byId.get(b.canvasItemId)
        if (!item) return null
        // Fixed-size card centered on the CanvasItem's bounds. Decoupling
        // card size from bounds size means every container gets the same
        // badge dimensions regardless of how many widgets it has.
        const cardLeft = b.left + b.width / 2 - CARD_WIDTH / 2
        const cardTop = b.top + b.height / 2 - CARD_HEIGHT / 2
        return (
          <div
            key={b.canvasItemId}
            className="studio-identity"
            data-kind={item.kind}
            data-hidden={opacity === 0 || undefined}
            style={{
              left: cardLeft,
              top: cardTop,
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
            }}
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
