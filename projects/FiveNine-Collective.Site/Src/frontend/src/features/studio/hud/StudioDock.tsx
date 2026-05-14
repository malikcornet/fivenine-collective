import { DebugLabel } from '../../../components/DebugLabel'
import type { CanvasItemKind } from '../model/canvasItem'
import type { OverviewLayout } from '../model/overviewLayout'
import type { WidgetType } from '../model/widget'
import { WIDGET_CATALOG, widgetsAllowedIn } from '../widgets/catalog'

type OverviewProps = {
  variant: 'overview'
  overviewLayout: OverviewLayout
  onChangeOverviewLayout: (layout: OverviewLayout) => void
  onRecenter: () => void
}

type InsideProps = {
  variant: 'inside'
  /** Container kind the user is currently editing inside. Drives which add-
   *  buttons appear — only widget kinds in the catalog's `allowedIn` for
   *  this container show up. */
  containerKind: CanvasItemKind
  /** Whether the user has edit rights on the active dimension. Hides the
   *  edit toggle entirely when false (viewing-only). */
  canEdit: boolean
  editMode: boolean
  onToggleEditMode: () => void
  canDelete: boolean
  onAdd: (type: WidgetType) => void
  onDelete: () => void
  onRecenter: () => void
}

type Props = OverviewProps | InsideProps

export function StudioDock(props: Props) {
  return (
    <div className="studio-dock" onPointerDown={e => e.stopPropagation()}>
      <DebugLabel name="StudioDock" />
      {props.variant === 'overview' ? <OverviewControls {...props} /> : <InsideControls {...props} />}
    </div>
  )
}
StudioDock.displayName = 'StudioDock'

function OverviewControls({
  overviewLayout,
  onChangeOverviewLayout,
  onRecenter,
}: OverviewProps) {
  return (
    <>
      <DockButton
        label="Explorer"
        icon="▦"
        onClick={() => onChangeOverviewLayout('explorer')}
        active={overviewLayout === 'explorer'}
      />
      <DockButton
        label="Space"
        icon="✦"
        onClick={() => onChangeOverviewLayout('space')}
        active={overviewLayout === 'space'}
      />
      {overviewLayout === 'space' && (
        <>
          <div className="studio-dock-divider" />
          <DockButton label="Recenter" icon="⊕" onClick={onRecenter} />
        </>
      )}
    </>
  )
}

function InsideControls({
  containerKind,
  canEdit,
  editMode,
  onToggleEditMode,
  canDelete,
  onAdd,
  onDelete,
  onRecenter,
}: InsideProps) {
  const allowedTypes = widgetsAllowedIn(containerKind)
  return (
    <>
      {canEdit && (
        <DockButton
          label="Edit"
          icon="✎"
          onClick={onToggleEditMode}
          active={editMode}
        />
      )}
      {editMode && (
        <>
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
        </>
      )}
      <div className="studio-dock-divider" />
      <DockButton label="Recenter" icon="⊕" onClick={onRecenter} />
    </>
  )
}

function DockButton({
  label,
  icon,
  onClick,
  disabled,
  danger,
  active,
}: {
  label: string
  icon: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      className={`studio-dock-btn${danger ? ' is-danger' : ''}${active ? ' is-active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      style={{ position: 'relative' }}
    >
      <DebugLabel name="DockBtn" />
      <span className="studio-dock-icon">{icon}</span>
      <span className="studio-dock-label">{label}</span>
    </button>
  )
}
DockButton.displayName = 'DockButton'
OverviewControls.displayName = 'OverviewControls'
InsideControls.displayName = 'InsideControls'
