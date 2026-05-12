import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import aspireLogo from '/Aspire.png'
import './App.css'
import { useAccount } from './hooks/useAccount'
import { OnboardingForm } from './components/OnboardingForm'

interface WeatherForecast {
  date: string
  temperatureC: number
  temperatureF: number
  summary: string
}

function App() {
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect, logout, user, getAccessTokenSilently } = useAuth0()
  const { state: accountState, onboard } = useAccount()
  const [weatherData, setWeatherData] = useState<WeatherForecast[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useCelsius, setUseCelsius] = useState(false)

  const fetchWeatherForecast = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = await getAccessTokenSilently()
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/weatherforecast`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: WeatherForecast[] = await response.json()
      setWeatherData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data')
      console.error('Error fetching weather forecast:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchWeatherForecast()
    }
  }, [isAuthenticated])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  if (authLoading || (isAuthenticated && accountState.status === 'loading')) {
    return (
      <div className="app-container">
        <div className="loading-skeleton" role="status" aria-live="polite" aria-label="Authenticating">
          <span className="visually-hidden">
            {authLoading ? 'Authenticating...' : 'Loading your profile...'}
          </span>
        </div>
      </div>
    )
  }

  if (isAuthenticated && accountState.status === 'needs-onboarding') {
    return <OnboardingForm onSubmit={(displayName, dateOfBirth, bio) => onboard(displayName, dateOfBirth, bio)} />
  }

  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <header className="app-header">
          <a
            href="https://aspire.dev"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit Aspire website (opens in new tab)"
            className="logo-link"
          >
            <img src={aspireLogo} className="logo" alt="Aspire logo" />
          </a>
          <h1 className="app-title">Aspire Starter</h1>
          <p className="app-subtitle">Modern distributed application development</p>
        </header>
        <main className="main-content">
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ marginBottom: '1rem' }}>Sign in to view the weather forecast.</p>
            <button className="refresh-button" onClick={() => loginWithRedirect()} type="button">
              Sign In
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <a
          href="https://aspire.dev"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit Aspire website (opens in new tab)"
          className="logo-link"
        >
          <img src={aspireLogo} className="logo" alt="Aspire logo" />
        </a>
        <h1 className="app-title">Aspire Starter</h1>
        <p className="app-subtitle">Modern distributed application development</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
          {(accountState.status === 'onboarded' ? accountState.account.displayName : user?.name) && (
            <span style={{ fontSize: '0.875rem' }}>
              {accountState.status === 'onboarded' ? accountState.account.displayName : user?.name}
            </span>
          )}
          <button
            className="refresh-button"
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            type="button"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="main-content">
        <section className="weather-section" aria-labelledby="weather-heading">
          <div className="card">
            <div className="section-header">
              <h2 id="weather-heading" className="section-title">Weather Forecast</h2>
              <div className="header-actions">
                <fieldset className="toggle-switch" aria-label="Temperature unit selection">
                  <legend className="visually-hidden">Temperature unit</legend>
                  <button
                    className={`toggle-option ${!useCelsius ? 'active' : ''}`}
                    onClick={() => setUseCelsius(false)}
                    aria-pressed={!useCelsius}
                    type="button"
                  >
                    <span aria-hidden="true">°F</span>
                    <span className="visually-hidden">Fahrenheit</span>
                  </button>
                  <button
                    className={`toggle-option ${useCelsius ? 'active' : ''}`}
                    onClick={() => setUseCelsius(true)}
                    aria-pressed={useCelsius}
                    type="button"
                  >
                    <span aria-hidden="true">°C</span>
                    <span className="visually-hidden">Celsius</span>
                  </button>
                </fieldset>
                <button
                  className="refresh-button"
                  onClick={fetchWeatherForecast}
                  disabled={loading}
                  aria-label={loading ? 'Loading weather forecast' : 'Refresh weather forecast'}
                  type="button"
                >
                  <svg
                    className={`refresh-icon ${loading ? 'spinning' : ''}`}
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                  </svg>
                  <span>{loading ? 'Loading...' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message" role="alert" aria-live="polite">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {loading && weatherData.length === 0 && (
              <div className="loading-skeleton" role="status" aria-live="polite" aria-label="Loading weather data">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="skeleton-row" aria-hidden="true" />
                ))}
                <span className="visually-hidden">Loading weather forecast data...</span>
              </div>
            )}

            {weatherData.length > 0 && (
              <div className="weather-grid">
                {weatherData.map((forecast, index) => (
                  <article key={index} className="weather-card" aria-label={`Weather for ${formatDate(forecast.date)}`}>
                    <h3 className="weather-date">
                      <time dateTime={forecast.date}>{formatDate(forecast.date)}</time>
                    </h3>
                    <p className="weather-summary">{forecast.summary}</p>
                    <div className="weather-temps" aria-label={`Temperature: ${useCelsius ? forecast.temperatureC : forecast.temperatureF} degrees ${useCelsius ? 'Celsius' : 'Fahrenheit'}`}>
                      <div className="temp-group">
                        <span className="temp-value" aria-hidden="true">
                          {useCelsius ? forecast.temperatureC : forecast.temperatureF}°
                        </span>
                        <span className="temp-unit" aria-hidden="true">{useCelsius ? 'Celsius' : 'Fahrenheit'}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <nav aria-label="Footer navigation">
          <a href="https://aspire.dev" target="_blank" rel="noopener noreferrer">
            Learn more about Aspire<span className="visually-hidden"> (opens in new tab)</span>
          </a>
          <a
            href="https://github.com/dotnet/aspire"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
            aria-label="View Aspire on GitHub (opens in new tab)"
          >
            <img src="/github.svg" alt="" width="24" height="24" aria-hidden="true" />
            <span className="visually-hidden">GitHub</span>
          </a>
        </nav>
      </footer>
    </div>
  )
}

export default App
