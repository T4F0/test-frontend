import { useEffect, useState } from 'react'
import { getUserAnnotations } from '../lib/dicomAnnotations'
import { nearestAnnotation } from '../lib/annotationHit'

const CLOSED_TOOLS = new Set(['EllipticalROI', 'RectangleROI', 'CircleROI'])

/**
 * Shows who drew an annotation made by someone else: hover it and the author's name appears at the pointer.
 * `remoteAuthorsRef` maps annotation uid -> { name, color } and is filled while following a presenter.
 */
export default function useDicomAuthorHover({ fileId, viewportRef, renderingEngineRef, remoteAuthorsRef }) {
  const [hover, setHover] = useState(null)

  useEffect(() => {
    const element = viewportRef.current
    if (!element) return undefined
    let frame = null

    const onMove = (e) => {
      if (frame) return
      const { clientX, clientY } = e
      frame = requestAnimationFrame(() => {
        frame = null
        const authors = remoteAuthorsRef.current
        const viewport = renderingEngineRef.current?.getViewport(`dicom-viewport-${fileId}`)
        if (!authors.size || !viewport) return setHover((h) => (h ? null : h))
        const rect = element.getBoundingClientRect()
        const pointer = [clientX - rect.left, clientY - rect.top]
        const entries = []
        for (const annotation of getUserAnnotations()) {
          if (!authors.has(annotation.annotationUID)) continue
          try {
            const points = (annotation.data?.handles?.points || []).map((p) => viewport.worldToCanvas(p))
            entries.push({ uid: annotation.annotationUID, points, closed: CLOSED_TOOLS.has(annotation.metadata?.toolName) })
          } catch { /* annotation not on this slice */ }
        }
        const uid = nearestAnnotation(entries, pointer)
        setHover(uid ? { ...authors.get(uid), x: pointer[0], y: pointer[1] } : null)
      })
    }
    const onLeave = () => setHover(null)

    element.addEventListener('pointermove', onMove)
    element.addEventListener('pointerleave', onLeave)
    return () => {
      element.removeEventListener('pointermove', onMove)
      element.removeEventListener('pointerleave', onLeave)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [fileId, remoteAuthorsRef, renderingEngineRef, viewportRef])

  return hover
}
