import type { PictureWidget } from '../../model/widget'
import { stopWidgetPointer } from './pointerHelpers'

interface Props {
  widget: PictureWidget
  editMode: boolean
  onChange: (data: PictureWidget['data']) => void
}

export function PictureBody({ widget, editMode, onChange }: Props) {
  return (
    <div className="cw-body cw-picture">
      {widget.data.url ? (
        <img className="cw-picture-img" src={widget.data.url} alt={widget.data.caption} />
      ) : (
        <div className="cw-picture-placeholder" aria-hidden>
          <span>▦</span>
        </div>
      )}
      {editMode ? (
        <div className="cw-edit-fields" onPointerDown={stopWidgetPointer}>
          <input
            className="cw-input"
            type="url"
            value={widget.data.url ?? ''}
            onChange={e => onChange({ ...widget.data, url: e.target.value || null })}
            placeholder="Image URL"
            aria-label="Image URL"
          />
          <input
            className="cw-input"
            type="text"
            value={widget.data.caption}
            onChange={e => onChange({ ...widget.data, caption: e.target.value })}
            placeholder="Caption"
            aria-label="Caption"
          />
        </div>
      ) : (
        widget.data.caption && (
          <div className="cw-picture-caption">{widget.data.caption}</div>
        )
      )}
    </div>
  )
}
PictureBody.displayName = 'PictureBody'
