import { DebugLabel } from '../../../components/DebugLabel'

interface Props {
  zoom: number
}

export function StudioHud({ zoom }: Props) {
  return (
    <div className="studio-hud">
      <DebugLabel name="StudioHud" />
      <span>{Math.round(zoom * 100)}%</span>
      <span className="studio-hud-hint">
        drag empty space to pan • scroll or Ctrl +/- to zoom • Delete to remove
      </span>
    </div>
  )
}
StudioHud.displayName = 'StudioHud'
