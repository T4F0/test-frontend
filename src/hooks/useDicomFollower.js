import { applyFlipState, withoutFlip } from '../lib/dicomFlip'
import { useEffect } from 'react'
import * as cornerstoneTools from '@cornerstonejs/tools'
import { authorColor, isSameDicomFile } from '../lib/dicomIds'
import { getUserAnnotations, removeUserAnnotations } from '../lib/dicomAnnotations'

/**
 * Applies what the presenter broadcasts to this viewer while we follow: annotation changes (with a colour
 * per author), the laser pointer, slice, window/level, invert, zoom/pan/rotation. Pure side effects: no return.
 */
export default function useDicomFollower({
  activeFile,
  dicomAnnotationSyncState,
  dicomSyncState,
  fileId,
  isApplyingRemoteAnnotationRef,
  isApplyingRemoteUpdateRef,
  isFollowing,
  isPresenter,
  localizeAnnotation,
  pointerHideTimerRef,
  remoteAuthorsRef,
  renderingEngineRef,
  setAnnotationCount,
  setCurrentSlice,
  setIsInverted,
  setRemoteAuthor,
  setRemotePointer,
  viewportRef,
}) {
  // --- Handle Collaborative Annotation Sync (Phase 3 - Follower) ---
  useEffect(() => {
    if (isPresenter || !isFollowing || !dicomAnnotationSyncState) return

    if (!isSameDicomFile(dicomAnnotationSyncState.attachmentId, fileId, activeFile?.originalId)) return

    const viewportId = `dicom-viewport-${fileId}`
    const viewport = renderingEngineRef.current?.getViewport(viewportId)
    if (!viewport) return

    isApplyingRemoteAnnotationRef.current = true

    try {
      const { action, annotation, annotations, annotationUid, senderUserId, senderName } = dicomAnnotationSyncState
      const element = viewportRef.current
      const color = authorColor(senderUserId)
      const addRemote = (ann) => {
        const local = localizeAnnotation(ann)
        cornerstoneTools.annotation.state.addAnnotation(local, element)
        remoteAuthorsRef?.current.set(local.annotationUID, { name: senderName || 'Présentateur', color })
        try {
          cornerstoneTools.annotation.config.style.setAnnotationStyles(local.annotationUID, {
            color,
            colorHighlighted: color,
            colorSelected: color,
            textBoxColor: color,
          })
        } catch (styleErr) {}
      }
      if (action === 'add' || action === 'modify' || action === 'snapshot') {
        setRemoteAuthor({ name: senderName || 'Présentateur', color })
      }

      if (action === 'clear' || action === 'snapshot') remoteAuthorsRef?.current.clear()

      if (action === 'clear') {
        try {
          removeUserAnnotations()
        } catch (e) {}
      } else if (action === 'remove' && annotationUid) {
        try {
          cornerstoneTools.annotation.selection.deselectAnnotation(annotationUid)
          cornerstoneTools.annotation.state.removeAnnotation(annotationUid)
        } catch (e) {}
      } else if (action === 'add' || action === 'modify') {
        if (annotation && annotation.annotationUID) {
          try {
            cornerstoneTools.annotation.state.removeAnnotation(annotation.annotationUID)
          } catch (e) {}
          if (element) {
            try {
              addRemote(annotation)
            } catch (e) {}
          }
        }
      } else if (action === 'snapshot') {
        try {
          removeUserAnnotations()
        } catch (e) {}
        if (element && Array.isArray(annotations)) {
          annotations.forEach((ann) => {
            try {
              addRemote(ann)
            } catch (e) {}
          })
        }
      }

      cornerstoneTools.utilities.triggerAnnotationRenderForViewportIds([viewportId])
      viewport.render()

      try {
        const all = getUserAnnotations()
        setAnnotationCount(all.length)
      } catch (e) {}
    } catch (err) {
      console.warn('Error applying remote annotation sync:', err)
    } finally {
      setTimeout(() => {
        isApplyingRemoteAnnotationRef.current = false
      }, 60)
    }
  }, [activeFile?.originalId, dicomAnnotationSyncState, fileId, isApplyingRemoteAnnotationRef, isFollowing, isPresenter, localizeAnnotation, remoteAuthorsRef, renderingEngineRef, setAnnotationCount, setRemoteAuthor, viewportRef])

  // --- Handle remote sync updates (Follower) ---
  useEffect(() => {
    if (isPresenter || !isFollowing || !dicomSyncState) return

    if (!isSameDicomFile(dicomSyncState.attachmentId, fileId, activeFile?.originalId)) return

    const viewportId = `dicom-viewport-${fileId}`
    const viewport = renderingEngineRef.current?.getViewport(viewportId)
    if (!viewport) return

    const state = dicomSyncState.viewportState
    if (!state) return

    if (state.pointer !== undefined) {
      // Presenter's laser pointer: a world position, drawn at this client's own canvas position
      if (pointerHideTimerRef.current) clearTimeout(pointerHideTimerRef.current)
      if (state.pointer && state.pointer.world) {
        try {
          const [x, y] = viewport.worldToCanvas(state.pointer.world)
          setRemotePointer({ x, y, slice: state.pointer.slice })
          pointerHideTimerRef.current = setTimeout(() => setRemotePointer(null), 1500)
        } catch (e) {}
      } else {
        setRemotePointer(null)
      }
      if (Object.keys(state).length === 1) return
    }

    isApplyingRemoteUpdateRef.current = true

    const applySync = async () => {
      try {
        // 1. Sync slice index if multi-slice
        if (
          state.currentSliceIndex !== undefined &&
          viewport.getCurrentImageIdIndex() !== state.currentSliceIndex
        ) {
          try {
            await viewport.setImageIdIndex(state.currentSliceIndex)
            setCurrentSlice(state.currentSliceIndex)
          } catch (sliceErr) {
            console.warn('Could not set remote slice index:', sliceErr)
          }
        }

        // 2. Sync Window / Level (VOI)
        if (state.voiRange) {
          viewport.setProperties({ voiRange: state.voiRange })
        } else if (state.windowWidth !== undefined && state.windowCenter !== undefined) {
          const lower = state.windowCenter - state.windowWidth / 2
          const upper = state.windowCenter + state.windowWidth / 2
          viewport.setProperties({ voiRange: { lower, upper } })
        }

        if (state.invert !== undefined) {
          viewport.setProperties({ invert: state.invert })
          setIsInverted(Boolean(state.invert))
        }

        // 3. Sync Camera or Zoom/Pan
        if (state.presentation && typeof viewport.setViewPresentation === 'function') {
          // Size-independent zoom/pan: stays correct when the follower's window differs
          applyFlipState(viewport, state.presentation)
          viewport.setViewPresentation(withoutFlip(state.presentation))
        } else if (state.camera) {
          viewport.setCamera(state.camera)
        } else {
          if (state.zoom !== undefined && typeof viewport.setZoom === 'function') {
            viewport.setZoom(state.zoom)
          }
          if (state.pan !== undefined && typeof viewport.setPan === 'function') {
            viewport.setPan(state.pan)
          }
        }

        viewport.render()
      } catch (err) {
        console.warn('Error applying remote DICOM sync:', err)
      } finally {
        setTimeout(() => {
          isApplyingRemoteUpdateRef.current = false
        }, 60)
      }
    }

    applySync()
  }, [activeFile?.originalId, dicomSyncState, fileId, isApplyingRemoteUpdateRef, isFollowing, isPresenter, pointerHideTimerRef, renderingEngineRef, setCurrentSlice, setIsInverted, setRemotePointer])
}
