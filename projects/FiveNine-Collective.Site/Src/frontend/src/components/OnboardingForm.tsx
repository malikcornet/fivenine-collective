import { useState, type FormEvent } from 'react'

interface OnboardingFormProps {
  onSubmit: (firstName: string, lastName: string, dateOfBirth: string, bio: string) => Promise<void>
}

type Step = 1 | 2 | 3

interface WizardData {
  firstName: string
  lastName: string
  dateOfBirth: string
  bio: string
}

const STEP_TITLES: Record<Step, string> = {
  1: "What's your name?",
  2: 'When were you born?',
  3: 'Tell us about yourself',
}

const STEP_SUBTITLES: Record<Step, string> = {
  1: "This is how you'll appear to others.",
  2: 'Your date of birth is kept private.',
  3: 'A short intro is optional but helps others get to know you.',
}

export function OnboardingForm({ onSubmit }: OnboardingFormProps) {
  const [step, setStep] = useState<Step>(1)
  const [data, setData] = useState<WizardData>({ firstName: '', lastName: '', dateOfBirth: '', bio: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canAdvance =
    step === 1 ? data.firstName.trim().length > 0 && data.lastName.trim().length > 0 :
    step === 2 ? data.dateOfBirth.length > 0 :
    true

  const handleNext = (e: FormEvent) => {
    e.preventDefault()
    if (!canAdvance) return
    if (step < 3) {
      setStep((s) => (s + 1) as Step)
    }
  }

  const handleBack = () => setStep((s) => (s - 1) as Step)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(data.firstName.trim(), data.lastName.trim(), data.dateOfBirth, data.bio.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Welcome to FiveNine Collective</h1>
        <p className="app-subtitle">{STEP_SUBTITLES[step]}</p>
      </header>

      <main className="main-content">
        <section style={{ width: '100%', maxWidth: '480px' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>{STEP_TITLES[step]}</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                {step} of 3
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.75rem' }}>
              {([1, 2, 3] as Step[]).map((s) => (
                <div
                  key={s}
                  style={{
                    flex: 1,
                    height: '3px',
                    borderRadius: '2px',
                    background: s <= step ? 'var(--text-primary)' : 'var(--border-color)',
                    transition: 'background 0.2s',
                  }}
                />
              ))}
            </div>

            {error && (
              <div className="error-message" role="alert" style={{ marginBottom: '1rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={step < 3 ? handleNext : handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {step === 1 && (
                <>
                  <div className="form-field">
                    <label htmlFor="firstName" className="form-label">
                      First name <span aria-hidden="true" style={{ color: 'var(--error-border)' }}>*</span>
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      className="form-input"
                      value={data.firstName}
                      onChange={e => setData(d => ({ ...d, firstName: e.target.value }))}
                      maxLength={100}
                      required
                      autoFocus
                      autoComplete="given-name"
                      placeholder="First name"
                      aria-required="true"
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="lastName" className="form-label">
                      Last name <span aria-hidden="true" style={{ color: 'var(--error-border)' }}>*</span>
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      className="form-input"
                      value={data.lastName}
                      onChange={e => setData(d => ({ ...d, lastName: e.target.value }))}
                      maxLength={100}
                      required
                      autoComplete="family-name"
                      placeholder="Last name"
                      aria-required="true"
                    />
                  </div>
                </>
              )}

              {step === 2 && (
                <div className="form-field">
                  <label htmlFor="dateOfBirth" className="form-label">
                    Date of birth <span aria-hidden="true" style={{ color: 'var(--error-border)' }}>*</span>
                  </label>
                  <input
                    id="dateOfBirth"
                    type="date"
                    className="form-input"
                    value={data.dateOfBirth}
                    onChange={e => setData(d => ({ ...d, dateOfBirth: e.target.value }))}
                    required
                    autoFocus
                    max={new Date().toISOString().split('T')[0]}
                    aria-required="true"
                  />
                </div>
              )}

              {step === 3 && (
                <div className="form-field">
                  <label htmlFor="bio" className="form-label">
                    Bio <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8em' }}>(optional)</span>
                  </label>
                  <textarea
                    id="bio"
                    className="form-input"
                    value={data.bio}
                    onChange={e => setData(d => ({ ...d, bio: e.target.value }))}
                    maxLength={500}
                    rows={4}
                    autoFocus
                    placeholder="A short intro about yourself…"
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                    {data.bio.length}/500
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                {step > 1 && (
                  <button
                    type="button"
                    className="refresh-button"
                    onClick={handleBack}
                    disabled={submitting}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  className="refresh-button"
                  disabled={!canAdvance || submitting}
                  style={{ flex: step > 1 ? 1 : undefined, width: step === 1 ? '100%' : undefined, justifyContent: 'center' }}
                >
                  {step < 3 ? 'Continue' : submitting ? 'Creating profile…' : 'Get started'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}
