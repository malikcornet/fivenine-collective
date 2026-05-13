import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'

interface SnapInfo {
  on: boolean
  label: string
}

function useStudioSnap(): SnapInfo {
  const read = (): SnapInfo => ({
    on: typeof document !== 'undefined' && document.body.dataset.studioSnap === 'on',
    label: typeof document !== 'undefined' ? document.body.dataset.studioSnapLabel ?? '' : '',
  })
  const [info, setInfo] = useState<SnapInfo>(read)
  useEffect(() => {
    setInfo(read())
    const observer = new MutationObserver(() => setInfo(read()))
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-studio-snap', 'data-studio-snap-label'],
    })
    return () => observer.disconnect()
  }, [])
  return info
}

interface MenuItem {
  label: string
  hint?: string
}

interface NavMenuProps {
  label: string
  ariaLabel?: string
  items: MenuItem[]
  triggerClassName?: string
}

function NavMenu({ label, ariaLabel, items, triggerClassName }: NavMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="navbar-menu" ref={rootRef}>
      <button
        type="button"
        className={triggerClassName ?? 'navbar-studio-link'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel ?? label}
        onClick={() => setOpen(o => !o)}
      >
        <span>{label}</span>
        <span className="navbar-studio-caret" aria-hidden data-open={open || undefined}>
          ▾
        </span>
      </button>
      {open && (
        <div className="navbar-menu-panel" role="menu">
          {items.map(item => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="navbar-menu-item"
              onClick={() => setOpen(false)}
            >
              <span>{item.label}</span>
              {item.hint && <span className="navbar-menu-hint">{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const PROFILE_MENU: MenuItem[] = [
  { label: 'Switch profile', hint: 'Soon' },
  { label: 'Share profile', hint: 'Soon' },
  { label: 'Profile settings', hint: 'Soon' },
]

export function NavBar() {
  const { isAuthenticated, loginWithRedirect } = useAuth0()
  const snap = useStudioSnap()

  const exitSnap = () => window.dispatchEvent(new CustomEvent('studio:exit-snap'))

  return (
    <nav className="navbar" aria-label="Main navigation">
      <Link to="/" className="navbar-brand">
        FiveNine
      </Link>

      <div className="navbar-actions">
        {isAuthenticated ? (
          snap.on ? (
            <nav className="navbar-breadcrumbs" aria-label="Breadcrumb">
              <button
                type="button"
                className="navbar-crumb navbar-crumb-link navbar-crumb-back"
                onClick={exitSnap}
                title="Back to studio (Esc)"
              >
                <span className="navbar-crumb-back-arrow" aria-hidden>
                  ←
                </span>
                <span>Studio</span>
              </button>
              <span className="navbar-crumb-sep" aria-hidden>
                /
              </span>
              <NavMenu
                label={snap.label || 'Profile'}
                ariaLabel="Profile menu"
                items={PROFILE_MENU}
                triggerClassName="navbar-crumb navbar-crumb-current navbar-studio-link"
              />
            </nav>
          ) : (
            <Link to="/studio" className="navbar-studio-link">
              Studio
            </Link>
          )
        ) : (
          <button type="button" className="navbar-signin-btn" onClick={() => loginWithRedirect()}>
            Sign In
          </button>
        )}
      </div>
    </nav>
  )
}
NavBar.displayName = 'NavBar'
