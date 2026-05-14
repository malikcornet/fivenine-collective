import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../../lib/useApi'
import { ApiError } from '../../lib/http'
import { completeOnboarding, type Me } from './api'
import { ME_QUERY_KEY, useMe } from './useMe'
import './onboarding.css'

type Step = 'welcome' | 'name' | 'done'

interface OnboardingLocationState {
  returnTo?: string
}

export function OnboardingPage() {
  const { user } = useAuth0()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const http = useApi()
  const me = useMe()

  const [step, setStep] = useState<Step>('welcome')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = useMutation({
    mutationFn: () => completeOnboarding(http, { firstName: firstName.trim(), lastName: lastName.trim() }),
    onSuccess: result => {
      queryClient.setQueryData<Me>(ME_QUERY_KEY, result)
      setStep('done')
    },
    onError: (e: unknown) => {
      setError(e instanceof ApiError ? `${e.message}` : 'Something went wrong. Please try again.')
    },
  })

  // Already onboarded? Skip straight back.
  if (me.data?.onboarded && step !== 'done') {
    const returnTo = (location.state as OnboardingLocationState | null)?.returnTo ?? '/studio'
    navigate(returnTo, { replace: true })
    return null
  }

  const onNameSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter both your first and last name.')
      return
    }
    submit.mutate()
  }

  return (
    <main className="onboarding">
      {step === 'welcome' && (
        <section className="onboarding-card" aria-labelledby="onb-welcome-title">
          <p className="onboarding-eyebrow">Step 1 of 3</p>
          <h1 id="onb-welcome-title" className="onboarding-title">
            Welcome to FiveNine{user?.email ? `, ${user.email.split('@')[0]}` : ''}.
          </h1>
          <p className="onboarding-body">
            Let's get your profile set up. It will only take a minute.
          </p>
          <div className="onboarding-actions">
            <button type="button" className="onboarding-primary" onClick={() => setStep('name')}>
              Get started
            </button>
          </div>
        </section>
      )}

      {step === 'name' && (
        <section className="onboarding-card" aria-labelledby="onb-name-title">
          <p className="onboarding-eyebrow">Step 2 of 3</p>
          <h1 id="onb-name-title" className="onboarding-title">
            What should we call you?
          </h1>
          <form className="onboarding-form" onSubmit={onNameSubmit} noValidate>
            <label className="onboarding-field">
              <span>First name</span>
              <input
                type="text"
                autoComplete="given-name"
                maxLength={80}
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                autoFocus
                required
              />
            </label>
            <label className="onboarding-field">
              <span>Last name</span>
              <input
                type="text"
                autoComplete="family-name"
                maxLength={80}
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
              />
            </label>
            {error && (
              <p className="onboarding-error" role="alert">
                {error}
              </p>
            )}
            <div className="onboarding-actions">
              <button
                type="button"
                className="onboarding-secondary"
                onClick={() => setStep('welcome')}
                disabled={submit.isPending}
              >
                Back
              </button>
              <button type="submit" className="onboarding-primary" disabled={submit.isPending}>
                {submit.isPending ? 'Saving…' : 'Continue'}
              </button>
            </div>
          </form>
        </section>
      )}

      {step === 'done' && (
        <section className="onboarding-card" aria-labelledby="onb-done-title">
          <p className="onboarding-eyebrow">Step 3 of 3</p>
          <h1 id="onb-done-title" className="onboarding-title">
            You're all set, {firstName || me.data?.firstName}.
          </h1>
          <p className="onboarding-body">
            Your profile is ready. Head into the studio to start building.
          </p>
          <div className="onboarding-actions">
            <button
              type="button"
              className="onboarding-primary"
              onClick={() => {
                const returnTo = (location.state as OnboardingLocationState | null)?.returnTo ?? '/studio'
                navigate(returnTo, { replace: true })
              }}
            >
              Enter the studio
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
OnboardingPage.displayName = 'OnboardingPage'
