import type { RefObject } from 'react'
import { ClusterBounds } from './ClusterBounds'
import { ClusterIdentity } from './ClusterIdentity'
import { ClusterWidget } from './ClusterWidget'
import { identityOpacity } from './math'
import { STEP_X, STEP_Y, type DragState, type Widget } from './types'

interface Props {
  viewportRef: RefObject<HTMLDivElement | null>
  widgets: Widget[]
  selectedId: string | null
  pan: { x: number; y: number }
  zoom: number
  drag: DragState
  onViewportPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: () => void
  onWidgetPointerDown: (e: React.PointerEvent, w: Widget) => void
  onResizePointerDown: (e: React.PointerEvent, w: Widget) => void
  onSelect: (id: string) => void
  children?: React.ReactNode
}

export function ClusterCanvas({
  viewportRef,
  widgets,
  selectedId,
  pan,
  zoom,
  drag,
  onViewportPointerDown,
  onPointerMove,
  onPointerUp,
  onWidgetPointerDown,
  onResizePointerDown,
  onSelect,
  children,
}: Props) {
  const bgSize = STEP_X * zoom
  const bgSizeY = STEP_Y * zoom
  const dotAlpha = Math.min(1, zoom * zoom)
  const identityFill = identityOpacity(zoom)

  return (
    <div
      ref={viewportRef}
      className="cluster-viewport"
      onPointerDown={onViewportPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        backgroundImage: `radial-gradient(circle, rgba(34,34,34,${dotAlpha}) 1px, transparent 1px)`,
        backgroundSize: `${bgSize}px ${bgSizeY}px`,
        backgroundPosition: `${pan.x - bgSize / 2}px ${pan.y - bgSizeY / 2}px`,
        cursor: drag?.kind === 'pan' ? 'grabbing' : 'grab',
      }}
    >
      <div
        className="cluster-canvas"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        <ClusterBounds widgets={widgets} />
        <ClusterIdentity widgets={widgets} zoom={zoom} />
        <div
          style={{
            opacity: 1 - identityFill,
            pointerEvents: identityFill === 1 ? 'none' : undefined,
          }}
        >
          {widgets.map(w => (
            <ClusterWidget
              key={w.id}
              widget={w}
              selected={selectedId === w.id}
              onPointerDown={onWidgetPointerDown}
              onResizePointerDown={onResizePointerDown}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
      {children}
    </div>
  )
}
