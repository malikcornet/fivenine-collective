function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required env var ${name}. Add it to .env.local — see .env.example.`)
  }
  return value
}

export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? '',
  auth0Domain: required('VITE_AUTH0_DOMAIN', import.meta.env.VITE_AUTH0_DOMAIN),
  auth0ClientId: required('VITE_AUTH0_CLIENT_ID', import.meta.env.VITE_AUTH0_CLIENT_ID),
  auth0Audience: required('VITE_AUTH0_AUDIENCE', import.meta.env.VITE_AUTH0_AUDIENCE),
}
