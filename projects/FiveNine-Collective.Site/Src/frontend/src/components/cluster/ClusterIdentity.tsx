import { identityOpacity } from './math'
import { getClusterBounds, type Widget } from './types'

interface Props {
  widgets: Widget[]
  zoom: number
}

export function ClusterIdentity({ widgets, zoom }: Props) {
  const b = getClusterBounds(widgets)
  if (!b) return null

  const profile = widgets.find(w => w.type === 'profile')
  const name = profile?.data.name.trim()
  if (!name) return null

  const opacity = identityOpacity(zoom)
  if (opacity === 0) return null

  const fontSize = Math.min(b.height * 0.5, (b.width / Math.max(name.length, 1)) * 1.6)

  return (
    <div
      className="cluster-identity"
      style={{
        left: b.left,
        top: b.top,
        width: b.width,
        height: b.height,
        fontSize,
        opacity,
      }}
      aria-hidden
    >
      <span>{name}</span>
    </div>
  )
}
