import type { VideoWidget } from '../../model/widget'
import { stopWidgetPointer } from './pointerHelpers'

interface Props {
  widget: VideoWidget
  editMode: boolean
  onChange: (data: VideoWidget['data']) => void
}

export function VideoBody({ widget, editMode, onChange }: Props) {
  return (
    <div className="cw-body cw-body--center cw-video">
      <div className="cw-video-play" aria-hidden>
        ▶
      </div>
      {editMode ? (
        <div className="cw-edit-fields" onPointerDown={stopWidgetPointer}>
          <input
            className="cw-input"
            type="url"
            value={widget.data.url ?? ''}
            onChange={e => onChange({ ...widget.data, url: e.target.value || null })}
            placeholder="Video URL"
            aria-label="Video URL"
          />
          <input
            className="cw-input"
            type="text"
            value={widget.data.title}
            onChange={e => onChange({ ...widget.data, title: e.target.value })}
            placeholder="Title"
            aria-label="Video title"
          />
        </div>
      ) : (
        widget.data.title && <div className="cw-video-title">{widget.data.title}</div>
      )}
    </div>
  )
}
VideoBody.displayName = 'VideoBody'
