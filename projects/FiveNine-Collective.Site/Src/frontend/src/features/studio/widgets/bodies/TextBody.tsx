import type { TextWidget } from '../../model/widget'

export function TextBody({ widget }: { widget: TextWidget }) {
  return (
    <div className="cw-body cw-body--center">
      <p className="cw-quote">{widget.data.body}</p>
    </div>
  )
}
TextBody.displayName = 'TextBody'
