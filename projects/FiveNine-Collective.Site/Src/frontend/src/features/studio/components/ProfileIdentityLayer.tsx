import type { Profile } from '../api'
import { identityOpacity } from '../math'
import { getProfileBoundsList, type Widget } from '../model'

interface Props {
  widgets: Widget[]
  profiles: Profile[]
  zoom: number
}

export function ProfileIdentityLayer({ widgets, profiles, zoom }: Props) {
  const opacity = identityOpacity(zoom)
  if (opacity === 0) return null

  const groups = getProfileBoundsList(widgets)
  if (groups.length === 0) return null

  const byId = new Map(profiles.map(p => [p.id, p]))

  return (
    <>
      {groups.map(b => {
        const name = byId.get(b.profileId)?.name.trim()
        if (!name) return null
        const fontSize = Math.min(b.height * 0.5, (b.width / Math.max(name.length, 1)) * 1.6)
        return (
          <div
            key={b.profileId}
            className="studio-identity"
            style={{
              left: b.left,
              top: b.top,
              width: b.width,
              height: b.height,
              fontSize,
              opacity,
            }}
            aria-hidden
          >
            <span>{name}</span>
          </div>
        )
      })}
    </>
  )
}
ProfileIdentityLayer.displayName = 'ProfileIdentityLayer'
