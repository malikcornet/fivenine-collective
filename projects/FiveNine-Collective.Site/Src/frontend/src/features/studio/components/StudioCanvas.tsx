import type { Ref } from 'react'
import { ProfileBoundsLayer } from './ProfileBoundsLayer'
import { ProfileIdentityLayer } from './ProfileIdentityLayer'
import { StudioWidget } from './StudioWidget'
import { identityOpacity } from '../math'
import { STEP_X, STEP_Y, type DragState, type SnapTarget, type Widget } from '../model'
import type { SnapState } from '../hooks/useViewport'
import type { Profile } from '../api'

interface Props {
  viewportRef: Ref<HTMLDivElement>
  widgets: Widget[]
  profiles: Profile[]
  selectedId: string | null
  pan: { x: number; y: number }
  zoom: number
  drag: DragState
  snapState: SnapState
  atSnap: boolean
  onViewportPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: () => void
  onWidgetPointerDown: (e: React.PointerEvent, w: Widget) => void
  onResizePointerDown: (e: React.PointerEvent, w: Widget) => void
  onSelect: (id: string) => void
  isReadOnly: (w: Widget) => boolean
  onOpenSnap: (target: SnapTarget) => void
  snappedKey: string | null
  children?: React.ReactNode
}

export function StudioCanvas({
  viewportRef,
  widgets,
  profiles,
  selectedId,
  pan,
  zoom,
  drag,
  snapState,
  atSnap,
  onViewportPointerDown,
  onPointerMove,
  onPointerUp,
  onWidgetPointerDown,
  onResizePointerDown,
  onSelect,
  isReadOnly,
  onOpenSnap,
  snappedKey,
  children,
}: Props) {
  const bgSize = STEP_X * zoom
  const bgSizeY = STEP_Y * zoom
  const dotAlpha = Math.min(1, zoom * zoom)
  const identityFill = identityOpacity(zoom)

  return (
    <div
      ref={viewportRef}
      className="studio-viewport"
      data-snap-state={snapState}
      data-at-snap={atSnap || undefined}
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
        className="studio-canvas"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        <ProfileBoundsLayer
          widgets={widgets}
          zoom={zoom}
          snappedKey={snappedKey}
          onOpenSnap={onOpenSnap}
        />
        <ProfileIdentityLayer widgets={widgets} profiles={profiles} zoom={zoom} />
        <div
          style={{
            opacity: 1 - identityFill,
            pointerEvents: identityFill === 1 ? 'none' : undefined,
          }}
        >
          {widgets.map(w => (
            <StudioWidget
              key={w.id}
              widget={w}
              selected={selectedId === w.id}
              readOnly={isReadOnly(w)}
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
StudioCanvas.displayName = 'StudioCanvas'
