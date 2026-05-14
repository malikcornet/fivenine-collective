import { useCallback, useEffect, useRef, useState } from 'react'

export interface ViewState {
  pan: { x: number; y: number }
  zoom: number
}

export type SnapState = 'idle' | 'snapping'

const INITIAL_VIEW: ViewState = { pan: { x: 200, y: 120 }, zoom: 1 }
const MIN_ZOOM = 0.001
export const MAX_ZOOM = 4
const SNAP_ANIM_MS = 260
/** After a programmatic snap (e.g. Recenter) completes, ignore wheel input for
 *  this long so trailing wheel momentum doesn't immediately break out. */
const SNAP_LOCKOUT_MS = 220

/** When the canvas is locked onto a profile, the wheel scrolls vertically
 *  through that profile's content within [minY, maxY] (pan.y range). */
export interface ScrollLock {
  minY: number
  maxY: number
}

interface Options {
  getScrollLock?: () => ScrollLock | null
}

export function useViewport({ getScrollLock }: Options = {}) {
  const [view, setViewState] = useState<ViewState>(INITIAL_VIEW)
  const [snapState, setSnapStateState] = useState<SnapState>('idle')

  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null)

  const viewRef = useRef(view)
  viewRef.current = view

  const getScrollLockRef = useRef<(() => ScrollLock | null) | undefined>(getScrollLock)
  getScrollLockRef.current = getScrollLock

  const animFrameRef = useRef<number | null>(null)
  const lockoutUntilRef = useRef<number>(0)

  const cancelAnim = useCallback(() => {
    if (animFrameRef.current != null) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
  }, [])

  interface AnimateOpts {
    asSnap?: boolean
    durationMs?: number
    /** "out" = ease-out cubic (snappy arrival). "inOut" = ease-in-out cubic
     *  (glide). Default: "out". */
    easing?: 'out' | 'inOut'
    onDone?: () => void
  }

  const animateTo = useCallback(
    (target: ViewState, opts: AnimateOpts = {}) => {
      cancelAnim()
      if (opts.asSnap) setSnapStateState('snapping')
      const startView = viewRef.current
      const startTime = performance.now()
      const dur = opts.durationMs ?? SNAP_ANIM_MS
      const easing = opts.easing ?? 'out'
      const tick = (now: number) => {
        const t = Math.min(1, (now - startTime) / dur)
        const eased =
          easing === 'inOut'
            ? t < 0.5
              ? 4 * t * t * t
              : 1 - Math.pow(-2 * t + 2, 3) / 2
            : 1 - Math.pow(1 - t, 3)
        const nextView: ViewState = {
          zoom: startView.zoom + (target.zoom - startView.zoom) * eased,
          pan: {
            x: startView.pan.x + (target.pan.x - startView.pan.x) * eased,
            y: startView.pan.y + (target.pan.y - startView.pan.y) * eased,
          },
        }
        setViewState(nextView)
        viewRef.current = nextView
        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(tick)
        } else {
          animFrameRef.current = null
          if (opts.asSnap) {
            setSnapStateState('idle')
            lockoutUntilRef.current = performance.now() + SNAP_LOCKOUT_MS
          }
          opts.onDone?.()
        }
      }
      animFrameRef.current = requestAnimationFrame(tick)
    },
    [cancelAnim],
  )

  const snapTo = useCallback((t: ViewState) => animateTo(t, { asSnap: true }), [animateTo])
  const easeTo = useCallback((t: ViewState) => animateTo(t, { asSnap: false }), [animateTo])

  const setView = useCallback<typeof setViewState>(
    updater => {
      cancelAnim()
      lockoutUntilRef.current = 0
      setSnapStateState('idle')
      setViewState(updater)
    },
    [cancelAnim],
  )

  const setViewportRef = useCallback((node: HTMLDivElement | null) => {
    viewportRef.current = node
    setViewportEl(node)
  }, [])

  const zoomAt = useCallback(
    (factor: number, mx: number, my: number) => {
      if (performance.now() < lockoutUntilRef.current) return
      cancelAnim()

      const v = viewRef.current
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor))
      if (next === v.zoom) return
      const scale = next / v.zoom
      const proposed: ViewState = {
        zoom: next,
        pan: { x: mx - (mx - v.pan.x) * scale, y: my - (my - v.pan.y) * scale },
      }
      setViewState(proposed)
      viewRef.current = proposed
    },
    [cancelAnim],
  )

  // Touch / pen gestures: 1 pointer = pan (or scroll when snap-locked),
  // 2 pointers = pinch zoom anchored on the finger midpoint. Mouse pointers
  // fall through to the existing React handlers in useStudioDrag.
  useEffect(() => {
    if (!viewportEl) return
    const active = new Map<number, { x: number; y: number }>()
    type Gesture =
      | { kind: 'pan'; id: number; startX: number; startY: number; origPan: { x: number; y: number } }
      | { kind: 'scroll'; id: number; startY: number; origPanY: number }
      | {
          kind: 'pinch'
          ids: [number, number]
          startDist: number
          startZoom: number
          worldAnchor: { x: number; y: number }
        }
    let gesture: Gesture | null = null

    const local = (e: PointerEvent) => {
      const r = viewportEl.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    const startSingle = (id: number, p: { x: number; y: number }) => {
      const lock = getScrollLockRef.current?.()
      if (lock) {
        gesture = { kind: 'scroll', id, startY: p.y, origPanY: viewRef.current.pan.y }
      } else {
        gesture = {
          kind: 'pan',
          id,
          startX: p.x,
          startY: p.y,
          origPan: { ...viewRef.current.pan },
        }
      }
    }

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return
      // Ignore touches on widgets when not snapped — widgets manage their own
      // pointer events for select/move/resize. When snapped, widgets get
      // pointer-events:none in CSS so events arrive here and scroll the page.
      if (e.target !== viewportEl) return
      e.preventDefault()
      viewportEl.setPointerCapture(e.pointerId)
      active.set(e.pointerId, local(e))
      cancelAnim()

      if (active.size === 1) {
        startSingle(e.pointerId, local(e))
      } else if (active.size === 2) {
        const pts = [...active.values()]
        const dx = pts[1].x - pts[0].x
        const dy = pts[1].y - pts[0].y
        const startDist = Math.hypot(dx, dy) || 1
        const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
        const v = viewRef.current
        const worldAnchor = { x: (mid.x - v.pan.x) / v.zoom, y: (mid.y - v.pan.y) / v.zoom }
        const ids = [...active.keys()] as [number, number]
        gesture = { kind: 'pinch', ids, startDist, startZoom: v.zoom, worldAnchor }
      }
    }

    const onMove = (e: PointerEvent) => {
      if (!active.has(e.pointerId)) return
      e.preventDefault()
      active.set(e.pointerId, local(e))
      if (!gesture) return

      if (gesture.kind === 'pan' && gesture.id === e.pointerId) {
        const p = active.get(e.pointerId)!
        const next: ViewState = {
          zoom: viewRef.current.zoom,
          pan: {
            x: gesture.origPan.x + (p.x - gesture.startX),
            y: gesture.origPan.y + (p.y - gesture.startY),
          },
        }
        setViewState(next)
        viewRef.current = next
      } else if (gesture.kind === 'scroll' && gesture.id === e.pointerId) {
        const lock = getScrollLockRef.current?.()
        if (!lock) return
        const p = active.get(e.pointerId)!
        const nextY = Math.max(
          lock.minY,
          Math.min(lock.maxY, gesture.origPanY + (p.y - gesture.startY)),
        )
        const v = viewRef.current
        const next: ViewState = { zoom: v.zoom, pan: { x: v.pan.x, y: nextY } }
        setViewState(next)
        viewRef.current = next
      } else if (gesture.kind === 'pinch') {
        const a = active.get(gesture.ids[0])
        const b = active.get(gesture.ids[1])
        if (!a || !b) return
        const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1
        const ratio = dist / gesture.startDist
        const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, gesture.startZoom * ratio))
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        const next: ViewState = {
          zoom: nextZoom,
          pan: {
            x: mid.x - gesture.worldAnchor.x * nextZoom,
            y: mid.y - gesture.worldAnchor.y * nextZoom,
          },
        }
        setViewState(next)
        viewRef.current = next
      }
    }

    const onUp = (e: PointerEvent) => {
      if (!active.has(e.pointerId)) return
      active.delete(e.pointerId)
      try {
        viewportEl.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
      if (active.size === 0) {
        gesture = null
      } else if (gesture?.kind === 'pinch' && active.size === 1) {
        // Lifted one finger â€” fall back to single-finger pan/scroll on the remaining one.
        const [id] = [...active.keys()]
        startSingle(id, active.get(id)!)
      }
    }

    viewportEl.addEventListener('pointerdown', onDown)
    viewportEl.addEventListener('pointermove', onMove)
    viewportEl.addEventListener('pointerup', onUp)
    viewportEl.addEventListener('pointercancel', onUp)
    return () => {
      viewportEl.removeEventListener('pointerdown', onDown)
      viewportEl.removeEventListener('pointermove', onMove)
      viewportEl.removeEventListener('pointerup', onUp)
      viewportEl.removeEventListener('pointercancel', onUp)
    }
  }, [viewportEl, cancelAnim])

  useEffect(() => {
    if (!viewportEl) return
    const onWheel = (e: WheelEvent) => {
      // Let overlays that own their own scroll (e.g. the Explorer view) handle
      // wheel natively. Anything marked with [data-studio-scroll] takes over.
      const target = e.target as Element | null
      if (target && target.closest('[data-studio-scroll]')) return
      e.preventDefault()
      // While snap-locked to a profile, plain wheel scrolls vertically through
      // its content like a web page. Ctrl/Cmd+wheel still zooms (so user can
      // break out of the lock).
      const lock = !e.ctrlKey && !e.metaKey ? getScrollLockRef.current?.() : null
      if (lock) {
        const v = viewRef.current
        const nextY = Math.max(lock.minY, Math.min(lock.maxY, v.pan.y - e.deltaY))
        if (nextY === v.pan.y) return
        const next: ViewState = { ...v, pan: { ...v.pan, y: nextY } }
        setViewState(next)
        viewRef.current = next
        return
      }
      const rect = viewportEl.getBoundingClientRect()
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top)
    }
    viewportEl.addEventListener('wheel', onWheel, { passive: false })
    return () => viewportEl.removeEventListener('wheel', onWheel)
  }, [viewportEl, zoomAt])

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
  }, [zoomAt, setView])

  useEffect(() => () => cancelAnim(), [cancelAnim])

  return {
    view,
    setView,
    snapTo,
    easeTo,
    animateTo,
    viewportRef,
    setViewportRef,
    zoomAt,
    snapState,
  }
}
