import type { Widget } from './types'

export function WidgetContent({ widget }: { widget: Widget }) {
  switch (widget.type) {
    case 'profile': {
      const name = String(widget.data.name ?? '')
      const initials = name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
      return (
        <div className="cw-body cw-profile">
          <div className="cw-profile-avatar">{initials || '?'}</div>
          <div className="cw-profile-meta">
            <div className="cw-profile-name">{name}</div>
            <div className="cw-profile-role">{String(widget.data.role ?? '')}</div>
            <p className="cw-profile-bio">{String(widget.data.bio ?? '')}</p>
          </div>
        </div>
      )
    }
    case 'about':
      return (
        <div className="cw-body">
          <div className="cw-label">{String(widget.data.title)}</div>
          <p>{String(widget.data.body)}</p>
        </div>
      )
    case 'text':
      return (
        <div className="cw-body cw-body--center">
          <p className="cw-quote">{String(widget.data.body)}</p>
        </div>
      )
    case 'links':
      return (
        <div className="cw-body">
          <div className="cw-label">Links</div>
          <ul className="cw-list">
            {(widget.data.items as string[]).map((it, i) => (
              <li key={i}>{it} <span>→</span></li>
            ))}
          </ul>
        </div>
      )
    case 'gallery':
      return (
        <div className="cw-body">
          <div className="cw-label">Gallery</div>
          <div className="cw-gallery">
            {Array.from({ length: (widget.data.count as number) || 3 }).map((_, i) => (
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
            {(widget.data.items as string[]).map((s, i) => (
              <span key={i} className="cw-social-chip">{s}</span>
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
      const accent = String(widget.data.accent ?? '#d4ff00')
      return (
        <div className="cw-body cw-project">
          <div className="cw-project-cover" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}55)` }} />
          <div className="cw-project-meta">
            <div className="cw-project-status">
              <span className="cw-project-dot" style={{ background: accent }} />
              {String(widget.data.status ?? '')} · {String(widget.data.year ?? '')}
            </div>
            <div className="cw-project-title">{String(widget.data.title ?? '')}</div>
            <p className="cw-project-blurb">{String(widget.data.blurb ?? '')}</p>
          </div>
        </div>
      )
    }
  }
}
