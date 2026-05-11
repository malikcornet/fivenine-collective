import { useState, type FormEvent } from 'react'

interface OnboardingFormProps {
  onSubmit: (displayName: string, bio: string) => Promise<void>
}

export function OnboardingForm({ onSubmit }: OnboardingFormProps) {
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(displayName.trim(), bio.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Welcome to FiveNine Collective</h1>
        <p className="app-subtitle">Let's set up your profile to get started</p>
      </header>

      <main className="main-content">
        <section style={{ width: '100%', maxWidth: '480px' }}>
          <div className="card">
            <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>Create your profile</h2>

            {error && (
              <div className="error-message" role="alert">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-field">
                <label htmlFor="displayName" className="form-label">
                  Display name <span aria-hidden="true" style={{ color: 'var(--error-border)' }}>*</span>
                </label>
                <input
                  id="displayName"
                  type="text"
                  className="form-input"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  maxLength={100}
                  required
                  autoFocus
                  autoComplete="nickname"
                  placeholder="How should we call you?"
                  disabled={submitting}
                  aria-required="true"
                />
              </div>

              <div className="form-field">
                <label htmlFor="bio" className="form-label">
                  Bio <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8em' }}>(optional)</span>
                </label>
                <textarea
                  id="bio"
                  className="form-input"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="A short intro about yourself…"
                  disabled={submitting}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                  {bio.length}/500
                </span>
              </div>

              <button
                type="submit"
                className="refresh-button"
                disabled={submitting || !displayName.trim()}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {submitting ? 'Creating profile…' : 'Get started'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}
