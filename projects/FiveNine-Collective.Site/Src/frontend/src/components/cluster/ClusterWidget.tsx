import { WidgetContent } from './WidgetContent'
import { STEP_X, STEP_Y, type Widget } from './types'

interface Props {
  widget: Widget
  selected: boolean
  onPointerDown: (e: React.PointerEvent, w: Widget) => void
  onResizePointerDown: (e: React.PointerEvent, w: Widget) => void
  onSelect: (id: string) => void
}

export function ClusterWidget({ widget, selected, onPointerDown, onResizePointerDown, onSelect }: Props) {
  return (
    <div
      className={`cluster-widget${selected ? ' is-selected' : ''}`}
      style={{
        left: widget.col * STEP_X,
        top: widget.row * STEP_Y,
        width: widget.w * STEP_X,
        height: widget.h * STEP_Y,
      }}
      onPointerDown={(e) => onPointerDown(e, widget)}
      onClick={(e) => { e.stopPropagation(); onSelect(widget.id) }}
    >
      <WidgetContent widget={widget} />
      <div
        className="cluster-widget-resize"
        onPointerDown={(e) => onResizePointerDown(e, widget)}
        aria-label="Resize"
      />
    </div>
  )
}
