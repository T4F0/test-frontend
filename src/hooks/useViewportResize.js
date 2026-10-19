import { useCallback, useEffect } from 'react'
import * as cornerstoneTools from '@cornerstonejs/tools'

/**
 * Keeps the Cornerstone canvas and its annotations in step with the size of the viewer:
 * window resize, side panels opening, the conference sidebar sliding, CSS transitions.
 * `layoutKey` is any value that changes when a surrounding panel opens or closes.
 */
export default function useViewportResize({ renderingEngineRef, viewportRef, fileId, layoutKey }) {
  // --- Viewport Resize & Annotation Synchronization ---
  const triggerResize = useCallback(() => {
    const engine = renderingEngineRef.current
    if (!engine || engine.hasBeenDestroyed) return
    const element = viewportRef.current
    if (!element || element.clientWidth <= 0 || element.clientHeight <= 0) return

    const viewportId = `dicom-viewport-${fileId}`
    const viewport = engine.getViewport(viewportId)
    if (!viewport) return

    try {
      // 1. Resize WebGL/VTK canvas rendering engine keeping current camera & zoom
      engine.resize(true, true)

      // 2. Explicitly recalculate and re-render all annotation SVG coordinate positions
      cornerstoneTools.utilities.triggerAnnotationRenderForViewportIds([viewportId])

      // 3. Re-render viewport
      viewport.render()
    } catch (err) {
      console.warn('Error resizing DICOM viewport:', err)
    }
  }, [fileId, renderingEngineRef, viewportRef])

  const scheduleStaggeredResize = useCallback(() => {
    let animationFrameId = null
    const timers = []

    const execute = () => {
      triggerResize()
    }

    animationFrameId = requestAnimationFrame(execute)

    // ResizeObserver already tracks the layout transition frame by frame: one settle pass is enough
    const delays = [400]
    delays.forEach((delay) => {
      timers.push(setTimeout(execute, delay))
    })

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      timers.forEach(clearTimeout)
    }
  }, [triggerResize])

  // React to side panel toggles (opening/closing sidebar, series drawer, thumbnail panel)
  useEffect(() => {
    const cancelTimers = scheduleStaggeredResize()
    return () => {
      cancelTimers?.()
    }
  }, [layoutKey, scheduleStaggeredResize])

  // ResizeObserver + window resize + transitionend safety nets
  useEffect(() => {
    const element = viewportRef.current
    if (!element) return

    let rafId = null
    let settleTimer = null

    const handleObservedResize = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        triggerResize()
        if (settleTimer) clearTimeout(settleTimer)
        settleTimer = setTimeout(triggerResize, 350)
      })
    }

    let observer = null
    try {
      observer = new ResizeObserver(() => {
        handleObservedResize()
      })
      observer.observe(element)
      if (element.parentElement) {
        observer.observe(element.parentElement)
      }
    } catch (err) {
      console.warn('ResizeObserver setup error:', err)
    }

    const handleWinResize = () => {
      handleObservedResize()
    }
    window.addEventListener('resize', handleWinResize)

    const handleTransitionEnd = (e) => {
      if (
        e.target &&
        (e.target === element ||
          element.contains(e.target) ||
          e.target.closest?.('.conference-body') ||
          e.target.classList?.contains('video-area') ||
          e.target.classList?.contains('sidebar'))
      ) {
        triggerResize()
      }
    }
    document.addEventListener('transitionend', handleTransitionEnd)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      if (settleTimer) clearTimeout(settleTimer)
      observer?.disconnect()
      window.removeEventListener('resize', handleWinResize)
      document.removeEventListener('transitionend', handleTransitionEnd)
    }
  }, [triggerResize, viewportRef])
}
