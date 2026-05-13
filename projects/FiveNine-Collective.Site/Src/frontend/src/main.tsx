import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Auth0Provider } from '@auth0/auth0-react'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { env } from './lib/env'
import { queryClient } from './lib/queryClient'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Auth0Provider
        domain={env.auth0Domain}
        clientId={env.auth0ClientId}
        authorizationParams={{
          redirect_uri: window.location.origin,
          audience: env.auth0Audience,
          scope: 'openid profile email read:data',
        }}
        useRefreshTokens={true}
        cacheLocation="localstorage"
      >
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </Auth0Provider>
    </BrowserRouter>
  </StrictMode>,
)
