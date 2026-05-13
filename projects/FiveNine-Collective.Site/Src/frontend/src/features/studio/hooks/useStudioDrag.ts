import { useCallback, useEffect, useRef, useState } from 'react'
import { STEP_X, STEP_Y, type DragState, type Widget } from '../model'
import type { ViewState } from './useViewport'

interface Args {
  zoom: number
  setView: React.Dispatch<React.SetStateAction<ViewState>>
  setWidgets: (updater: (prev: Widget[]) => Widget[]) => void
  setSelectedId: (id: string | null) => void
}

/**
 * Owns pointer-driven move/resize/pan. Updates are batched per animation frame
 * so pointermove at 1000Hz still renders at most once per frame.
 */
export function useStudioDrag({ zoom, setView, setWidgets, setSelectedId }: Args) {
  const [drag, setDrag] = useState<DragState>(null)
  const dragRef = useRef<DragState>(null)
  const pendingRef = useRef<{ dx: number; dy: number } | null>(null)
  const rafRef = useRef<number | null>(null)

  dragRef.current = drag

  const flush = useCallback(() => {
    rafRef.current = null
    const d = dragRef.current
    const pending = pendingRef.current
    if (!d || !pending) return
    const { dx, dy } = pending

    if (d.kind === 'pan') {
      setView(v => ({ ...v, pan: { x: d.origPanX + dx, y: d.origPanY + dy } }))
      return
    }

    const dCol = Math.round(dx / (STEP_X * zoom))
    const dRow = Math.round(dy / (STEP_Y * zoom))
    setWidgets(prev =>
      prev.map(w => {
        if (w.id !== d.id) return w
        if (d.kind === 'move') {
          return { ...w, col: d.origCol + dCol, row: d.origRow + dRow }
        }
        return { ...w, w: Math.max(1, d.origW + dCol), h: Math.max(1, d.origH + dRow) }
      }),
    )
  }, [zoom, setView, setWidgets])

  const schedule = useCallback(
    (dx: number, dy: number) => {
      pendingRef.current = { dx, dy }
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(flush)
      }
    },
    [flush],
  )

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  const onWidgetPointerDown = useCallback(
    (e: React.PointerEvent, w: Widget) => {
      e.stopPropagation()
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      setSelectedId(w.id)
      setDrag({
        kind: 'move',
        id: w.id,
        startX: e.clientX,
        startY: e.clientY,
        origCol: w.col,
        origRow: w.row,
      })
    },
    [setSelectedId],
  )

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent, w: Widget) => {
      e.stopPropagation()
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      setSelectedId(w.id)
      setDrag({
        kind: 'resize',
        id: w.id,
        startX: e.clientX,
        startY: e.clientY,
        origW: w.w,
        origH: w.h,
      })
    },
    [setSelectedId],
  )

  const onViewportPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.target !== e.currentTarget) return
      // Touch/pen gestures are handled natively in useViewport (pinch + snap-aware scroll).
      if (e.pointerType !== 'mouse') return
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      setSelectedId(null)
      // Read current pan from a state setter to avoid re-creating this callback per render.
      setView(v => {
        setDrag({
          kind: 'pan',
          startX: e.clientX,
          startY: e.clientY,
          origPanX: v.pan.x,
          origPanY: v.pan.y,
        })
        return v
      })
    },
    [setSelectedId, setView],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      schedule(e.clientX - d.startX, e.clientY - d.startY)
    },
    [schedule],
  )

  const onPointerUp = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      flush()
    }
    pendingRef.current = null
    setDrag(null)
  }, [flush])

  return {
    drag,
    onWidgetPointerDown,
    onResizePointerDown,
    onViewportPointerDown,
    onPointerMove,
    onPointerUp,
  }
}
