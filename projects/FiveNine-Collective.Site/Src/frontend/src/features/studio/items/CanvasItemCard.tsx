import { isProfile, isProject, type CanvasItem } from '../model/canvasItem'
import { ProfileCard } from './profile/ProfileCard'
import { ProjectCard } from './project/ProjectCard'

interface Props {
  item: CanvasItem
  width: number
  height: number
}

/** Dispatches a CanvasItem to its kind-specific card template. Keeping the
 *  dispatch in one place means new kinds plug in here without changing the
 *  layer that positions cards on the canvas. */
export function CanvasItemCard({ item, width, height }: Props) {
  if (isProfile(item)) return <ProfileCard profile={item} width={width} height={height} />
  if (isProject(item)) return <ProjectCard project={item} width={width} height={height} />
  // Exhaustiveness: TS will complain here if a new kind is added without a branch.
  const _exhaustive: never = item
  void _exhaustive
  return null
}
CanvasItemCard.displayName = 'CanvasItemCard'
