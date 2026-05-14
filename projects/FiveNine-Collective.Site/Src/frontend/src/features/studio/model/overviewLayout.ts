import { isProfile, isProject, type CanvasItem } from './canvasItem'

export type OverviewLayout = 'explorer' | 'space'

export interface LayoutPosition {
  /** Canvas-space coordinates where the card's center should sit. */
  x: number
  y: number
}

const CARD_W = 1400
const CARD_H = 1750
/** Inter-card gap used as the unit for both layouts. */
const GAP = 400
const GRID_STEP_X = CARD_W + GAP
const GRID_STEP_Y = CARD_H + GAP

/** Row-major grid. Number of columns scales with sqrt(N) so the result stays
 *  roughly square regardless of how many items there are. */
function computeExplorerLayout(items: CanvasItem[]): Map<string, LayoutPosition> {
  const N = items.length
  if (N === 0) return new Map()
  const cols = Math.max(1, Math.ceil(Math.sqrt(N)))
  const result = new Map<string, LayoutPosition>()
  items.forEach((item, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    result.set(item.id, { x: col * GRID_STEP_X, y: row * GRID_STEP_Y })
  })
  return result
}

/** Force-directed layout where projects pull their owner + collaborator
 *  profiles toward themselves. Pairs without a shared project drift apart.
 *
 *  Runs a fixed number of iterations from a stable circular seed so the
 *  result is deterministic for a given input (no animation jitter across
 *  re-renders). */
function computeSpaceLayout(items: CanvasItem[]): Map<string, LayoutPosition> {
  const N = items.length
  if (N === 0) return new Map()

  // Seed positions on a circle. Deterministic so the layout is stable.
  const radius = Math.max(GRID_STEP_X, N * (GRID_STEP_X / 4))
  const pos = items.map((item, i) => ({
    item,
    x: Math.cos((i / N) * 2 * Math.PI) * radius,
    y: Math.sin((i / N) * 2 * Math.PI) * radius,
  }))

  // Edges: every project pulls toward every profile that owns or collaborates
  // on it. Indices map into `pos`.
  const idxBySub = new Map<string, number[]>()
  pos.forEach((p, i) => {
    if (isProfile(p.item)) {
      const arr = idxBySub.get(p.item.ownerSub) ?? []
      arr.push(i)
      idxBySub.set(p.item.ownerSub, arr)
    }
  })
  const edges: [number, number][] = []
  pos.forEach((p, i) => {
    if (!isProject(p.item)) return
    const subs = new Set<string>([p.item.ownerSub, ...p.item.collaboratorSubs])
    for (const s of subs) {
      const profileIdxs = idxBySub.get(s) ?? []
      for (const j of profileIdxs) edges.push([i, j])
    }
  })

  const ITER = 220
  const REPULSION = 8_000_000
  const SPRING_LENGTH = GRID_STEP_X * 0.9
  const SPRING_K = 0.04
  const STEP = 0.015

  for (let t = 0; t < ITER; t++) {
    const fx = new Array(N).fill(0)
    const fy = new Array(N).fill(0)

    // Pairwise repulsion keeps everyone apart.
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = pos[i].x - pos[j].x
        const dy = pos[i].y - pos[j].y
        const d2 = dx * dx + dy * dy + 1
        const d = Math.sqrt(d2)
        const f = REPULSION / d2
        fx[i] += (dx / d) * f
        fy[i] += (dy / d) * f
        fx[j] -= (dx / d) * f
        fy[j] -= (dy / d) * f
      }
    }

    // Spring attraction along edges pulls collaborators toward shared projects.
    for (const [i, j] of edges) {
      const dx = pos[j].x - pos[i].x
      const dy = pos[j].y - pos[i].y
      const d = Math.sqrt(dx * dx + dy * dy) + 1
      const f = SPRING_K * (d - SPRING_LENGTH)
      fx[i] += (dx / d) * f
      fy[i] += (dy / d) * f
      fx[j] -= (dx / d) * f
      fy[j] -= (dy / d) * f
    }

    // Cooling schedule: bigger steps early, fine adjustments late.
    const cool = 1 - t / ITER
    for (let i = 0; i < N; i++) {
      pos[i].x += fx[i] * STEP * cool
      pos[i].y += fy[i] * STEP * cool
    }
  }

  // Recenter the layout on (0, 0) so the camera framing math doesn't have to
  // know which way the simulation drifted.
  let cx = 0,
    cy = 0
  for (const p of pos) {
    cx += p.x
    cy += p.y
  }
  cx /= N
  cy /= N

  const result = new Map<string, LayoutPosition>()
  for (const p of pos) result.set(p.item.id, { x: p.x - cx, y: p.y - cy })
  return result
}

export function computeOverviewLayout(
  items: CanvasItem[],
  layout: OverviewLayout,
): Map<string, LayoutPosition> {
  if (layout === 'explorer') return computeExplorerLayout(items)
  return computeSpaceLayout(items)
}
