import * as cornerstoneTools from '@cornerstonejs/tools'

// Cornerstone's overlay tools (the scale bar) register themselves as annotations. Everything that counts,
// saves, broadcasts, locks or clears annotations must see only what the user drew.
const OVERLAY_TOOLS = new Set(['ScaleOverlay'])

export const isUserAnnotation = (annotation) => !OVERLAY_TOOLS.has(annotation?.metadata?.toolName)

export function getUserAnnotations() {
  return (cornerstoneTools.annotation.state.getAllAnnotations() || []).filter(isUserAnnotation)
}

export function removeUserAnnotations() {
  const { selection, state } = cornerstoneTools.annotation
  selection.deselectAnnotation()
  getUserAnnotations().forEach((annotation) => {
    try {
      state.removeAnnotation(annotation.annotationUID)
    } catch (e) {}
  })
}
