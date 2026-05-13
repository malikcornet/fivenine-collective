import type { Widget } from '../model'

export function WidgetBody({ widget }: { widget: Widget }) {
  switch (widget.type) {
    case 'text':
      return (
        <div className="cw-body cw-body--center">
          <p className="cw-quote">{widget.data.body}</p>
        </div>
      )
    case 'picture':
      return (
        <div className="cw-body cw-picture">
          {widget.data.url ? (
            <img className="cw-picture-img" src={widget.data.url} alt={widget.data.caption} />
          ) : (
            <div className="cw-picture-placeholder" aria-hidden>
              <span>▦</span>
            </div>
          )}
          {widget.data.caption && (
            <div className="cw-picture-caption">{widget.data.caption}</div>
          )}
        </div>
      )
    case 'video':
      return (
        <div className="cw-body cw-body--center cw-video">
          <div className="cw-video-play" aria-hidden>
            ▶
          </div>
          {widget.data.title && <div className="cw-video-title">{widget.data.title}</div>}
        </div>
      )
  }
}
WidgetBody.displayName = 'WidgetBody'
