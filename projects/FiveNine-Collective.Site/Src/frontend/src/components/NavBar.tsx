import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'

interface NavBarProps {
  firstName?: string
  lastName?: string
}

export function NavBar({ firstName, lastName }: NavBarProps) {
  const { isAuthenticated, loginWithRedirect } = useAuth0()

  const initials =
    firstName && lastName
      ? `${firstName[0]}${lastName[0]}`.toUpperCase()
      : null

  return (
    <nav className="navbar" aria-label="Main navigation">
      <Link to="/" className="navbar-brand">
        FiveNine Collective
      </Link>
      <div className="navbar-actions">
        {isAuthenticated ? (
          <Link
            to="/profile"
            className="profile-avatar-btn"
            aria-label="View your profile"
          >
            {initials ?? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </Link>
        ) : (
          <button
            type="button"
            className="navbar-signin-btn"
            onClick={() => loginWithRedirect()}
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  )
}
