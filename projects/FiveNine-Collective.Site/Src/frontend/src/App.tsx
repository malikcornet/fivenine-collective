import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import './App.css'
import { NavBar } from './components/NavBar'
import { RequireAuth } from './components/RequireAuth'
import { ErrorBoundary } from './components/ErrorBoundary'
import { HomePage } from './pages/HomePage'
import { RequireOnboarding } from './features/onboarding/RequireOnboarding'

const StudioPage = lazy(() =>
  import('./features/studio/StudioPage').then(m => ({ default: m.StudioPage })),
)

const OnboardingPage = lazy(() =>
  import('./features/onboarding/OnboardingPage').then(m => ({ default: m.OnboardingPage })),
)

function App() {
  const { isLoading: authLoading } = useAuth0()

  if (authLoading) {
    return (
      <div className="app-container">
        <div className="app-loading" role="status" aria-live="polite">
          <span>Authenticating...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <NavBar />

      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="app-loading" role="status" aria-live="polite">
              <span>Loading…</span>
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/onboarding"
              element={
                <RequireAuth>
                  <OnboardingPage />
                </RequireAuth>
              }
            />
            <Route
              path="/studio"
              element={
                <RequireAuth>
                  <RequireOnboarding>
                    <StudioPage />
                  </RequireOnboarding>
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

App.displayName = 'App'
export default App
