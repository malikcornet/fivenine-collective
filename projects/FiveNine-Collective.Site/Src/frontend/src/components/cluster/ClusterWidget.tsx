import { memo } from 'react'
import { WidgetContent } from './WidgetContent'
import { STEP_X, STEP_Y, type Widget } from './types'

interface Props {
  widget: Widget
  selected: boolean
  onPointerDown: (e: React.PointerEvent, w: Widget) => void
  onResizePointerDown: (e: React.PointerEvent, w: Widget) => void
  onSelect: (id: string) => void
}

function ClusterWidgetImpl({
  widget,
  selected,
  onPointerDown,
  onResizePointerDown,
  onSelect,
}: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${widget.type} widget`}
      aria-pressed={selected}
      className={`cluster-widget${selected ? ' is-selected' : ''}`}
      style={{
        left: widget.col * STEP_X,
        top: widget.row * STEP_Y,
        width: widget.w * STEP_X,
        height: widget.h * STEP_Y,
      }}
      onPointerDown={e => onPointerDown(e, widget)}
      onClick={e => {
        e.stopPropagation()
        onSelect(widget.id)
      }}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(widget.id)
        }
      }}
    >
      <WidgetContent widget={widget} />
      <div
        className="cluster-widget-resize"
        onPointerDown={e => onResizePointerDown(e, widget)}
        aria-label="Resize"
        role="presentation"
      />
    </div>
  )
}

export const ClusterWidget = memo(ClusterWidgetImpl)
