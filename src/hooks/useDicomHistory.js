import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as cornerstoneTools from '@cornerstonejs/tools'
import { getUserAnnotations, removeUserAnnotations } from '../lib/dicomAnnotations'
import { createHistory } from '../lib/annotationHistory'

/**
 * Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y) over the annotations of the open image.
 * `record` is called by the viewer's annotation events; `reset` once an image has loaded.
 */
export default function useDicomHistory({
  fileId,
  viewportRef,
  renderingEngineRef,
  serializeAnnotationRef,
  localizeAnnotationRef,
  isApplyingRemoteAnnotationRef,
  isPresenterRef,
  onBroadcastAnnotationSyncRef,
  setAnnotationCount,
}) {
  const history = useMemo(() => createHistory(), [])
  const [, setVersion] = useState(0)
  const bump = () => setVersion((v) => v + 1)
  const snapshot = useCallback(() => getUserAnnotations().map((a) => serializeAnnotationRef.current(a)), [serializeAnnotationRef])
  const busyRef = useRef(false)

  const pendingRef = useRef(false)
  // Several events in one tick (clear-all removes annotations one by one) become a single undo step
  const record = useCallback(() => {
    if (busyRef.current || pendingRef.current) return
    pendingRef.current = true
    queueMicrotask(() => {
      pendingRef.current = false
      if (!busyRef.current && history.record(snapshot())) bump()
    })
  }, [history, snapshot])

  const reset = useCallback(() => {
    history.reset(snapshot())
    bump()
  }, [history, snapshot])

  const restore = useCallback((annotations) => {
    if (!annotations) return
    busyRef.current = true
    isApplyingRemoteAnnotationRef.current = true
    try {
      removeUserAnnotations()
      annotations.forEach((annotation) => {
        try {
          cornerstoneTools.annotation.state.addAnnotation(localizeAnnotationRef.current(annotation), viewportRef.current)
        } catch { /* skip an annotation that cannot be restored */ }
      })
      const viewportId = `dicom-viewport-${fileId}`
      cornerstoneTools.utilities.triggerAnnotationRenderForViewportIds([viewportId])
      renderingEngineRef.current?.getViewport(viewportId)?.render()
      setAnnotationCount(getUserAnnotations().length)
    } finally {
      isApplyingRemoteAnnotationRef.current = false
      busyRef.current = false
    }
    if (isPresenterRef.current) {
      onBroadcastAnnotationSyncRef.current?.(fileId, 'snapshot', { annotations: annotations.map((a) => ({ ...a })) })
    }
    bump()
  }, [fileId, isApplyingRemoteAnnotationRef, isPresenterRef, localizeAnnotationRef, onBroadcastAnnotationSyncRef, renderingEngineRef, setAnnotationCount, viewportRef])

  const undo = useCallback(() => restore(history.undo()), [history, restore])
  const redo = useCallback(() => restore(history.redo()), [history, restore])

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      else if (key === 'y' || (key === 'z' && e.shiftKey)) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  return { record, reset, undo, redo, canUndo: history.canUndo(), canRedo: history.canRedo() }
}
