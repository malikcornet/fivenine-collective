import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStudioQuery, useSaveMyWidgets } from './useStudio'
import { StudioCanvas } from './components/StudioCanvas'
import { StudioDock } from './components/StudioDock'
import { useStudioDrag } from './hooks/useStudioDrag'
import {
  useViewport,
  type ScrollLock,
  type ViewState,
} from './hooks/useViewport'
import {
  NAV_H,
  STEP_X,
  STEP_Y,
  defaultData,
  findSnapTarget,
  getSnapTargets,
  nextDraftId,
  type BoundsRect,
  type SnapKind,
  type SnapTarget,
  type Widget,
  type WidgetType,
} from './model'
import { MAX_ZOOM } from './hooks/useViewport'

export function StudioPage() {
  const { data: studio, isLoading, error } = useStudioQuery()
  const saveMutation = useSaveMyWidgets()
  const [widgets, setWidgetsState] = useState<Widget[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const widgetsRef = useRef<Widget[] | null>(null)
  widgetsRef.current = widgets
  const didFitRef = useRef(false)
  const currentProfileId = studio?.currentProfileId ?? ''
  const canEditWidget = useCallback(
    (w: Widget | null | undefined) => !!w && w.profileId === currentProfileId,
    [currentProfileId],
  )

  const scrollLockRef = useRef<ScrollLock | null>(null)
  const getScrollLock = useCallback(() => scrollLockRef.current, [])

  const { view, setView, easeTo, animateTo, viewportRef, setViewportRef, snapState } = useViewport({
    getScrollLock,
  })
  const { pan, zoom } = view

  useEffect(() => {
    if (studio && widgets === null) setWidgetsState(studio.widgets)
  }, [studio, widgets])

  // Own widgets (the only ones the user can edit + the only ones the server
  // accepts). Used both for the autosave trigger and the post-save reconcile.
  const ownWidgets = useMemo(
    () => (widgets && currentProfileId ? widgets.filter(w => w.profileId === currentProfileId) : []),
    [widgets, currentProfileId],
  )
  const ownWidgetsKey = useMemo(() => JSON.stringify(ownWidgets), [ownWidgets])
  const lastSavedKeyRef = useRef<string | null>(null)
  const savingRef = useRef(false)

  // Seed last-saved on initial load so we don't immediately re-save the data
  // we just fetched.
  useEffect(() => {
    if (studio && lastSavedKeyRef.current === null && currentProfileId) {
      lastSavedKeyRef.current = JSON.stringify(
        studio.widgets.filter(w => w.profileId === currentProfileId),
      )
    }
  }, [studio, currentProfileId])

  // Debounced autosave of the user's own widgets.
  useEffect(() => {
    if (!currentProfileId || !widgets) return
    if (lastSavedKeyRef.current === ownWidgetsKey) return
    if (savingRef.current) return
    const t = setTimeout(() => {
      savingRef.current = true
      saveMutation.mutate(ownWidgets, {
        onSuccess: studio => {
          // Replace own widgets in local state with canonical server versions
          // (draft- ids -> real GUIDs). Preserve other profiles' widgets.
          setWidgetsState(prev => {
            if (!prev) return studio.widgets
            const others = prev.filter(w => w.profileId !== studio.currentProfileId)
            const mine = studio.widgets.filter(w => w.profileId === studio.currentProfileId)
            return [...others, ...mine]
          })
          lastSavedKeyRef.current = JSON.stringify(
            studio.widgets.filter(w => w.profileId === studio.currentProfileId),
          )
        },
        onSettled: () => {
          savingRef.current = false
        },
      })
    }, 800)
    return () => clearTimeout(t)
  }, [ownWidgetsKey, ownWidgets, widgets, currentProfileId, saveMutation])

  const setWidgets = useCallback((updater: (prev: Widget[]) => Widget[]) => {
    setWidgetsState(prev => (prev ? updater(prev) : prev))
  }, [])

  const {
    drag,
    onWidgetPointerDown,
    onResizePointerDown,
    onViewportPointerDown,
    onPointerMove,
    onPointerUp,
  } = useStudioDrag({ zoom, setView, setWidgets, setSelectedId })

  const addWidget = useCallback(
    (type: WidgetType) => {
      if (!currentProfileId) return
      const el = viewportRef.current
      let col = 0,
        row = 0
      if (el) {
        const cx = (el.clientWidth / 2 - pan.x) / zoom
        const cy = (el.clientHeight / 2 - pan.y) / zoom
        col = Math.round(cx / STEP_X)
        row = Math.round(cy / STEP_Y)
      }
      setWidgets(prev => [
        ...prev,
        makeWidget(type, {
          id: nextDraftId(),
          profileId: currentProfileId,
          col,
          row,
          w: 4,
          h: 3,
        }),
      ])
    },
    [pan.x, pan.y, zoom, viewportRef, setWidgets, currentProfileId],
  )

  const openSnap = useCallback(
    (target: SnapTarget) => {
      const el = viewportRef.current
      if (!el) return
      const b = target.bounds
      const fit = computeFitView(b, el.clientWidth)
      const v = view
      // Two-phase: slow pan at the current zoom to put bounds.top at NAV_H and
      // bounds.centerX at viewport center, then zoom in to fit. Both phases keep
      // bounds.top fixed at NAV_H (the linear lerp between matching anchors
      // preserves the anchor).
      const interim: ViewState = {
        zoom: v.zoom,
        pan: {
          x: el.clientWidth / 2 - b.centerX * v.zoom,
          y: NAV_H - b.top * v.zoom,
        },
      }
      animateTo(interim, {
        asSnap: true,
        durationMs: 550,
        easing: 'inOut',
        onDone: () => animateTo(fit, { asSnap: true, durationMs: 400 }),
      })
    },
    [viewportRef, animateTo, view],
  )

  const openSnapById = useCallback(
    (kind: SnapKind, id: string) => {
      if (!widgets) return
      const target = findSnapTarget(widgets, kind, id)
      if (target) openSnap(target)
    },
    [widgets, openSnap],
  )

  const fitToBounds = useCallback(() => {
    if (currentProfileId) openSnapById('profile', currentProfileId)
  }, [openSnapById, currentProfileId])

  useEffect(() => {
    if (!didFitRef.current && widgets && widgets.length > 0 && currentProfileId) {
      didFitRef.current = true
      // Initial fit on page load: jump (no animation) to the current user's profile.
      const el = viewportRef.current
      const target = findSnapTarget(widgets, 'profile', currentProfileId)
      if (el && target) setView(computeFitView(target.bounds, el.clientWidth))
    }
  }, [widgets, viewportRef, setView, currentProfileId])

  // Locked onto a snap target when zoom + horizontal pan match its fit view.
  // pan.y is free — the user scrolls vertically through the target like a web
  // page. Changing zoom or panning horizontally exits the lock.
  const snapInfo = (() => {
    const el = viewportRef.current
    if (!el || !widgets) return null
    for (const t of getSnapTargets(widgets)) {
      const b = t.bounds
      const fit = computeFitView(b, el.clientWidth)
      if (
        Math.abs(zoom - fit.zoom) / fit.zoom < 0.005 &&
        Math.abs(pan.x - fit.pan.x) < 1
      ) {
        // Webpage-like scroll: top of bounds aligns with NAV_H (maxY), bottom of
        // bounds aligns with viewport bottom (minY). If content fits in view,
        // there's nothing to scroll.
        const maxY = fit.pan.y
        const minY = Math.min(maxY, el.clientHeight - (b.top + b.height) * fit.zoom)
        return { minY, maxY, target: t }
      }
    }
    return null
  })()
  const atSnap = snapInfo !== null
  scrollLockRef.current = snapInfo

  // Keep the snap fitted to the viewport as it resizes (window resize,
  // orientation change, mobile URL bar collapse, etc.). pan.y is preserved so
  // the user's vertical scroll position stays put across the refit.
  const snappedKey = snapInfo ? `${snapInfo.target.kind}:${snapInfo.target.id}` : null
  const snappedTargetRef = useRef<SnapTarget | null>(null)
  snappedTargetRef.current = snapInfo?.target ?? null
  useEffect(() => {
    if (!snappedKey) return
    const el = viewportRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      const node = viewportRef.current
      const target = snappedTargetRef.current
      if (!node || !target) return
      const fit = computeFitView(target.bounds, node.clientWidth)
      const b = target.bounds
      const maxY = fit.pan.y
      const minY = Math.min(maxY, node.clientHeight - (b.top + b.height) * fit.zoom)
      setView(prev => ({
        zoom: fit.zoom,
        pan: { x: fit.pan.x, y: Math.max(minY, Math.min(maxY, prev.pan.y)) },
      }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [snappedKey, viewportRef, setView])
  // Treat the entering-snap animation as part of the snapped UI state so the
  // dock doesn't flash back during the transition into a profile.
  const inSnap = atSnap || snapState === 'snapping'

  useEffect(() => {
    if (atSnap) setSelectedId(null)
  }, [atSnap])

  const snappedLabel = (() => {
    if (!snapInfo || !studio) return null
    if (snapInfo.target.kind !== 'profile') return null
    const profile = studio.profiles.find(p => p.id === snapInfo.target.id)
    return profile?.name.trim() || 'Profile'
  })()

  useEffect(() => {
    if (!inSnap) return
    document.body.dataset.studioSnap = 'on'
    if (snappedLabel) document.body.dataset.studioSnapLabel = snappedLabel
    return () => {
      delete document.body.dataset.studioSnap
      delete document.body.dataset.studioSnapLabel
    }
  }, [inSnap, snappedLabel])

  const exitSnap = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    // Zoom out 20% anchored on viewport center — enough to leave the lock band.
    const cx = el.clientWidth / 2
    const cy = el.clientHeight / 2
    const factor = 0.8
    const v = view
    easeTo({
      zoom: v.zoom * factor,
      pan: { x: cx - (cx - v.pan.x) * factor, y: cy - (cy - v.pan.y) * factor },
    })
  }, [viewportRef, easeTo, view])

  useEffect(() => {
    if (!atSnap) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      exitSnap()
    }
    const onExitRequest = () => exitSnap()
    window.addEventListener('keydown', onKey)
    window.addEventListener('studio:exit-snap', onExitRequest)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('studio:exit-snap', onExitRequest)
    }
  }, [atSnap, exitSnap])

  const selected = widgets?.find(w => w.id === selectedId) ?? null
  const canDelete = !inSnap && !!selected && canEditWidget(selected)

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    setWidgets(prev => {
      const target = prev.find(w => w.id === selectedId)
      if (!target) return prev
      if (target.profileId !== currentProfileId) return prev
      return prev.filter(w => w.id !== selectedId)
    })
    setSelectedId(null)
  }, [selectedId, setWidgets, currentProfileId])

  // Delete/Backspace removes selected widget when canvas owns focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      )
        return
      if (!canDelete) return
      e.preventDefault()
      deleteSelected()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canDelete, deleteSelected])

  if (isLoading || !widgets) {
    return (
      <main className="studio-page studio-page--infinite">
        <div className="app-loading" role="status" aria-live="polite">
          <span>Loading studio…</span>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="studio-page studio-page--infinite">
        <div className="app-loading" role="alert">
          <span>{error instanceof Error ? error.message : 'Failed to load studio'}</span>
        </div>
      </main>
    )
  }

  return (
    <main className="studio-page studio-page--infinite">
      <StudioCanvas
        viewportRef={setViewportRef}
        widgets={widgets}
        profiles={studio?.profiles ?? []}
        selectedId={selectedId}
        pan={pan}
        zoom={zoom}
        drag={drag}
        snapState={snapState}
        atSnap={inSnap}
        isReadOnly={w => !canEditWidget(w)}
        onOpenSnap={openSnap}
        snappedKey={snappedKey}
        onViewportPointerDown={onViewportPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWidgetPointerDown={
          inSnap
            ? noopPointer
            : (e, w) => {
                if (!canEditWidget(w)) return
                onWidgetPointerDown(e, w)
              }
        }
        onResizePointerDown={
          inSnap
            ? noopPointer
            : (e, w) => {
                if (!canEditWidget(w)) return
                onResizePointerDown(e, w)
              }
        }
        onSelect={
          inSnap
            ? noopSelect
            : (id: string) => {
                const w = widgets?.find(x => x.id === id)
                if (!canEditWidget(w)) return
                setSelectedId(id)
              }
        }
      >
        {!inSnap && (
          <StudioDock
            canDelete={canDelete}
            onAdd={addWidget}
            onDelete={deleteSelected}
            onRecenter={fitToBounds}
          />
        )}
<div className="studio-hud">
          <span>{Math.round(zoom * 100)}%</span>
          <span className="studio-hud-hint">
            drag empty space to pan • scroll or Ctrl +/- to zoom • Delete to remove
          </span>
        </div>
      </StudioCanvas>
    </main>
  )
}

/** Fraction of viewport width the snap fits into. Phones get the full width
 *  so content reads like a regular page; desktops get 80% so the snap sits
 *  centered with breathing room on either side. */
const MOBILE_BREAKPOINT = 768
function snapFitFraction(viewportWidth: number) {
  return viewportWidth < MOBILE_BREAKPOINT ? 1 : 0.8
}

function computeFitView(bounds: BoundsRect, viewportWidth: number): ViewState {
  const targetWidth = viewportWidth * snapFitFraction(viewportWidth)
  const fitZoom = Math.min(MAX_ZOOM, targetWidth / bounds.width)
  return {
    zoom: fitZoom,
    pan: {
      x: viewportWidth / 2 - bounds.centerX * fitZoom,
      y: NAV_H - bounds.top * fitZoom,
    },
  }
}

const noopPointer = () => {}
const noopSelect = () => {}

function makeWidget<T extends WidgetType>(
  type: T,
  base: { id: string; profileId: string; col: number; row: number; w: number; h: number },
): Widget {
  // TS can't narrow {type: T, data: WidgetData<T>} to the union; the function
  // signature enforces it for callers.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return { ...base, type, data: defaultData(type) } as Widget
}
StudioPage.displayName = 'StudioPage'
