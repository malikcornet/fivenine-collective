import { DebugLabel } from '../../../components/DebugLabel'
import type { PeerCursor } from '../realtime/useStudioHub'

interface Props {
  peers: Record<string, PeerCursor>
  pan: { x: number; y: number }
  zoom: number
}

/**
 * Renders remote users' cursors as fixed-size dots overlaying the canvas.
 * Positions are in world space (pre-zoom/pan); we project to screen here so
 * the cursor itself doesn't scale with zoom.
 */
export function PeerCursorsLayer({ peers, pan, zoom }: Props) {
  const entries = Object.entries(peers)
  return (
    <div className="studio-peer-cursors" aria-hidden>
      <DebugLabel name="PeerCursorsLayer" />
      {entries.map(([id, c]) => {
        const left = c.x * zoom + pan.x
        const top = c.y * zoom + pan.y
        return (
          <div
            key={id}
            className="studio-peer-cursor"
            style={{ transform: `translate(${left}px, ${top}px)` }}
          >
            <DebugLabel name="PeerCursor" />
            <div className="studio-peer-cursor__dot" />
            {c.name ? <div className="studio-peer-cursor__label">{c.name}</div> : null}
          </div>
        )
      })}
    </div>
  )
}
PeerCursorsLayer.displayName = 'PeerCursorsLayer'
