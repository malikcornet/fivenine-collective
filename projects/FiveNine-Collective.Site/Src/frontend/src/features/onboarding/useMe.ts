import { useQuery } from '@tanstack/react-query'
import { useAuth0 } from '@auth0/auth0-react'
import { useApi } from '../../lib/useApi'
import { getMe, type Me } from './api'

export const ME_QUERY_KEY = ['me'] as const

export function useMe() {
  const { isAuthenticated, isLoading: authLoading } = useAuth0()
  const http = useApi()

  return useQuery<Me>({
    queryKey: ME_QUERY_KEY,
    queryFn: () => getMe(http),
    enabled: isAuthenticated && !authLoading,
    staleTime: 60_000,
  })
}
