import { useEffect, type ReactElement } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

interface Props {
  children: ReactElement
}

export function RequireAuth({ children }: Props) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect({ appState: { returnTo: window.location.pathname } })
    }
  }, [isAuthenticated, isLoading, loginWithRedirect])

  if (!isAuthenticated) {
    return (
      <div className="app-loading" role="status" aria-live="polite">
        <span>Redirecting to sign in…</span>
      </div>
    )
  }

  return children
}
