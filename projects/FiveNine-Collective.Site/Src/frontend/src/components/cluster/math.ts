export const FADE_START = 0.5
export const FADE_END = 0.2

export function identityOpacity(zoom: number) {
  return Math.max(0, Math.min(1, (FADE_START - zoom) / (FADE_START - FADE_END)))
}
