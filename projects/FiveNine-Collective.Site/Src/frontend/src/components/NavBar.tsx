import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'

export function NavBar() {
  const { isAuthenticated, loginWithRedirect } = useAuth0()

  return (
    <nav className="navbar" aria-label="Main navigation">
      <Link to="/" className="navbar-brand">
        FiveNine
      </Link>

      {isAuthenticated ? (
        <Link to="/studio" className="navbar-studio-link">
          Studio
        </Link>
      ) : (
        <button type="button" className="navbar-signin-btn" onClick={() => loginWithRedirect()}>
          Sign In
        </button>
      )}
    </nav>
  )
}
