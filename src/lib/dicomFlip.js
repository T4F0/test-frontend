/**
 * Cornerstone's setViewPresentation({ flipHorizontal: false }) never un-flips: it forwards the
 * target value to viewport.flip(), which only acts on a truthy flag and then toggles. So a mirror
 * could be applied once but not reverted. These helpers call flip() as a toggle, only when the
 * wanted state differs from the current one.
 */
export function applyFlipState(viewport, { flipHorizontal, flipVertical } = {}) {
  if (!viewport || typeof viewport.flip !== 'function') return
  const wantH = flipHorizontal !== undefined && !!flipHorizontal !== !!viewport.flipHorizontal
  const wantV = flipVertical !== undefined && !!flipVertical !== !!viewport.flipVertical
  if (wantH || wantV) viewport.flip({ flipHorizontal: wantH, flipVertical: wantV })
}

/** Presentation without the flip keys, safe to pass to setViewPresentation. */
export function withoutFlip(presentation = {}) {
  const { flipHorizontal, flipVertical, ...rest } = presentation
  return rest
}
