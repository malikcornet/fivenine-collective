import type { Widget } from '../model/widget'
import { TextBody } from './bodies/TextBody'
import { PictureBody } from './bodies/PictureBody'
import { VideoBody } from './bodies/VideoBody'

/** Dispatches a Widget to its kind-specific body component. */
export function WidgetBody({ widget }: { widget: Widget }) {
  switch (widget.type) {
    case 'text':
      return <TextBody widget={widget} />
    case 'picture':
      return <PictureBody widget={widget} />
    case 'video':
      return <VideoBody widget={widget} />
  }
}
WidgetBody.displayName = 'WidgetBody'
