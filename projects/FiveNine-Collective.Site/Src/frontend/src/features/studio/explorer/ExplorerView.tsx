import { useEffect, useMemo, useRef, useState } from 'react'
import { DebugLabel } from '../../../components/DebugLabel'
import {
  isProfile,
  isProject,
  type CanvasItem,
  type ProfileItem,
  type ProjectItem,
} from '../model/canvasItem'
import { CanvasItemCard } from '../items/CanvasItemCard'

type Tab = 'profiles' | 'projects'

/** Cards mirror the canvas card aspect ratio (1400 × 1750 → 0.8) so the
 *  typography inside scales the same way the space view does. */
const CARD_ASPECT = 1400 / 1750

interface Props {
  canvasItems: CanvasItem[]
  currentProfileId: string
  onEnter: (id: string) => void
}

export function ExplorerView({ canvasItems, currentProfileId, onEnter }: Props) {
  const [tab, setTab] = useState<Tab>('profiles')

  const profiles = useMemo(() => canvasItems.filter(isProfile), [canvasItems])
  const projects = useMemo(() => canvasItems.filter(isProject), [canvasItems])

  return (
    <div className="studio-explorer">
      <DebugLabel name="ExplorerView" />
      <header className="studio-explorer-header">
        <div className="studio-explorer-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'profiles'}
            className={`studio-explorer-tab${tab === 'profiles' ? ' is-active' : ''}`}
            onClick={() => setTab('profiles')}
          >
            <span>Profiles</span>
            <span className="studio-explorer-tab-count">{profiles.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'projects'}
            className={`studio-explorer-tab${tab === 'projects' ? ' is-active' : ''}`}
            onClick={() => setTab('projects')}
          >
            <span>Projects</span>
            <span className="studio-explorer-tab-count">{projects.length}</span>
          </button>
        </div>
      </header>

      <div className="studio-explorer-body" data-studio-scroll>
        {tab === 'profiles' ? (
          <CardGrid
            items={profiles}
            currentProfileId={currentProfileId}
            onEnter={onEnter}
            emptyLabel="No profiles yet."
          />
        ) : (
          <CardGrid
            items={projects}
            currentProfileId={currentProfileId}
            onEnter={onEnter}
            emptyLabel="No projects yet."
          />
        )}
      </div>
    </div>
  )
}
ExplorerView.displayName = 'ExplorerView'

function CardGrid({
  items,
  currentProfileId,
  onEnter,
  emptyLabel,
}: {
  items: ReadonlyArray<ProfileItem | ProjectItem>
  currentProfileId: string
  onEnter: (id: string) => void
  emptyLabel: string
}) {
  if (items.length === 0) {
    return <EmptyState label={emptyLabel} />
  }
  return (
    <div className="studio-explorer-grid">
      {items.map(item => (
        <ExplorerCard
          key={item.id}
          item={item}
          isMe={item.kind === 'profile' && item.id === currentProfileId}
          onEnter={onEnter}
        />
      ))}
    </div>
  )
}

function ExplorerCard({
  item,
  isMe,
  onEnter,
}: {
  item: ProfileItem | ProjectItem
  isMe: boolean
  onEnter: (id: string) => void
}) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const e = entries[0]
      if (!e) return
      const w = e.contentRect.width
      setSize({ w, h: w / CARD_ASPECT })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <button
      type="button"
      className="studio-explorer-card"
      data-kind={item.kind}
      onClick={() => onEnter(item.id)}
      aria-label={`Open ${item.name || item.kind}`}
    >
      <div
        ref={frameRef}
        className="studio-explorer-card-frame"
        style={{ aspectRatio: `${CARD_ASPECT}` }}
      >
        {size && <CanvasItemCard item={item} width={size.w} height={size.h} />}
      </div>
      {isMe && <span className="studio-explorer-card-badge">You</span>}
    </button>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="studio-explorer-empty">
      <div className="studio-explorer-empty-icon" aria-hidden>
        ◐
      </div>
      <p>{label}</p>
    </div>
  )
}
