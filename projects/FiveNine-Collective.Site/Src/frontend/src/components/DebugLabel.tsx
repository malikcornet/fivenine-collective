import { useEffect, useState } from 'react'

function readDebug(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  const v = params.get('debug')
  return v === '1' || v === 'true'
}

function useDebugEnabled(): boolean {
  const [on, setOn] = useState(readDebug)
  useEffect(() => {
    const update = () => setOn(readDebug())
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])
  return on
}

interface Props {
  name: string
  /** When true, position bottom-right instead of top-left (for components
   *  whose top-left is hidden by overlapping UI). */
  variant?: 'top-left' | 'bottom-right' | 'inline'
}

export function DebugLabel({ name, variant = 'top-left' }: Props) {
  const enabled = useDebugEnabled()
  if (!enabled) return null
  return <span className={`debug-label debug-label--${variant}`}>{name}</span>
}
DebugLabel.displayName = 'DebugLabel'
