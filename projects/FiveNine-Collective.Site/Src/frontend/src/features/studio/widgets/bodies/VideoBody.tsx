import type { VideoWidget } from '../../model/widget'

export function VideoBody({ widget }: { widget: VideoWidget }) {
  return (
    <div className="cw-body cw-body--center cw-video">
      <div className="cw-video-play" aria-hidden>
        ▶
      </div>
      {widget.data.title && <div className="cw-video-title">{widget.data.title}</div>}
    </div>
  )
}
VideoBody.displayName = 'VideoBody'
