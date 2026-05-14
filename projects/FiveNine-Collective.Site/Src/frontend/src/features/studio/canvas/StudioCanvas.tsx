import { useMemo, type Ref } from 'react'
import { DebugLabel } from '../../../components/DebugLabel'
import { CanvasItemCardLayer } from '../items/CanvasItemCardLayer'
import { StudioWidget } from '../widgets/StudioWidget'
import { STEP_X, STEP_Y } from '../model/bounds'
import type { DragState, Widget, WidgetData, WidgetType } from '../model/widget'
import type { CanvasItem } from '../model/canvasItem'
import type { LayoutPosition } from '../model/overviewLayout'
import type { SnapState } from './useViewport'

export type StudioMode = 'overview' | 'inside'

interface Props {
  viewportRef: Ref<HTMLDivElement>
  /** Full widget list — used for card positioning in overview mode. The
   *  actual widget rendering is filtered to the active dimension. */
  widgets: Widget[]
  canvasItems: CanvasItem[]
  selectedId: string | null
  pan: { x: number; y: number }
  zoom: number
  drag: DragState
  snapState: SnapState
  mode: StudioMode
  /** Identity of the CanvasItem the user is "inside". Null in overview. */
  dimensionId: string | null
  /** Per-item canvas positions for the overview cards. Used by the layout
   *  switcher (explorer / space). */
  cardPositions?: Map<string, LayoutPosition>
  onViewportPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: () => void
  onWidgetPointerDown: (e: React.PointerEvent, w: Widget) => void
  onResizePointerDown: (e: React.PointerEvent, w: Widget) => void
  onSelect: (id: string) => void
  isReadOnly: (w: Widget) => boolean
  editMode: boolean
  onUpdateData: <T extends WidgetType>(id: string, data: WidgetData<T>) => void
  onEnterDimension: (id: string) => void
  children?: React.ReactNode
}

export function StudioCanvas({
  viewportRef,
  widgets,
  canvasItems,
  selectedId,
  pan,
  zoom,
  drag,
  snapState,
  mode,
  dimensionId,
  cardPositions,
  onViewportPointerDown,
  onPointerMove,
  onPointerUp,
  onWidgetPointerDown,
  onResizePointerDown,
  onSelect,
  isReadOnly,
  editMode,
  onUpdateData,
  onEnterDimension,
  children,
}: Props) {
  const bgSize = STEP_X * zoom
  const bgSizeY = STEP_Y * zoom
  const dotAlpha = Math.min(1, zoom * zoom)

  // In overview mode no widgets are rendered (the constellation of cards is
  // the whole experience). In inside mode only the active dimension's
  // widgets render — no peeking at the rest of the canvas.
  const visibleWidgets = useMemo(() => {
    if (mode === 'overview') return []
    return widgets.filter(w => w.canvasItemId === dimensionId)
  }, [widgets, mode, dimensionId])

  return (
    <div
      ref={viewportRef}
      className="studio-viewport"
      data-snap-state={snapState}
      data-mode={mode}
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
      <DebugLabel name="StudioCanvas" />
      <div
        className="studio-canvas"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        {mode === 'overview' && (
          <CanvasItemCardLayer
            widgets={widgets}
            canvasItems={canvasItems}
            zoom={zoom}
            alwaysVisible
            positions={cardPositions}
            onEnter={onEnterDimension}
          />
        )}
        {mode === 'inside' && (
          <div className="studio-widgets-layer">
            {visibleWidgets.map(w => (
              <StudioWidget
                key={w.id}
                widget={w}
                selected={selectedId === w.id}
                readOnly={isReadOnly(w)}
                editMode={editMode}
                onPointerDown={onWidgetPointerDown}
                onResizePointerDown={onResizePointerDown}
                onSelect={onSelect}
                onUpdateData={onUpdateData}
              />
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
StudioCanvas.displayName = 'StudioCanvas'
