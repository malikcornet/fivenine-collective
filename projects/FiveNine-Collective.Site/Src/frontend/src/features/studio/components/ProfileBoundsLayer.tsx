import { getSnapTargets, type SnapTarget, type Widget } from '../model'

interface Props {
  widgets: Widget[]
  zoom: number
  snappedKey: string | null
  onOpenSnap: (target: SnapTarget) => void
}

/** Renders a dashed bounds rect + zoom-in button for every snap target
 *  (profiles today, projects later). The component sits inside the zoomed
 *  canvas, so the button counter-scales to stay a constant pixel size.
 *  When the target is already snapped, the button is hidden — the navbar
 *  breadcrumb provides the exit path. */
export function ProfileBoundsLayer({ widgets, zoom, snappedKey, onOpenSnap }: Props) {
  const targets = getSnapTargets(widgets)
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
            style={{ left: b.left, top: b.top, width: b.width, height: b.height }}
            aria-hidden
          >
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
                aria-label={`Open ${t.kind}`}
                title={`Open ${t.kind}`}
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
ProfileBoundsLayer.displayName = 'ProfileBoundsLayer'
