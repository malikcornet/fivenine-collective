import { getClusterBounds, type Widget } from './types'

interface Props {
  widgets: Widget[]
  zoom: number
}

export const FADE_START = 0.5
export const FADE_END = 0.2

export function identityOpacity(zoom: number) {
  return Math.max(0, Math.min(1, (FADE_START - zoom) / (FADE_START - FADE_END)))
}

export function ClusterIdentity({ widgets, zoom }: Props) {
  const b = getClusterBounds(widgets)
  if (!b) return null

  const profile = widgets.find(w => w.type === 'profile')
  const name = (profile?.data.name as string | undefined)?.trim()
  if (!name) return null

  const opacity = identityOpacity(zoom)
  if (opacity === 0) return null

  const fontSize = Math.min(b.height * 0.5, (b.width / Math.max(name.length, 1)) * 1.6)

  return (
    <div
      className="cluster-identity"
      style={{
        position: 'absolute',
        left: b.left,
        top: b.top,
        width: b.width,
        height: b.height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      <span
        style={{
          fontSize,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          color: 'var(--text)',
        }}
      >
        {name}
      </span>
    </div>
  )
}
