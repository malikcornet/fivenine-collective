import { useCallback, useEffect, useRef, useState } from 'react'

export interface ViewState {
  pan: { x: number; y: number }
  zoom: number
}

const INITIAL_VIEW: ViewState = { pan: { x: 200, y: 120 }, zoom: 1 }
const MIN_ZOOM = 0.001
const MAX_ZOOM = 2

export function useViewport() {
  const [view, setView] = useState<ViewState>(INITIAL_VIEW)
  const viewportRef = useRef<HTMLDivElement>(null)

  const zoomAt = useCallback((factor: number, mx: number, my: number) => {
    setView(v => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor))
      const scale = next / v.zoom
      return {
        zoom: next,
        pan: { x: mx - (mx - v.pan.x) * scale, y: my - (my - v.pan.y) * scale },
      }
    })
  }, [])

  // Wheel zoom is registered manually so we can mark it non-passive and call preventDefault.
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  // Ctrl/Cmd +/- and 0
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const el = viewportRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx = rect.width / 2
      const cy = rect.height / 2
      if (e.key === '=' || e.key === '+') {
        e.preventDefault()
        zoomAt(1.2, cx, cy)
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        zoomAt(1 / 1.2, cx, cy)
      } else if (e.key === '0') {
        e.preventDefault()
        setView(INITIAL_VIEW)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomAt])

  return { view, setView, viewportRef, zoomAt }
}
