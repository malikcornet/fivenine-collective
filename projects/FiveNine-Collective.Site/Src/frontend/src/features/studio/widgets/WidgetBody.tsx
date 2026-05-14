import type {
  PictureWidget,
  TextWidget,
  VideoWidget,
  Widget,
  WidgetData,
  WidgetType,
} from '../model/widget'
import { TextBody } from './bodies/TextBody'
import { PictureBody } from './bodies/PictureBody'
import { VideoBody } from './bodies/VideoBody'

interface Props {
  widget: Widget
  editMode: boolean
  onUpdateData: <T extends WidgetType>(id: string, data: WidgetData<T>) => void
}

/** Dispatches a Widget to its kind-specific body component. In edit mode
 *  bodies render inline editors that call back through `onUpdateData`. */
export function WidgetBody({ widget, editMode, onUpdateData }: Props) {
  switch (widget.type) {
    case 'text':
      return (
        <TextBody
          widget={widget}
          editMode={editMode}
          onChange={data => onUpdateData<'text'>((widget as TextWidget).id, data)}
        />
      )
    case 'picture':
      return (
        <PictureBody
          widget={widget}
          editMode={editMode}
          onChange={data => onUpdateData<'picture'>((widget as PictureWidget).id, data)}
        />
      )
    case 'video':
      return (
        <VideoBody
          widget={widget}
          editMode={editMode}
          onChange={data => onUpdateData<'video'>((widget as VideoWidget).id, data)}
        />
      )
  }
}
WidgetBody.displayName = 'WidgetBody'
