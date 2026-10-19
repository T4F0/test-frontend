import * as cornerstoneTools from '@cornerstonejs/tools'
import { getUserAnnotations } from './dicomAnnotations'

const ROI_TOOL_NAMES = ['EllipticalROI', 'RectangleROI']

/**
 * Two behaviours of Cornerstone's ROI tools make drawing painful:
 *
 * 1. They recompute the statistics (mean / max / std-dev) of the shape synchronously, over every pixel
 *    it covers, on every drag step. On a large image, or a machine that is also decoding conference video,
 *    that freezes the page for hundreds of ms to seconds per shape and clicks are dropped meanwhile.
 *    Here statistics are switched off while the pointer is down and computed once on release.
 *
 * 2. A press that lands near an existing shape's outline, handle or text box grabs that shape instead of
 *    starting a new one, which reads as "I cannot add another ROI". Holding Shift locks the existing
 *    annotations for the duration of the gesture so a new shape is always created.
 *
 * Returns a cleanup function.
 */
export function installRoiGuards({ element, toolGroup, viewportId }) {
  const instances = ROI_TOOL_NAMES.map((name) => {
    try {
      return toolGroup.getToolInstance(name)
    } catch (e) {
      return null
    }
  }).filter(Boolean)

  let gestureActive = false
  let lockedByUs = []
  let timer = null

  const setStats = (enabled) => {
    instances.forEach((instance) => {
      instance.configuration.calculateStats = enabled
    })
  }

  const lockAll = () => {
    const { locking } = cornerstoneTools.annotation
    lockedByUs = getUserAnnotations()
      .map((a) => a.annotationUID)
      .filter((uid) => !locking.isAnnotationLocked(uid))
    lockedByUs.forEach((uid) => locking.setAnnotationLocked(uid, true))
  }

  const unlockAll = () => {
    const { locking } = cornerstoneTools.annotation
    lockedByUs.forEach((uid) => {
      try {
        locking.setAnnotationLocked(uid, false)
      } catch (e) {}
    })
    lockedByUs = []
  }

  const onDown = (event) => {
    if (event.button !== 0) return
    if (timer) clearTimeout(timer)
    gestureActive = true
    setStats(false)
    if (event.shiftKey) lockAll()
  }

  const onUp = () => {
    if (!gestureActive) return
    gestureActive = false
    unlockAll()
    // After Cornerstone has finished its own mouse-up handling
    timer = setTimeout(() => {
      setStats(true)
      try {
        cornerstoneTools.utilities.triggerAnnotationRenderForViewportIds([viewportId])
      } catch (e) {}
    }, 0)
  }

  element.addEventListener('pointerdown', onDown, true)
  window.addEventListener('pointerup', onUp, true)
  window.addEventListener('pointercancel', onUp, true)

  return () => {
    if (timer) clearTimeout(timer)
    element.removeEventListener('pointerdown', onDown, true)
    window.removeEventListener('pointerup', onUp, true)
    window.removeEventListener('pointercancel', onUp, true)
    unlockAll()
    setStats(true)
  }
}
