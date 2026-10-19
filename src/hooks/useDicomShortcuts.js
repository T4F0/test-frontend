import { useEffect, useRef } from 'react'
import * as cornerstoneTools from '@cornerstonejs/tools'
import { TOOLS, WL_PRESETS } from '../lib/dicomTools'
import { getUserAnnotations } from '../lib/dicomAnnotations'

/**
 * Keyboard control of the viewer: Delete / Backspace remove the selected annotations, Escape closes an
 * overlay (or deselects), letters pick tools, digits pick window presets, arrows and Space move through slices.
 * Handlers are read through a ref so the window listeners are registered once.
 */
export default function useDicomShortcuts({
  fileId,
  isPresenterRef,
  onBroadcastAnnotationSyncRef,
  renderingEngineRef,
  setAnnotationCount,
  setSelectedCount,
  setShowShortcuts,
  setPresentWarn,
  overlayOpen,
  promptOpen,
  handleToolChange,
  handleReset,
  handleSliceChange,
  handleApplyWLPreset,
  toggleCine,
  totalSlices,
}) {
  const overlayOpenRef = useRef(false)
  // --- Keyboard Shortcuts (Delete, Backspace, Escape) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeTag = document.activeElement?.tagName?.toLowerCase()
        if (activeTag === 'input' || activeTag === 'textarea') return

        const selectedUIDs = cornerstoneTools.annotation.selection.getAnnotationsSelected() || []
        if (selectedUIDs.length > 0) {
          e.preventDefault()
          e.stopPropagation()
          selectedUIDs.forEach((uid) => {
            cornerstoneTools.annotation.selection.deselectAnnotation(uid)
            cornerstoneTools.annotation.state.removeAnnotation(uid)
            if (isPresenterRef.current && onBroadcastAnnotationSyncRef.current) {
              onBroadcastAnnotationSyncRef.current(fileId, 'remove', { annotation_uid: uid })
            }
          })

          const viewportId = `dicom-viewport-${fileId}`
          const vp = renderingEngineRef.current?.getViewport(viewportId)
          if (vp) {
            cornerstoneTools.utilities.triggerAnnotationRenderForViewportIds([viewportId])
            vp.render()
          }

          try {
            const all = getUserAnnotations()
            setAnnotationCount(all.length)
            setSelectedCount(0)
          } catch (err) {}
        }
      } else if (e.key === 'Escape') {
        if (overlayOpenRef.current) {
          // An overlay is open: Escape closes it only, not the surrounding modal
          e.stopImmediatePropagation()
          setShowShortcuts(false)
          setPresentWarn(false)
          return
        }
        try {
          cornerstoneTools.annotation.selection.deselectAnnotation()
          setSelectedCount(0)
        } catch (err) {}
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fileId, isPresenterRef, onBroadcastAnnotationSyncRef, renderingEngineRef, setAnnotationCount, setPresentWarn, setSelectedCount, setShowShortcuts])

  // --- Tool / navigation shortcuts (always read the latest handlers through a ref) ---
  const shortcutActionsRef = useRef({})
  overlayOpenRef.current = overlayOpen
  shortcutActionsRef.current = {
    handleToolChange,
    handleReset,
    handleSliceChange,
    handleApplyWLPreset,
    toggleCine,
    totalSlices,
    getSlice: () =>
      renderingEngineRef.current?.getViewport(`dicom-viewport-${fileId}`)?.getCurrentImageIdIndex() ?? 0,
    promptOpen,
  }

  useEffect(() => {
    const handleShortcut = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return
      const actions = shortcutActionsRef.current
      if (actions.promptOpen) return
      // The thumbnail strip handles its own arrow keys
      if (target?.closest?.('.dicom-thumbnail-panel')) return

      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const tool = TOOLS.find((t) => t.key === key)
      if (tool) {
        e.preventDefault()
        actions.handleToolChange(tool.name)
      } else if (key === 'r') {
        e.preventDefault()
        actions.handleReset()
      } else if (key >= '1' && key <= String(WL_PRESETS.length)) {
        e.preventDefault()
        actions.handleApplyWLPreset(WL_PRESETS[Number(key) - 1])
      } else if (key === '?') {
        e.preventDefault()
        setShowShortcuts((v) => !v)
      } else if (actions.totalSlices > 1) {
        if (key === 'ArrowUp' || key === 'PageUp') {
          e.preventDefault()
          actions.handleSliceChange(actions.getSlice() - 1)
        } else if (key === 'ArrowDown' || key === 'PageDown') {
          e.preventDefault()
          actions.handleSliceChange(actions.getSlice() + 1)
        } else if (key === ' ' && tag !== 'button') {
          e.preventDefault()
          actions.toggleCine()
        }
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [setShowShortcuts])
}
