import { DebugLabel } from '../../../components/DebugLabel'
import type { CanvasItemKind } from '../model/canvasItem'
import type { WidgetType } from '../model/widget'
import { WIDGET_CATALOG, widgetsAllowedIn } from '../widgets/catalog'

interface Props {
  /** Container kind the user is currently editing inside. Drives which add-
   *  buttons appear — only widget kinds in the catalog's `allowedIn` for
   *  this container show up. */
  containerKind: CanvasItemKind
  canDelete: boolean
  onAdd: (type: WidgetType) => void
  onDelete: () => void
  onRecenter: () => void
  /** Frame the viewport on the user's profile bounds. */
  onSnapToProfile: () => void
}

export function StudioDock({
  containerKind,
  canDelete,
  onAdd,
  onDelete,
  onRecenter,
  onSnapToProfile,
}: Props) {
  const allowedTypes = widgetsAllowedIn(containerKind)
  return (
    <div className="studio-dock" onPointerDown={e => e.stopPropagation()}>
      <DebugLabel name="StudioDock" />
      {allowedTypes.map(t => {
        const entry = WIDGET_CATALOG[t]
        return (
          <DockButton
            key={t}
            label={entry.dockLabel}
            icon={entry.dockIcon}
            onClick={() => onAdd(t)}
          />
        )
      })}
      <div className="studio-dock-divider" />
      <DockButton label="Delete" icon="✕" onClick={onDelete} disabled={!canDelete} danger />
      <DockButton label="Recenter" icon="⊕" onClick={onRecenter} />
      <DockButton label="Snap" icon="◉" onClick={onSnapToProfile} />
    </div>
  )
}

function DockButton({
  label,
  icon,
  onClick,
  disabled,
  danger,
}: {
  label: string
  icon: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      className={`studio-dock-btn${danger ? ' is-danger' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{ position: 'relative' }}
    >
      <DebugLabel name="DockBtn" />
      <span className="studio-dock-icon">{icon}</span>
      <span className="studio-dock-label">{label}</span>
    </button>
  )
}
StudioDock.displayName = 'StudioDock'
DockButton.displayName = 'DockButton'
