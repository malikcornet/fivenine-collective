import { getClusterBounds, type Widget } from './types'

export function ClusterBounds({ widgets }: { widgets: Widget[] }) {
  const b = getClusterBounds(widgets)
  if (!b) return null
  return (
    <div
      className="cluster-bounds"
      style={{ left: b.left, top: b.top, width: b.width, height: b.height }}
      aria-hidden
    />
  )
}
