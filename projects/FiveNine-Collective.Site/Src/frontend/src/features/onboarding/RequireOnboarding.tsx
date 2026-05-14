import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useMe } from './useMe'

interface Props {
  children: ReactElement
}

/**
 * Sits inside <RequireAuth>. Blocks rendering until /api/me resolves, then
 * redirects to /onboarding when the profile has no OnboardedAt timestamp.
 */
export function RequireOnboarding({ children }: Props) {
  const me = useMe()
  const location = useLocation()

  if (me.isLoading || !me.data) {
    return (
      <div className="app-loading" role="status" aria-live="polite">
        <span>Loading…</span>
      </div>
    )
  }

  if (!me.data.onboarded) {
    return <Navigate to="/onboarding" state={{ returnTo: location.pathname }} replace />
  }

  return children
}
RequireOnboarding.displayName = 'RequireOnboarding'
