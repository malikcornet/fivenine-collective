import { useState, useEffect, useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

export interface Account {
  firstName: string
  lastName: string
  dateOfBirth: string | null
  bio: string | null
  createdAt: string
}

type AccountState =
  | { status: 'loading' }
  | { status: 'onboarded'; account: Account }
  | { status: 'needs-onboarding' }
  | { status: 'error'; message: string }

export function useAccount() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0()
  const [state, setState] = useState<AccountState>({ status: 'loading' })

  const fetchAccount = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const token = await getAccessTokenSilently()
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/account/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 404) {
        setState({ status: 'needs-onboarding' })
      } else if (res.ok) {
        const account: Account = await res.json()
        setState({ status: 'onboarded', account })
      } else {
        setState({ status: 'error', message: `Unexpected response: ${res.status}` })
      }
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Failed to load account' })
    }
  }, [getAccessTokenSilently])

  useEffect(() => {
    if (isAuthenticated) {
      fetchAccount()
    }
  }, [isAuthenticated, fetchAccount])

  const onboard = useCallback(
    async (firstName: string, lastName: string, dateOfBirth: string, bio: string) => {
      const token = await getAccessTokenSilently()
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/account/onboard`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firstName, lastName, dateOfBirth, bio: bio || null }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      const account: Account = await res.json()
      setState({ status: 'onboarded', account })
    },
    [getAccessTokenSilently],
  )

  return { state, onboard }
}
