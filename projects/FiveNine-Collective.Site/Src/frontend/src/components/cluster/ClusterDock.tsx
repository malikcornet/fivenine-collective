import type { WidgetType } from './types'

interface Props {
  canDelete: boolean
  onAdd: (type: WidgetType) => void
  onDelete: () => void
  onRecenter: () => void
}

export function ClusterDock({ canDelete, onAdd, onDelete, onRecenter }: Props) {
  return (
    <div className="cluster-dock" onPointerDown={e => e.stopPropagation()}>
      <DockButton label="About" icon="i" onClick={() => onAdd('about')} />
      <DockButton label="Text" icon="T" onClick={() => onAdd('text')} />
      <DockButton label="Links" icon="↗" onClick={() => onAdd('links')} />
      <DockButton label="Gallery" icon="▦" onClick={() => onAdd('gallery')} />
      <DockButton label="Socials" icon="@" onClick={() => onAdd('socials')} />
      <DockButton label="Video" icon="▶" onClick={() => onAdd('video')} />
      <DockButton label="Project" icon="◆" onClick={() => onAdd('project')} />
      <div className="cluster-dock-divider" />
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
      className={`cluster-dock-btn${danger ? ' is-danger' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <span className="cluster-dock-icon">{icon}</span>
      <span className="cluster-dock-label">{label}</span>
    </button>
  )
}
