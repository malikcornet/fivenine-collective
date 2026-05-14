import { DebugLabel } from '../../../../components/DebugLabel'
import type { ProjectItem } from '../../model/canvasItem'

interface Props {
  project: ProjectItem
  /** World-space bounds the card should fill. Used to scale typography so
   *  the card reads at the zoom level where the identity layer appears. */
  width: number
  height: number
}

/** Deterministic accent hue derived from the project id so each project gets
 *  a distinct band of color without needing a stored value. */
function hueFor(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h % 360
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function ProjectCard({ project, width, height }: Props) {
  // Typography scales off the smaller dimension. ProjectCard is portrait-
  // oriented (matching ProfileCard) but with a horizontal title block
  // instead of a centered name + avatar.
  const base = Math.min(width, height)
  const titleSize = base * 0.075
  const labelSize = base * 0.024
  const descSize = base * 0.034
  const metaSize = base * 0.028
  const pad = base * 0.06
  const radius = base * 0.045
  const stripeHeight = base * 0.14
  const collaboratorSize = base * 0.07

  const name = project.name.trim() || 'Untitled project'
  const description = project.description?.trim() ?? ''
  const collaborators = project.collaboratorSubs
  const hue = hueFor(project.id)

  return (
    <div
      className="studio-project-card"
      style={{
        borderRadius: radius,
        // Project gets its own accent so it visually contrasts with the
        // brand accent that profiles use.
        ['--project-accent' as string]: `hsl(${hue} 78% 60%)`,
      }}
    >
      <DebugLabel name="ProjectCard" />

      <div
        className="studio-project-card__stripe"
        style={{ height: stripeHeight, paddingInline: pad }}
        aria-hidden
      >
        <span
          className="studio-project-card__kind"
          style={{ fontSize: labelSize }}
        >
          Project · #{project.id.slice(0, 4).toUpperCase()}
        </span>
        <span
          className="studio-project-card__count"
          style={{ fontSize: labelSize }}
        >
          {collaborators.length} collab{collaborators.length === 1 ? '' : 's'}
        </span>
      </div>

      <div
        className="studio-project-card__body"
        style={{ padding: pad, gap: pad * 0.6 }}
      >
        <div className="studio-project-card__title" style={{ fontSize: titleSize }}>
          {name}
        </div>

        {description && (
          <div className="studio-project-card__description" style={{ fontSize: descSize }}>
            {description}
          </div>
        )}

        <div className="studio-project-card__divider" aria-hidden />

        <div className="studio-project-card__meta-row" style={{ fontSize: metaSize }}>
          <span className="studio-project-card__meta-label">Crew</span>
          <div
            className="studio-project-card__avatars"
            style={{ gap: collaboratorSize * 0.2 }}
          >
            {collaborators.length === 0 ? (
              <span className="studio-project-card__empty">No collaborators yet</span>
            ) : (
              collaborators.slice(0, 5).map(sub => (
                <div
                  key={sub}
                  className="studio-project-card__avatar"
                  style={{
                    width: collaboratorSize,
                    height: collaboratorSize,
                    fontSize: collaboratorSize * 0.42,
                  }}
                  title={sub}
                  aria-hidden
                >
                  {initialsFor(sub)}
                </div>
              ))
            )}
            {collaborators.length > 5 && (
              <div
                className="studio-project-card__avatar studio-project-card__avatar--more"
                style={{
                  width: collaboratorSize,
                  height: collaboratorSize,
                  fontSize: collaboratorSize * 0.36,
                }}
                aria-hidden
              >
                +{collaborators.length - 5}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="studio-project-card__footer"
        style={{ paddingInline: pad, paddingBottom: pad * 0.6 }}
        aria-hidden
      >
        <span className="studio-project-card__footer-text" style={{ fontSize: labelSize }}>
          {project.id.slice(0, 12).toUpperCase()}
        </span>
        <span className="studio-project-card__footer-tag" style={{ fontSize: labelSize }}>
          FiveNine
        </span>
      </div>
    </div>
  )
}
ProjectCard.displayName = 'ProjectCard'
