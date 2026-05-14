/** Inputs inside a widget body must not let pointer events bubble to the
 *  outer widget div — otherwise clicking into the editor would also start a
 *  widget drag. */
export const stopWidgetPointer = (e: { stopPropagation: () => void }) => {
  e.stopPropagation()
}
