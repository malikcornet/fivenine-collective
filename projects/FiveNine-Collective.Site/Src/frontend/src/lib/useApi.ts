import { useMemo } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { createHttpClient, type HttpClient } from './http'

/**
 * React hook that returns an authed HTTP client. The token getter calls
 * Auth0's silent refresh path each time so we never send a stale token.
 */
export function useApi(): HttpClient {
  const { getAccessTokenSilently } = useAuth0()
  return useMemo(
    () => createHttpClient(() => getAccessTokenSilently()),
    [getAccessTokenSilently],
  )
}
