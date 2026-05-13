import { useCallback, useEffect, useRef, useState } from 'react'
import { useClusterQuery } from '../api/useCluster'
import { ClusterCanvas } from '../components/cluster/ClusterCanvas'
import { ClusterDock } from '../components/cluster/ClusterDock'
import { useClusterDrag } from '../components/cluster/useClusterDrag'
import { useViewport } from '../components/cluster/useViewport'
import {
  NAV_H,
  STEP_X,
  STEP_Y,
  defaultData,
  getClusterBounds,
  nextDraftId,
  type Widget,
  type WidgetType,
} from '../components/cluster/types'

export function ClusterPage() {
  const { data: cluster, isLoading, error } = useClusterQuery()
  const [widgets, setWidgetsState] = useState<Widget[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { view, setView, viewportRef } = useViewport()
  const { pan, zoom } = view
  const didFitRef = useRef(false)

  useEffect(() => {
    if (cluster && widgets === null) setWidgetsState(cluster.widgets)
  }, [cluster, widgets])

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
  } = useClusterDrag({ zoom, setView, setWidgets, setSelectedId })

  const addWidget = useCallback(
    (type: WidgetType) => {
      const el = viewportRef.current
      let col = 0,
        row = 0
      if (el) {
        const cx = (el.clientWidth / 2 - pan.x) / zoom
        const cy = (el.clientHeight / 2 - pan.y) / zoom
        col = Math.round(cx / STEP_X)
        row = Math.round(cy / STEP_Y)
      }
      setWidgets(prev => [...prev, makeWidget(type, { id: nextDraftId(), col, row, w: 4, h: 3 })])
    },
    [pan.x, pan.y, zoom, viewportRef, setWidgets],
  )

  const fitToBounds = useCallback(() => {
    const el = viewportRef.current
    if (!el || !widgets) return
    const b = getClusterBounds(widgets)
    if (!b) return
    const fitZoom = Math.min(2, el.clientWidth / b.width)
    setView({
      zoom: fitZoom,
      pan: {
        x: el.clientWidth / 2 - b.centerX * fitZoom,
        y: NAV_H - b.top * fitZoom,
      },
    })
  }, [widgets, viewportRef, setView])

  useEffect(() => {
    if (!didFitRef.current && widgets && widgets.length > 0) {
      didFitRef.current = true
      fitToBounds()
    }
  }, [widgets, fitToBounds])

  const selected = widgets?.find(w => w.id === selectedId) ?? null
  const canDelete = !!selected && selected.type !== 'profile'

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    setWidgets(prev => {
      const target = prev.find(w => w.id === selectedId)
      if (!target || target.type === 'profile') return prev
      return prev.filter(w => w.id !== selectedId)
    })
    setSelectedId(null)
  }, [selectedId, setWidgets])

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
      <main className="cluster-page cluster-page--infinite">
        <div className="app-loading" role="status" aria-live="polite">
          <span>Loading studio…</span>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="cluster-page cluster-page--infinite">
        <div className="app-loading" role="alert">
          <span>{error instanceof Error ? error.message : 'Failed to load cluster'}</span>
        </div>
      </main>
    )
  }

  return (
    <main className="cluster-page cluster-page--infinite">
      <ClusterCanvas
        viewportRef={viewportRef}
        widgets={widgets}
        selectedId={selectedId}
        pan={pan}
        zoom={zoom}
        drag={drag}
        onViewportPointerDown={onViewportPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWidgetPointerDown={onWidgetPointerDown}
        onResizePointerDown={onResizePointerDown}
        onSelect={setSelectedId}
      >
        <ClusterDock
          canDelete={canDelete}
          onAdd={addWidget}
          onDelete={deleteSelected}
          onRecenter={fitToBounds}
        />
        <div className="cluster-hud">
          <span>{Math.round(zoom * 100)}%</span>
          <span className="cluster-hud-hint">
            drag empty space to pan • scroll or Ctrl +/- to zoom • Delete to remove
          </span>
        </div>
      </ClusterCanvas>
    </main>
  )
}

function makeWidget<T extends WidgetType>(
  type: T,
  base: { id: string; col: number; row: number; w: number; h: number },
): Widget {
  // TS can't narrow {type: T, data: WidgetData<T>} to the union; the function
  // signature enforces it for callers.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return { ...base, type, data: defaultData(type) } as Widget
}
