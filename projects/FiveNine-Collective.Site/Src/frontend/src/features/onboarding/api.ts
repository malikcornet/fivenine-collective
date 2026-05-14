import type { HttpClient } from '../../lib/http'

export interface Me {
  sub: string
  firstName: string | null
  lastName: string | null
  onboarded: boolean
}

export async function getMe(http: HttpClient): Promise<Me> {
  return http.get<Me>('/api/me')
}

export async function completeOnboarding(
  http: HttpClient,
  payload: { firstName: string; lastName: string },
): Promise<Me> {
  return http.post<Me>('/api/me/onboarding', payload)
}
