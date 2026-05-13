import { useEffect, type RefObject } from 'react'
import { ClusterBounds } from './ClusterBounds'
import { ClusterIdentity, identityOpacity } from './ClusterIdentity'
import { ClusterWidget } from './ClusterWidget'
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
  onZoom: (factor: number, mouseX: number, mouseY: number) => void
  children?: React.ReactNode
}

export function ClusterCanvas({
  viewportRef, widgets, selectedId, pan, zoom, drag,
  onViewportPointerDown, onPointerMove, onPointerUp,
  onWidgetPointerDown, onResizePointerDown, onSelect,
  onZoom, children,
}: Props) {
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      onZoom(factor, mx, my)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onZoom, viewportRef])

  const bgSize = STEP_X * zoom
  const bgSizeY = STEP_Y * zoom
  const dotAlpha = Math.min(1, zoom * zoom)

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
            opacity: 1 - identityOpacity(zoom),
            pointerEvents: identityOpacity(zoom) === 1 ? 'none' : undefined,
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
