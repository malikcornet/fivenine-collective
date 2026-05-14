/**
 * A CanvasItem is anything that occupies bounded space on the studio canvas
 * and has a card view (zoomed-out) plus an inside view (zoomed-in,
 * collaborative). Profile and Project are the concrete kinds today.
 */
export type CanvasItemKind = 'profile' | 'project'

interface CanvasItemBase {
  id: string
  /** Auth0 sub of the creator/owner. For profiles this is the profile owner;
   *  for projects it's the user who created the project. */
  ownerSub: string
  name: string
}

export interface ProfileItem extends CanvasItemBase {
  kind: 'profile'
  role: string
  bio: string
}

export interface ProjectItem extends CanvasItemBase {
  kind: 'project'
  description: string
  /** Auth0 subs of profiles allowed to edit widgets inside this project. The
   *  creator is implicitly included. */
  collaboratorSubs: string[]
}

export type CanvasItem = ProfileItem | ProjectItem

export const isProfile = (i: CanvasItem): i is ProfileItem => i.kind === 'profile'
export const isProject = (i: CanvasItem): i is ProjectItem => i.kind === 'project'

/** Display label for a CanvasItem kind, used in HUD copy. */
export const kindLabel: Record<CanvasItemKind, string> = {
  profile: 'Profile',
  project: 'Project',
}
