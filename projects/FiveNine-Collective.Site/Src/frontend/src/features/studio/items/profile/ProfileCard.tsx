import { DebugLabel } from '../../../../components/DebugLabel'
import type { ProfileItem } from '../../model/canvasItem'

interface Props {
  profile: ProfileItem
  /** World-space bounds the card should fill. Used to scale typography so
   *  the card reads at the zoom level where the identity layer appears. */
  width: number
  height: number
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

function handleFor(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
  return `@${slug || 'member'}`
}

/** Deterministic pseudo-stats derived from the profile id so each card gets a
 *  stable, plausible-looking set of numbers until the API exposes real ones. */
function fauxStats(id: string): { posts: number; followers: number; following: number } {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  const posts = 12 + (h % 240)
  const followers = 80 + ((h >>> 7) % 9800)
  const following = 30 + ((h >>> 13) % 700)
  return { posts, followers, following }
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return String(n)
}

export function ProfileCard({ profile, width, height }: Props) {
  // Typography scales off the smaller dimension so portrait and landscape
  // bounds both look balanced. The numeric factors are tuned for the
  // canvas zoom range where the identity layer is visible.
  const base = Math.min(width, height)
  const nameSize = base * 0.085
  const handleSize = base * 0.035
  const roleSize = base * 0.032
  const bioSize = base * 0.032
  const statNumberSize = base * 0.048
  const statLabelSize = base * 0.022
  const avatarSize = base * 0.24
  const pad = base * 0.05
  const radius = base * 0.05
  const headerHeight = base * 0.14
  const lanyardHoleW = base * 0.14
  const lanyardHoleH = base * 0.028

  const name = profile.name.trim() || 'Unnamed'
  const role = profile.role?.trim() ?? ''
  const bio = profile.bio?.trim() ?? ''
  const handle = handleFor(name)
  const stats = fauxStats(profile.id)

  return (
    <div
      className="studio-profile-card"
      style={{ borderRadius: radius, padding: 0 }}
    >
      <DebugLabel name="ProfileCard" />

      <div
        className="studio-profile-card__lanyard"
        style={{
          width: lanyardHoleW,
          height: lanyardHoleH,
          top: lanyardHoleH * 1.4,
          borderRadius: lanyardHoleH,
        }}
        aria-hidden
      />

      <div
        className="studio-profile-card__header"
        style={{ height: headerHeight, paddingInline: pad }}
      >
        <span
          className="studio-profile-card__badge-label"
          style={{ fontSize: statLabelSize }}
        >
          FiveNine · Member
        </span>
        <span
          className="studio-profile-card__badge-id"
          style={{ fontSize: statLabelSize * 0.9 }}
        >
          #{profile.id.slice(0, 4).toUpperCase()}
        </span>
      </div>

      <div
        className="studio-profile-card__body"
        style={{ padding: pad, gap: pad * 0.5, marginTop: -headerHeight * 0.45 }}
      >
        <div
          className="studio-profile-card__avatar"
          style={{
            width: avatarSize,
            height: avatarSize,
            fontSize: avatarSize * 0.42,
            borderWidth: Math.max(2, base * 0.008),
          }}
          aria-hidden
        >
          {initialsFor(name)}
        </div>

        <div className="studio-profile-card__name" style={{ fontSize: nameSize }}>
          {name}
        </div>

        <div className="studio-profile-card__handle" style={{ fontSize: handleSize }}>
          {handle}
        </div>

        {role && (
          <div
            className="studio-profile-card__role-chip"
            style={{
              fontSize: roleSize,
              paddingInline: pad * 0.8,
              paddingBlock: pad * 0.25,
              borderRadius: 999,
            }}
          >
            {role}
          </div>
        )}

        {bio && (
          <div className="studio-profile-card__bio" style={{ fontSize: bioSize }}>
            {bio}
          </div>
        )}

        <div
          className="studio-profile-card__stats"
          style={{ gap: pad, marginTop: pad * 0.3 }}
        >
          <Stat
            value={formatCount(stats.posts)}
            label="Posts"
            valueSize={statNumberSize}
            labelSize={statLabelSize}
          />
          <Stat
            value={formatCount(stats.followers)}
            label="Followers"
            valueSize={statNumberSize}
            labelSize={statLabelSize}
          />
          <Stat
            value={formatCount(stats.following)}
            label="Following"
            valueSize={statNumberSize}
            labelSize={statLabelSize}
          />
        </div>
      </div>

      <div
        className="studio-profile-card__barcode"
        style={{ height: base * 0.06, paddingInline: pad, paddingBottom: pad * 0.5 }}
        aria-hidden
      >
        <div className="studio-profile-card__barcode-bars" />
        <span
          className="studio-profile-card__barcode-text"
          style={{ fontSize: statLabelSize * 0.85 }}
        >
          {profile.id.slice(0, 12).toUpperCase()}
        </span>
      </div>
    </div>
  )
}
ProfileCard.displayName = 'ProfileCard'

function Stat({
  value,
  label,
  valueSize,
  labelSize,
}: {
  value: string
  label: string
  valueSize: number
  labelSize: number
}) {
  return (
    <div className="studio-profile-card__stat">
      <div className="studio-profile-card__stat-value" style={{ fontSize: valueSize }}>
        {value}
      </div>
      <div className="studio-profile-card__stat-label" style={{ fontSize: labelSize }}>
        {label}
      </div>
    </div>
  )
}
