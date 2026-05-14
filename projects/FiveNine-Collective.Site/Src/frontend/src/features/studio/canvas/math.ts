/** Zoom level below which the profile card replaces the widgets. The switch
 *  is hard — there's no crossfade band where both are visible at once. */
export const IDENTITY_THRESHOLD = 0.35

export function identityOpacity(zoom: number) {
  return zoom < IDENTITY_THRESHOLD ? 1 : 0
}
