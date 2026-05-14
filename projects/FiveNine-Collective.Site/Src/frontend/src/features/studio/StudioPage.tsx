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
  findCanvasItemBoundsById,
  type BoundsRect,
} from './model/bounds'
import { isDraftId, nextDraftId, type Widget, type WidgetType } from './model/widget'
import { type CanvasItemKind, isProfile } from './model/canvasItem'
import { computeOverviewLayout, type OverviewLayout } from './model/overviewLayout'
import { WIDGET_CATALOG } from './widgets/catalog'
import { ExplorerView } from './explorer/ExplorerView'

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

  // Updates the `data` payload of a single widget in-place. Type-erased
  // because each widget kind has its own data shape; the body components
  // pass in their typed data and we trust the call-site.
  const updateWidgetData = useCallback(
    (id: string, data: unknown) => {
      setWidgets(prev =>
        prev.map(w => (w.id === id ? ({ ...w, data } as Widget) : w)),
      )
    },
    [setWidgets],
  )

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

  // `dimensionId` is the source of truth for "you are inside someone's
  // dimension". Overview = null; everything else = that CanvasItem's id.
  const [dimensionId, setDimensionId] = useState<string | null>(null)
  const inDimension = dimensionId !== null

  // Inside a dimension, the user is in read-only mode by default. Toggling
  // edit mode unlocks drag/resize on owned widgets and reveals the
  // add/delete controls in the dock. Always reset when the dimension
  // changes so re-entering doesn't carry stale state.
  const [editMode, setEditMode] = useState(false)
  useEffect(() => {
    setEditMode(false)
  }, [dimensionId])

  // Overview-only: how to arrange the cards on the canvas.
  const [overviewLayout, setOverviewLayout] = useState<OverviewLayout>('explorer')
  const cardPositions = useMemo(
    () => (studio ? computeOverviewLayout(studio.canvasItems, overviewLayout) : new Map()),
    [studio, overviewLayout],
  )

  // Bounds rect for an item as it sits on the overview canvas (a card-sized
  // box at the layout-driven position). Independent of mode — useful when
  // we need to frame the overview *despite* still being in a dimension
  // (e.g. exitDimension before its setState flushes).
  const getOverviewCardBounds = useCallback(
    (id: string): BoundsRect | null => {
      const pos = cardPositions.get(id)
      if (!pos) return null
      return {
        left: pos.x - OVERVIEW_CARD_W / 2,
        top: pos.y - OVERVIEW_CARD_H / 2,
        width: OVERVIEW_CARD_W,
        height: OVERVIEW_CARD_H,
        centerX: pos.x,
        centerY: pos.y,
      }
    },
    [cardPositions],
  )

  // Bounds rect for a CanvasItem as the user *currently* sees it. Overview
  // → card box at layout position; inside a dimension → widget-derived rect.
  const getViewBounds = useCallback(
    (id: string): BoundsRect | null => {
      if (!inDimension) {
        const overview = getOverviewCardBounds(id)
        if (overview) return overview
      }
      return widgets ? findCanvasItemBoundsById(widgets, id) : null
    },
    [inDimension, getOverviewCardBounds, widgets],
  )

  // Single source of truth for "frame the camera on this bounds rect" — used
  // by Recenter, the post-exit landing, and the initial-load framing. Fixed
  // 50% zoom so the HUD always reads 50% and the framing is consistent
  // across entry points.
  const FRAMING_ZOOM = 0.5
  const centerCameraOn = useCallback(
    (bounds: BoundsRect, behavior: 'instant' | 'ease' = 'ease') => {
      const el = viewportRef.current
      if (!el) return
      const next: ViewState = {
        zoom: FRAMING_ZOOM,
        pan: {
          x: el.clientWidth / 2 - bounds.centerX * FRAMING_ZOOM,
          y: el.clientHeight / 2 - (bounds.top + bounds.height / 2) * FRAMING_ZOOM,
        },
      }
      if (behavior === 'instant') setView(next)
      else easeTo(next)
    },
    [viewportRef, easeTo, setView],
  )

  // Dive into an item's dimension. Two-step camera move: first pan toward
  // the card's overview position, then fit-zoom onto the dimension's actual
  // widget bounds. After the second animation, flip `dimensionId` so only
  // that item's widgets remain.
  const enterDimension = useCallback(
    (id: string) => {
      if (!widgets) return
      const el = viewportRef.current
      const overviewBounds =
        cardPositions.get(id) && {
          left: cardPositions.get(id)!.x - OVERVIEW_CARD_W / 2,
          top: cardPositions.get(id)!.y - OVERVIEW_CARD_H / 2,
          width: OVERVIEW_CARD_W,
          height: OVERVIEW_CARD_H,
          centerX: cardPositions.get(id)!.x,
          centerY: cardPositions.get(id)!.y,
        }
      const widgetBounds = findCanvasItemBoundsById(widgets, id)
      const target = widgetBounds ?? overviewBounds
      if (!el || !target) {
        setDimensionId(id)
        return
      }
      const fit = computeFitView(target, el.clientWidth)
      const v = view
      const flyTo = overviewBounds ?? target
      const interim: ViewState = {
        zoom: v.zoom,
        pan: {
          x: el.clientWidth / 2 - flyTo.centerX * v.zoom,
          y: NAV_H - flyTo.top * v.zoom,
        },
      }
      animateTo(interim, {
        asSnap: true,
        durationMs: 450,
        easing: 'inOut',
        onDone: () =>
          animateTo(fit, {
            asSnap: true,
            durationMs: 400,
            onDone: () => setDimensionId(id),
          }),
      })
    },
    [widgets, cardPositions, viewportRef, animateTo, view],
  )

  const exitDimension = useCallback(() => {
    setDimensionId(null)
    if (!currentProfileId) return
    // After clearing dimensionId we're in overview — frame the user's card
    // at its overview position (not its widget bounds). The dimension state
    // hasn't flushed yet, so we ask explicitly for the overview bounds.
    const target = getOverviewCardBounds(currentProfileId)
    if (!target) return
    centerCameraOn(target)
  }, [currentProfileId, getOverviewCardBounds, centerCameraOn])

