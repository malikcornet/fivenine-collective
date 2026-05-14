import type { TextWidget } from '../../model/widget'
import { stopWidgetPointer } from './pointerHelpers'

interface Props {
  widget: TextWidget
  editMode: boolean
  onChange: (data: TextWidget['data']) => void
}

export function TextBody({ widget, editMode, onChange }: Props) {
  if (editMode) {
    return (
      <div className="cw-body cw-body--center">
        <textarea
          className="cw-quote cw-input cw-input--multiline"
          value={widget.data.body}
          onChange={e => onChange({ body: e.target.value })}
          onPointerDown={stopWidgetPointer}
          placeholder="A quote, a thought, a manifesto…"
        />
      </div>
    )
  }
  return (
    <div className="cw-body cw-body--center">
      <p className="cw-quote">{widget.data.body}</p>
    </div>
  )
}
TextBody.displayName = 'TextBody'
