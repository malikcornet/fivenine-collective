import { DebugLabel } from '../../../components/DebugLabel'
import { identityOpacity } from '../canvas/math'
import { getSnapTargets, type SnapTarget } from '../model/bounds'
import { kindLabel } from '../model/canvasItem'
import type { Widget } from '../model/widget'

interface Props {
  widgets: Widget[]
  zoom: number
  snappedKey: string | null
  onOpenSnap: (target: SnapTarget) => void
}

/** Renders a dashed bounds rect + zoom-in button for every CanvasItem
 *  (profiles and projects). The component sits inside the zoomed canvas, so
 *  the button counter-scales to stay a constant pixel size. When the target
 *  is already snapped, the button is hidden — the navbar breadcrumb provides
 *  the exit path. Hidden entirely below the identity zoom threshold so the
 *  card view isn't framed by a dashed rectangle. */
export function CanvasItemBoundsLayer({ widgets, zoom, snappedKey, onOpenSnap }: Props) {
  const targets = getSnapTargets(widgets)
  // Bounds belong to the widget view — when the card takes over at low zoom
  // they fade out alongside the widgets.
  const hidden = identityOpacity(zoom) === 1
  return (
    <>
      {targets.map(t => {
        const b = t.bounds
        const key = `${t.kind}:${t.id}`
        const isSnapped = key === snappedKey
        return (
          <div
            key={key}
            className="studio-bounds"
            data-snap-kind={t.kind}
            data-hidden={hidden || undefined}
            style={{
              left: b.left,
              top: b.top,
              width: b.width,
              height: b.height,
              opacity: hidden ? 0 : 1,
              pointerEvents: hidden ? 'none' : undefined,
            }}
            aria-hidden
          >
            <DebugLabel name={`CanvasItemBounds(${t.kind})`} />
            {!isSnapped && (
              <button
                type="button"
                className="studio-bounds-fs"
                style={{ transform: `scale(${1 / zoom})`, transformOrigin: '100% 0%' }}
                onClick={e => {
                  e.stopPropagation()
                  onOpenSnap(t)
                }}
                onPointerDown={e => e.stopPropagation()}
                aria-label={`Open ${kindLabel[t.kind]}`}
                title={`Open ${kindLabel[t.kind]}`}
              >
                <span aria-hidden>⤢</span>
              </button>
            )}
          </div>
        )
      })}
    </>
  )
}
CanvasItemBoundsLayer.displayName = 'CanvasItemBoundsLayer'
