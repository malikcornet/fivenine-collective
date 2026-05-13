import type { WidgetType } from '../model'

interface Props {
  canDelete: boolean
  onAdd: (type: WidgetType) => void
  onDelete: () => void
  onRecenter: () => void
}

export function StudioDock({ canDelete, onAdd, onDelete, onRecenter }: Props) {
  return (
    <div className="studio-dock" onPointerDown={e => e.stopPropagation()}>
      <DockButton label="Text" icon="T" onClick={() => onAdd('text')} />
      <DockButton label="Picture" icon="▦" onClick={() => onAdd('picture')} />
      <DockButton label="Video" icon="▶" onClick={() => onAdd('video')} />
      <div className="studio-dock-divider" />
      <DockButton label="Delete" icon="✕" onClick={onDelete} disabled={!canDelete} danger />
      <DockButton label="Recenter" icon="⊕" onClick={onRecenter} />
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
    >
      <span className="studio-dock-icon">{icon}</span>
      <span className="studio-dock-label">{label}</span>
    </button>
  )
}
StudioDock.displayName = 'StudioDock'
DockButton.displayName = 'DockButton'
