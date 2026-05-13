import { memo } from 'react'
import { WidgetBody } from './WidgetBody'
import { STEP_X, STEP_Y, type Widget } from '../model'

interface Props {
  widget: Widget
  selected: boolean
  readOnly?: boolean
  onPointerDown: (e: React.PointerEvent, w: Widget) => void
  onResizePointerDown: (e: React.PointerEvent, w: Widget) => void
  onSelect: (id: string) => void
}

function StudioWidgetImpl({
  widget,
  selected,
  readOnly,
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
      className={`studio-widget${selected ? ' is-selected' : ''}${readOnly ? ' is-readonly' : ''}`}
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
      <WidgetBody widget={widget} />
      <div
        className="studio-widget-resize"
        onPointerDown={e => onResizePointerDown(e, widget)}
        aria-label="Resize"
        role="presentation"
      />
    </div>
  )
}

export const StudioWidget = memo(StudioWidgetImpl)
StudioWidget.displayName = 'StudioWidget'