const changeOverviewLayout = useCallback(
    (next: OverviewLayout) => {
      setOverviewLayout(next)
    },
    [],
  )

  const recenter = useCallback(() => {
    const id = inDimension ? dimensionId : currentProfileId
    if (!id) return
    const target = getViewBounds(id)
    if (!target) return
    centerCameraOn(target)
  }, [inDimension, dimensionId, currentProfileId, getViewBounds, centerCameraOn])

  // Initial framing: same camera as Recenter — fixed 50% zoom centered on
  // the user's overview card. Waits for the layout to be computed before
  // framing so we don't snap to (0,0) on first render.
  useEffect(() => {
    if (didFitRef.current) return
    if (!widgets || widgets.length === 0 || !currentProfileId) return
    if (cardPositions.size === 0) return
    const target = getOverviewCardBounds(currentProfileId)
    if (!target) return
    didFitRef.current = true
    centerCameraOn(target, 'instant')
  }, [widgets, currentProfileId, cardPositions, getOverviewCardBounds, centerCameraOn])

  // No scroll lock — both overview and dimension are free-pan infinite spaces.
  scrollLockRef.current = null

  useEffect(() => {
    if (inDimension) setSelectedId(null)
  }, [inDimension])

  const dimensionLabel = (() => {
    if (!dimensionId || !studio) return null
    const item = studio.canvasItems.find(i => i.id === dimensionId)
    if (!item) return null
    return item.name.trim() || (item.kind === 'project' ? 'Project' : 'Profile')
  })()

  // Repurpose the existing nav breadcrumb plumbing: while in a dimension,
  // body[data-studio-snap] is the signal NavBar reads to show the back-arrow.
  useEffect(() => {
    if (!inDimension) return
    document.body.dataset.studioSnap = 'on'
    if (dimensionLabel) document.body.dataset.studioSnapLabel = dimensionLabel
    return () => {
      delete document.body.dataset.studioSnap
      delete document.body.dataset.studioSnapLabel
    }
  }, [inDimension, dimensionLabel])

  useEffect(() => {
    if (!inDimension) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      exitDimension()
    }
    const onExitRequest = () => exitDimension()
    window.addEventListener('keydown', onKey)
    window.addEventListener('studio:exit-snap', onExitRequest)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('studio:exit-snap', onExitRequest)
    }
  }, [inDimension, exitDimension])

  const selected = widgets?.find(w => w.id === selectedId) ?? null
  const canDelete = inDimension && editMode && !!selected && canEditWidget(selected)

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

  // In a dimension, the dock targets that dimension's container. In overview
  // the dock is hidden — there are no widgets on screen to edit.
  const dockContainer = inDimension
    ? studio?.canvasItems.find(i => i.id === dimensionId) ?? null
    : null
  const dockKind: CanvasItemKind = dockContainer?.kind ?? 'profile'
  const dockContainerId = dockContainer?.id ?? currentProfileId

  // Edit rights for the active dimension's container — drives whether the
  // Edit toggle appears in the dock at all (viewing someone else's profile
  // shouldn't expose an edit button).
  const canEditDimension = (() => {
    if (!dockContainer) return false
    if (isProfile(dockContainer)) return dockContainer.id === currentProfileId
    return (
      dockContainer.ownerSub === currentUserSub ||
      dockContainer.collaboratorSubs.includes(currentUserSub)
    )
  })()

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
        mode={inDimension ? 'inside' : 'overview'}
        dimensionId={dimensionId}
        cardPositions={cardPositions}
        isReadOnly={w => !editMode || !canEditWidget(w)}
        editMode={editMode}
        onUpdateData={updateWidgetData}
        onEnterDimension={enterDimension}
        onViewportPointerDown={onViewportPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWidgetPointerDown={(e, w) => {
          if (!editMode || !canEditWidget(w)) return
          onWidgetPointerDown(e, w)
        }}
        onResizePointerDown={(e, w) => {
          if (!editMode || !canEditWidget(w)) return
          onResizePointerDown(e, w)
        }}
        onSelect={(id: string) => {
          if (!editMode) return
          const w = widgets?.find(x => x.id === id)
          if (!canEditWidget(w)) return
          setSelectedId(id)
        }}
      >
        <PeerCursorsLayer peers={peers} pan={pan} zoom={zoom} />
        {!inDimension && overviewLayout === 'explorer' && (
          <ExplorerView
            canvasItems={studio?.canvasItems ?? []}
            currentProfileId={currentProfileId}
            onEnter={enterDimension}
          />
        )}
        {inDimension ? (
          <StudioDock
            variant="inside"
            containerKind={dockKind}
            canEdit={canEditDimension}
            editMode={editMode}
            onToggleEditMode={() => {
              setEditMode(m => !m)
              setSelectedId(null)
            }}
            canDelete={canDelete}
            onAdd={t => addWidget(t, dockContainerId, dockKind)}
            onDelete={deleteSelected}
            onRecenter={recenter}
          />
        ) : (
          <StudioDock
            variant="overview"
            overviewLayout={overviewLayout}
            onChangeOverviewLayout={changeOverviewLayout}
            onRecenter={recenter}
          />
        )}
        {!inDimension && <StudioHud zoom={zoom} />}
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

/** Card dimensions — must stay in sync with CARD_WIDTH/CARD_HEIGHT in
 *  CanvasItemCardLayer. The camera framing math treats each overview card
 *  as if it were a CanvasItem of this size. */
const OVERVIEW_CARD_W = 1400
const OVERVIEW_CARD_H = 1750

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
