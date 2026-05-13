import type { Widget } from './types'

export function WidgetContent({ widget }: { widget: Widget }) {
  switch (widget.type) {
    case 'profile': {
      const { name, role, bio } = widget.data
      const initials = name
        .split(' ')
        .map(p => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
      return (
        <div className="cw-body cw-profile">
          <div className="cw-profile-avatar">{initials || '?'}</div>
          <div className="cw-profile-meta">
            <div className="cw-profile-name">{name}</div>
            <div className="cw-profile-role">{role}</div>
            <p className="cw-profile-bio">{bio}</p>
          </div>
        </div>
      )
    }
    case 'about':
      return (
        <div className="cw-body">
          <div className="cw-label">{widget.data.title}</div>
          <p>{widget.data.body}</p>
        </div>
      )
    case 'text':
      return (
        <div className="cw-body cw-body--center">
          <p className="cw-quote">{widget.data.body}</p>
        </div>
      )
    case 'links':
      return (
        <div className="cw-body">
          <div className="cw-label">Links</div>
          <ul className="cw-list">
            {widget.data.items.map((it, i) => (
              <li key={`${i}-${it}`}>
                {it} <span>→</span>
              </li>
            ))}
          </ul>
        </div>
      )
    case 'gallery':
      return (
        <div className="cw-body">
          <div className="cw-label">Gallery</div>
          <div className="cw-gallery">
            {Array.from({ length: widget.data.count }).map((_, i) => (
              <div key={i} className="cw-gallery-tile" />
            ))}
          </div>
        </div>
      )
    case 'socials':
      return (
        <div className="cw-body">
          <div className="cw-label">Social</div>
          <div className="cw-socials">
            {widget.data.items.map((s, i) => (
              <span key={`${i}-${s}`} className="cw-social-chip">
                {s}
              </span>
            ))}
          </div>
        </div>
      )
    case 'video':
      return (
        <div className="cw-body cw-body--center">
          <div className="cw-video-play">▶</div>
        </div>
      )
    case 'project': {
      const { accent, status, year, title, blurb } = widget.data
      return (
        <div className="cw-body cw-project">
          <div
            className="cw-project-cover"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}55)` }}
          />
          <div className="cw-project-meta">
            <div className="cw-project-status">
              <span className="cw-project-dot" style={{ background: accent }} />
              {status} · {year}
            </div>
            <div className="cw-project-title">{title}</div>
            <p className="cw-project-blurb">{blurb}</p>
          </div>
        </div>
      )
    }
  }
}
