import type { PictureWidget } from '../../model/widget'

export function PictureBody({ widget }: { widget: PictureWidget }) {
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
}
PictureBody.displayName = 'PictureBody'
