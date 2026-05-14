import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DebugLabel } from '../../components/DebugLabel'
import { useStudioQuery, useSaveMyWidgets, useCreateWidget } from './data/useStudio'
import { useStudioHub } from './realtime/useStudioHub'
import { StudioCanvas } from './canvas/StudioCanvas'
import { StudioDock } from './hud/StudioDock'
import { StudioHud } from './hud/StudioHud'
import { PeerCursorsLayer } from './hud/PeerCursorsLayer'
import { useStudioDrag } from './canvas/useStudioDrag'
import {
  MAX_ZOOM,
  useViewport,
  type ScrollLock,
  type ViewState,
} from './canvas/useViewport'
import {
  NAV_H,
  STEP_X,
  STEP_Y,
  findSnapTarget,
  getSnapTargets,
  type BoundsRect,
  type SnapKind,
  type SnapTarget,
} from './model/bounds'
import { isDraftId, nextDraftId, type Widget, type WidgetType } from './model/widget'
import { type CanvasItemKind, isProfile } from './model/canvasItem'
import { WIDGET_CATALOG } from './widgets/catalog'

export function StudioPage() {
  const { data: studio, isLoading, error } = useStudioQuery()
  const saveMutation = useSaveMyWidgets()
  const createMutation = useCreateWidget()
  const [widgets, setWidgetsState] = useState<Widget[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const widgetsRef = useRef<Widget[] | null>(null)
  widgetsRef.current = widgets
  const didFitRef = useRef(false)
  const currentProfileId = studio?.currentProfileId ?? ''
  const currentUserSub = useMemo(() => {
    if (!studio || !currentProfileId) return ''
    const me = studio.canvasItems.find(i => i.id === currentProfileId)
    return me?.ownerSub ?? ''
  }, [studio, currentProfileId])

  // Edit rights for a widget: profile widgets are editable by their owner;
  // project widgets are editable by the project's creator and listed
  // collaborators (server enforces — this is the UI gate).
  const canEditWidget = useCallback(
    (w: Widget | null | undefined): boolean => {
      if (!w || !studio) return false
      const container = studio.canvasItems.find(i => i.id === w.canvasItemId)
      if (!container) return false
      if (isProfile(container)) return container.id === currentProfileId
      return (
        container.ownerSub === currentUserSub ||
        container.collaboratorSubs.includes(currentUserSub)
      )
    },
    [studio, currentProfileId, currentUserSub],
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

  // Widgets the user can edit (across every container they have rights on).
  // Drives autosave and the post-save reconcile.
  const editableWidgets = useMemo(
    () => (widgets ? widgets.filter(canEditWidget) : []),
    [widgets, canEditWidget],
  )
  // Autosave (PUT) only handles persisted widgets. Drafts are owned by their
  // in-flight POST create — excluding them here means the user can move a
  // freshly-created widget without the autosave racing the create.
  const savableEditableWidgets = useMemo(
    () => editableWidgets.filter(w => !isDraftId(w.id)),
    [editableWidgets],
  )
  const savableKey = useMemo(() => JSON.stringify(savableEditableWidgets), [savableEditableWidgets])
  const lastSavedKeyRef = useRef<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Seed last-saved on initial load so we don't immediately re-save the data
  // we just fetched.
  useEffect(() => {
    if (studio && lastSavedKeyRef.current === null && currentProfileId) {
      lastSavedKeyRef.current = JSON.stringify(
        studio.widgets.filter(w => canEditWidget(w) && !isDraftId(w.id)),
      )
    }
  }, [studio, currentProfileId, canEditWidget])

  // Debounced autosave of the user's editable widgets. Only one request is
  // ever in flight; when isSaving flips false the effect re-runs.
  useEffect(() => {
    if (!currentProfileId || !widgets) return
    if (lastSavedKeyRef.current === savableKey) return
    if (isSaving) return
    const t = setTimeout(() => {
      const snapshot = savableEditableWidgets
      const snapshotKey = savableKey
      setIsSaving(true)
      saveMutation.mutate(snapshot, {
        onSuccess: studio => {
          // Server response is authoritative for persisted widgets across the
          // containers the caller can edit. Drafts and other-container
          // widgets are preserved from local state.
          setWidgetsState(prev => {
            if (!prev) return studio.widgets
            const editableIds = new Set(
              studio.widgets
                .filter(w => {
                  const c = studio.canvasItems.find(i => i.id === w.canvasItemId)
                  if (!c) return false
                  if (isProfile(c)) return c.id === studio.currentProfileId
                  // For projects, trust the server: it returned widgets we
                  // could edit, so include them.
                  return true
                })
                .map(w => w.canvasItemId),
            )
            const others = prev.filter(w => !editableIds.has(w.canvasItemId))
            const drafts = prev.filter(
              w => editableIds.has(w.canvasItemId) && isDraftId(w.id),
            )
            const saved = studio.widgets.filter(w => editableIds.has(w.canvasItemId))
            return [...others, ...saved, ...drafts]
          })
          lastSavedKeyRef.current = snapshotKey
        },
        onSettled: () => {
          setIsSaving(false)
        },
      })
    }, 800)
    return () => clearTimeout(t)
  }, [savableKey, savableEditableWidgets, widgets, currentProfileId, isSaving, saveMutation])

  const setWidgets = useCallback((updater: (prev: Widget[]) => Widget[]) => {
    setWidgetsState(prev => (prev ? updater(prev) : prev))
  }, [])

  const applyRemoteWidgets = useCallback(
    (canvasItemId: string, incoming: Widget[]) => {
      setWidgetsState(prev => {
        if (!prev) return prev
        const others = prev.filter(w => w.canvasItemId !== canvasItemId)
        return [...others, ...incoming]
      })
    },
    [],
  )
  const applyRemoteUpsert = useCallback((widget: Widget) => {
    setWidgetsState(prev => {
      if (!prev) return prev
      const idx = prev.findIndex(w => w.id === widget.id)
      if (idx === -1) return [...prev, widget]
      const next = prev.slice()
      next[idx] = widget
      return next
    })
  }, [])
  const { peers, sendCursor } = useStudioHub({
    currentProfileId: currentProfileId || null,
    onRemoteWidgets: applyRemoteWidgets,
    onRemoteUpsert: applyRemoteUpsert,
  })

  const {
    drag,
    onWidgetPointerDown,
    onResizePointerDown,
    onViewportPointerDown,
    onPointerMove: onDragPointerMove,
    onPointerUp,
  } = useStudioDrag({ zoom, setView, setWidgets, setSelectedId })

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      onDragPointerMove(e)
      const el = viewportRef.current
      if (el) {
        const rect = el.getBoundingClientRect()
        const x = (e.clientX - rect.left - pan.x) / zoom
        const y = (e.clientY - rect.top - pan.y) / zoom
        sendCursor(x, y)
      }
    },
    [onDragPointerMove, viewportRef, pan.x, pan.y, zoom, sendCursor],
  )

  const addWidget = useCallback(
    (type: WidgetType, targetContainerId: string, targetKind: CanvasItemKind) => {
      if (!targetContainerId) return
      if (!WIDGET_CATALOG[type].allowedIn.includes(targetKind)) return
      const el = viewportRef.current
      let col = 0,
        row = 0
      if (el) {
        const cx = (el.clientWidth / 2 - pan.x) / zoom
        const cy = (el.clientHeight / 2 - pan.y) / zoom
        col = Math.round(cx / STEP_X)
        row = Math.round(cy / STEP_Y)
      }
      const draft = makeWidget(type, targetKind, {
        id: nextDraftId(),
        canvasItemId: targetContainerId,
        col,
        row,
        w: 4,
        h: 3,
      })
      // Optimistic insert. Each click fires its own POST; the per-user
      // semaphore on the server serializes them so spam-creates land cleanly.
      setWidgets(prev => [...prev, draft])
      createMutation.mutate(draft, {
        onSuccess: created => {
          setWidgets(prev =>
            prev.map(w => (w.id === draft.id ? { ...w, id: created.id } : w)),
          )
        },
        onError: () => {
          setWidgets(prev => prev.filter(w => w.id !== draft.id))
        },
      })
    },
    [pan.x, pan.y, zoom, viewportRef, setWidgets, createMutation],
  )

  const openSnap = useCallback(
    (target: SnapTarget) => {
      const el = viewportRef.current
      if (!el) return
      const b = target.bounds
      const fit = computeFitView(b, el.clientWidth)
      const v = view
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

  const snapToProfile = useCallback(() => {
    if (currentProfileId) openSnapById('profile', currentProfileId)
  }, [openSnapById, currentProfileId])

  const recenter = useCallback(() => {
    if (!widgets || !currentProfileId) return
    const el = viewportRef.current
    if (!el) return
    const target = findSnapTarget(widgets, 'profile', currentProfileId)
    if (!target) return
    const fit = computeFitView(target.bounds, el.clientWidth)
    const zoom = fit.zoom * 0.9
    const b = target.bounds
    easeTo({
      zoom,
      pan: {
        x: el.clientWidth / 2 - b.centerX * zoom,
        y: el.clientHeight / 2 - (b.top + b.height / 2) * zoom,
      },
    })
  }, [widgets, currentProfileId, viewportRef, easeTo])

  // Initial framing: center on the user's profile but stay just out of the
  // snap-detection threshold (zoom < fit.zoom) so the studio loads in free-pan
  // mode. Same math as `recenter` so the two entry points stay in sync.
  useEffect(() => {
    if (!didFitRef.current && widgets && widgets.length > 0 && currentProfileId) {
      didFitRef.current = true
      const el = viewportRef.current
      const target = findSnapTarget(widgets, 'profile', currentProfileId)
      if (!el || !target) return
      const fit = computeFitView(target.bounds, el.clientWidth)
      const z = fit.zoom * 0.9
      const b = target.bounds
      setView({
        zoom: z,
        pan: {
          x: el.clientWidth / 2 - b.centerX * z,
          y: el.clientHeight / 2 - (b.top + b.height / 2) * z,
        },
      })
    }
  }, [widgets, viewportRef, setView, currentProfileId])

  // Locked onto a snap target when zoom + horizontal pan match its fit view.
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
        const maxY = fit.pan.y
        const minY = Math.min(maxY, el.clientHeight - (b.top + b.height) * fit.zoom)
        return { minY, maxY, target: t }
      }
    }
    return null
  })()
  const atSnap = snapInfo !== null
  scrollLockRef.current = snapInfo

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
  const inSnap = atSnap || snapState === 'snapping'

  useEffect(() => {
    if (atSnap) setSelectedId(null)
  }, [atSnap])

  const snappedLabel = (() => {
    if (!snapInfo || !studio) return null
    const item = studio.canvasItems.find(i => i.id === snapInfo.target.id)
    if (!item) return null
    return item.name.trim() || (item.kind === 'project' ? 'Project' : 'Profile')
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
      if (!canEditWidget(target)) return prev
      return prev.filter(w => w.id !== selectedId)
    })
    setSelectedId(null)
  }, [selectedId, setWidgets, canEditWidget])

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

  // Decide which container the dock should target. While snapped onto a
  // container the caller can edit, new widgets go there. Otherwise default
  // to the caller's profile.
  const snappedContainer = snapInfo
    ? studio?.canvasItems.find(i => i.id === snapInfo.target.id) ?? null
    : null
  const dockContainer = snappedContainer ?? studio?.canvasItems.find(i => i.id === currentProfileId) ?? null
  const dockKind: CanvasItemKind = dockContainer?.kind ?? 'profile'
  const dockContainerId = dockContainer?.id ?? currentProfileId

  return (
    <main className="studio-page studio-page--infinite">
      <DebugLabel name="StudioPage" />
      <StudioCanvas
        viewportRef={setViewportRef}
        widgets={widgets}
        canvasItems={studio?.canvasItems ?? []}
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
        <PeerCursorsLayer peers={peers} pan={pan} zoom={zoom} />
        {!inSnap && (
          <StudioDock
            containerKind={dockKind}
            canDelete={canDelete}
            onAdd={t => addWidget(t, dockContainerId, dockKind)}
            onDelete={deleteSelected}
            onRecenter={recenter}
            onSnapToProfile={snapToProfile}
          />
        )}
        {!inSnap && <StudioHud zoom={zoom} />}
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
  canvasItemKind: CanvasItemKind,
  base: { id: string; canvasItemId: string; col: number; row: number; w: number; h: number },
): Widget {
  return {
    ...base,
    canvasItemKind,
    type,
    data: WIDGET_CATALOG[type].defaultData,
  } as Widget
}
StudioPage.displayName = 'StudioPage'
