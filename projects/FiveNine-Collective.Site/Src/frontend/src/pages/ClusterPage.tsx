import { useCallback, useEffect, useRef, useState } from 'react'
import { ClusterCanvas } from '../components/cluster/ClusterCanvas'
import { ClusterDock } from '../components/cluster/ClusterDock'
import {
  STEP_X, STEP_Y,
  defaultData, getClusterBounds, nextId,
  type DragState, type Widget, type WidgetType,
} from '../components/cluster/types'

const initialWidgets: Widget[] = [
  { id: 'w0', type: 'profile', col: 0,  row: -4, w: 5, h: 3, data: { name: 'Malik Cornet', role: 'Builder · Montréal', bio: 'Designer/dev making weird things on purpose.' } },
  { id: 'w1', type: 'about',   col: 0,  row: 0, w: 5, h: 3, data: { title: 'About', body: 'Designer, builder, dreamer. Based in Montréal.' } },
  { id: 'w2', type: 'gallery', col: 6,  row: 0, w: 6, h: 4, data: { count: 3 } },
  { id: 'w3', type: 'links',   col: 0,  row: 4, w: 4, h: 3, data: { items: ['Portfolio', 'Blog', 'Shop'] } },
  { id: 'w4', type: 'socials', col: 5,  row: 5, w: 4, h: 2, data: { items: ['IG', 'YT', 'SC', 'X'] } },
  { id: 'w5', type: 'text',    col: 10, row: 5, w: 4, h: 2, data: { body: '"Make weird things on purpose."' } },
]

export function ClusterPage() {
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState>(null)
  const [view, setView] = useState({ pan: { x: 200, y: 120 }, zoom: 1 })
  const { pan, zoom } = view
  const viewportRef = useRef<HTMLDivElement>(null)

  const onWidgetPointerDown = (e: React.PointerEvent, w: Widget) => {
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setSelectedId(w.id)
    setDrag({ kind: 'move', id: w.id, startX: e.clientX, startY: e.clientY, origCol: w.col, origRow: w.row })
  }

  const onResizePointerDown = (e: React.PointerEvent, w: Widget) => {
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setSelectedId(w.id)
    setDrag({ kind: 'resize', id: w.id, startX: e.clientX, startY: e.clientY, origW: w.w, origH: w.h })
  }

  const onViewportPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setSelectedId(null)
    setDrag({ kind: 'pan', startX: e.clientX, startY: e.clientY, origPanX: view.pan.x, origPanY: view.pan.y })
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY

    if (drag.kind === 'pan') {
      setView(v => ({ ...v, pan: { x: drag.origPanX + dx, y: drag.origPanY + dy } }))
      return
    }

    const dCol = Math.round(dx / (STEP_X * view.zoom))
    const dRow = Math.round(dy / (STEP_Y * view.zoom))

    setWidgets(prev => prev.map(w => {
      if (w.id !== drag.id) return w
      if (drag.kind === 'move') {
        return { ...w, col: drag.origCol + dCol, row: drag.origRow + dRow }
      }
      return {
        ...w,
        w: Math.max(1, drag.origW + dCol),
        h: Math.max(1, drag.origH + dRow),
      }
    }))
  }

  const onPointerUp = () => setDrag(null)

  const onZoom = useCallback((factor: number, mx: number, my: number) => {
    setView(v => {
      const next = Math.min(2, Math.max(0.001, v.zoom * factor))
      const scale = next / v.zoom
      return {
        zoom: next,
        pan: { x: mx - (mx - v.pan.x) * scale, y: my - (my - v.pan.y) * scale },
      }
    })
  }, [])

  const addWidget = (type: WidgetType) => {
    const el = viewportRef.current
    let col = 0, row = 0
    if (el) {
      const cx = (el.clientWidth / 2 - pan.x) / zoom
      const cy = (el.clientHeight / 2 - pan.y) / zoom
      col = Math.round(cx / STEP_X)
      row = Math.round(cy / STEP_Y)
    }
    setWidgets([...widgets, { id: nextId(), type, col, row, w: 4, h: 3, data: defaultData(type) }])
  }

  const fitToBounds = useCallback(() => {
    const el = viewportRef.current
    const b = getClusterBounds(widgets)
    if (!el || !b) return
    const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 0
    const fitZoom = Math.min(2, el.clientWidth / b.width)
    setView({
      zoom: fitZoom,
      pan: {
        x: el.clientWidth / 2 - b.centerX * fitZoom,
        y: navH - b.top * fitZoom,
      },
    })
  }, [widgets])

  useEffect(() => {
    fitToBounds()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selected = widgets.find(w => w.id === selectedId) ?? null
  const canDelete = !!selected && selected.type !== 'profile'

  const deleteSelected = () => {
    if (!canDelete) return
    setWidgets(widgets.filter(w => w.id !== selectedId))
    setSelectedId(null)
  }

  const recenter = fitToBounds

  return (
    <div className="cluster-page cluster-page--infinite">
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
        onZoom={onZoom}
      >
        <ClusterDock
          canDelete={canDelete}
          onAdd={addWidget}
          onDelete={deleteSelected}
          onRecenter={recenter}
        />
        <div className="cluster-hud">
          <span>{Math.round(zoom * 100)}%</span>
          <span className="cluster-hud-hint">drag empty space to pan • scroll to zoom</span>
        </div>
      </ClusterCanvas>
    </div>
  )
}
