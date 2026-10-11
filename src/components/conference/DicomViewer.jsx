import { useEffect, useRef, useState, useCallback } from 'react'
import {
  X,
  ZoomIn,
  Move,
  Ruler,
  RotateCcw,
  Sun,
  Maximize2,
  Layers,
  Radio,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Eraser,
  Trash2,
} from 'lucide-react'
import { initCornerstone } from '../../lib/cornerstoneSetup'
import * as cornerstone from '@cornerstonejs/core'
import * as cornerstoneTools from '@cornerstonejs/tools'
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader'
import dicomParser from 'dicom-parser'
import { getAuthAxios } from '../../api/authApi'
import { resolveApiUrl } from '../../api/config'
import '../../styles/dicom-viewer.css'

const TOOLS = [
  { name: 'WindowLevel', toolClass: 'WindowLevelTool', icon: Sun, label: 'Contraste (W/L)' },
  { name: 'Pan', toolClass: 'PanTool', icon: Move, label: 'Déplacer' },
  { name: 'Zoom', toolClass: 'ZoomTool', icon: ZoomIn, label: 'Zoomer' },
  { name: 'Length', toolClass: 'LengthTool', icon: Ruler, label: 'Mesurer' },
  { name: 'Angle', toolClass: 'AngleTool', icon: RotateCcw, label: 'Angle' },
  { name: 'EllipticalROI', toolClass: 'EllipticalROITool', icon: Maximize2, label: 'ROI' },
  { name: 'Eraser', toolClass: 'EraserTool', icon: Eraser, label: 'Gomme' },
]

export default function DicomViewer({
  file,
  onClose,
  onViewportChange,
  dicomPresenter,
  dicomSyncState,
  onBroadcastViewportSync,
  onBroadcastPresenterMode,
  currentUserId,
  currentUserName,
}) {
  const viewportRef = useRef(null)
  const renderingEngineRef = useRef(null)
  const toolGroupIdRef = useRef(`dicom-tools-${Math.random().toString(36).substring(2, 9)}`)
  const isApplyingRemoteUpdateRef = useRef(false)
  const lastBroadcastTimeRef = useRef(0)
  const broadcastTimerRef = useRef(null)
  const isPresenterRef = useRef(false)
  const cineIntervalRef = useRef(null)

  const [activeTool, setActiveTool] = useState('WindowLevel')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dicomInfo, setDicomInfo] = useState(null)
  const [currentSlice, setCurrentSlice] = useState(0)
  const [totalSlices, setTotalSlices] = useState(1)
  const [isPlayingCine, setIsPlayingCine] = useState(false)
  const [annotationCount, setAnnotationCount] = useState(0)
  const [selectedCount, setSelectedCount] = useState(0)

  // Real-time synchronization state (Phase 2)
  const [isPresenter, setIsPresenter] = useState(false)
  const [isFollowing, setIsFollowing] = useState(true)

  const fileName = file?.name || file?.original_filename || file?.display_name || 'DICOM'
  const fileId = file?.originalId || file?.id || 'dicom-view'

  // Is another participant currently presenting THIS file?
  const isRemotePresenter = Boolean(
    dicomPresenter &&
    String(dicomPresenter.userId) !== String(currentUserId) &&
    String(dicomPresenter.attachmentId) === String(fileId)
  )

  const presenterName = isRemotePresenter
    ? (dicomPresenter.userName || 'Un participant')
    : null

  // Keep ref in sync for event listeners
  useEffect(() => {
    isPresenterRef.current = isPresenter
  }, [isPresenter])

  const onBroadcastViewportSyncRef = useRef(onBroadcastViewportSync)
  useEffect(() => {
    onBroadcastViewportSyncRef.current = onBroadcastViewportSync
  }, [onBroadcastViewportSync])

  const onBroadcastPresenterModeRef = useRef(onBroadcastPresenterMode)
  useEffect(() => {
    onBroadcastPresenterModeRef.current = onBroadcastPresenterMode
  }, [onBroadcastPresenterMode])

  const onViewportChangeRef = useRef(onViewportChange)
  useEffect(() => {
    onViewportChangeRef.current = onViewportChange
  }, [onViewportChange])

  // Determine DICOM fetch URL
  let dicomUrl = file?.dicom_url || file?.dicomUrl || file?.url || file?.file
  if (!dicomUrl && fileId && fileId !== 'dicom-view') {
    const cleanId = String(fileId).replace('submission-', '').replace('meeting-', '')
    dicomUrl = `/api/conferences/dicom/${cleanId}/`
  }
  if (dicomUrl && typeof dicomUrl === 'string' && dicomUrl.includes('/api/conferences/dicom/submission-')) {
    dicomUrl = dicomUrl.replace('/api/conferences/dicom/submission-', '/api/conferences/dicom/')
  }

  // --- Broadcast helper ---
  const broadcastCurrentViewport = useCallback((viewport) => {
    if (!viewport || !onBroadcastViewportSyncRef.current) return

    try {
      const camera = viewport.getCamera()
      const properties = viewport.getProperties()
      const currentSliceIndex = viewport.getCurrentImageIdIndex()
      const voiRange = properties?.voiRange
      const zoom = typeof viewport.getZoom === 'function' ? viewport.getZoom() : undefined
      const pan = typeof viewport.getPan === 'function' ? viewport.getPan() : undefined

      const payload = {
        camera,
        voiRange,
        zoom,
        pan,
        currentSliceIndex,
        windowWidth: voiRange ? (voiRange.upper - voiRange.lower) : undefined,
        windowCenter: voiRange ? (voiRange.lower + (voiRange.upper - voiRange.lower) / 2) : undefined,
      }

      onViewportChangeRef.current?.(payload)

      const now = Date.now()
      if (now - lastBroadcastTimeRef.current > 50) {
        lastBroadcastTimeRef.current = now
        onBroadcastViewportSyncRef.current(fileId, payload)
      } else {
        if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current)
        broadcastTimerRef.current = setTimeout(() => {
          lastBroadcastTimeRef.current = Date.now()
          onBroadcastViewportSyncRef.current?.(fileId, payload)
        }, 50)
      }
    } catch (e) {
      console.warn('Error reading viewport for broadcast:', e)
    }
  }, [fileId])

  const broadcastCurrentViewportRef = useRef(broadcastCurrentViewport)
  useEffect(() => {
    broadcastCurrentViewportRef.current = broadcastCurrentViewport
  }, [broadcastCurrentViewport])

  // --- Toggle Presenter Mode ---
  const handleTogglePresenter = useCallback(() => {
    const nextPresenterState = !isPresenter
    setIsPresenter(nextPresenterState)
    isPresenterRef.current = nextPresenterState

    if (onBroadcastPresenterModeRef.current) {
      onBroadcastPresenterModeRef.current(fileId, nextPresenterState, {
        name: fileName,
        modality: dicomInfo?.modality || '',
        study_description: dicomInfo?.study_description || '',
        institution_name: dicomInfo?.institution_name || '',
        dicom_url: dicomUrl,
        url: file?.url || file?.file || '',
        file_type: file?.file_type || file?.fileType || 'DICOM',
        original_id: file?.originalId || fileId,
      })
    }

    if (nextPresenterState) {
      // Immediately broadcast initial viewport state to all participants
      const viewportId = `dicom-viewport-${fileId}`
      const viewport = renderingEngineRef.current?.getViewport(viewportId)
      if (viewport) {
        broadcastCurrentViewport(viewport)
      }
    }
  }, [broadcastCurrentViewport, dicomInfo, dicomUrl, file, fileId, fileName, isPresenter])

  // --- Handle remote sync updates (Follower) ---
  useEffect(() => {
    if (isPresenter || !isFollowing || !dicomSyncState) return

    const syncAttachmentId = String(dicomSyncState.attachmentId || '')
    const currentId = String(fileId || '')
    const cleanSync = syncAttachmentId.replace('submission-', '').replace('meeting-', '')
    const cleanCurrent = currentId.replace('submission-', '').replace('meeting-', '')
    const cleanOriginal = String(file?.originalId || '').replace('submission-', '').replace('meeting-', '')
    if (syncAttachmentId !== currentId && cleanSync !== cleanCurrent && cleanSync !== cleanOriginal) return

    const viewportId = `dicom-viewport-${fileId}`
    const viewport = renderingEngineRef.current?.getViewport(viewportId)
    if (!viewport) return

    const state = dicomSyncState.viewportState
    if (!state) return

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

        // 3. Sync Camera or Zoom/Pan
        if (state.camera) {
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
  }, [dicomSyncState, fileId, isFollowing, isPresenter])

  // --- Initialize Cornerstone & Viewport ---
  useEffect(() => {
    let mounted = true
    const engineId = `dicom-engine-${fileId}-${Date.now()}`
    const viewportId = `dicom-viewport-${fileId}`
    const toolGroupId = toolGroupIdRef.current
    let registeredImageId = null

    const setup = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!dicomUrl) {
          throw new Error('Aucune URL de fichier DICOM fournie.')
        }

        await initCornerstone()

        if (!viewportRef.current || !mounted) return

        // Fetch DICOM bytes via authenticated request
        const authAxios = getAuthAxios()
        const fullUrl = resolveApiUrl(dicomUrl)
        const response = await authAxios.get(fullUrl, { responseType: 'arraybuffer' })
        const arrayBuffer = response.data

        if (!mounted) return

        // Extract metadata if not already available
        let metadata = file?.dicom_metadata
        let numFrames = 1
        try {
          const byteArray = new Uint8Array(arrayBuffer)
          const dataSet = dicomParser.parseDicom(byteArray)
          numFrames = parseInt(dataSet.string('x00280008') || '1', 10) || 1
          if (!metadata) {
            metadata = {
              patient_name: dataSet.string('x00100010') || '',
              patient_id_dicom: dataSet.string('x00100020') || '',
              modality: dataSet.string('x00080060') || '',
              study_date: dataSet.string('x00080020') || '',
              study_description: dataSet.string('x00081030') || '',
              institution_name: dataSet.string('x00080080') || '',
              number_of_frames: numFrames,
            }
          }
        } catch (parseErr) {
          console.warn('Could not parse DICOM metadata with dicomParser:', parseErr)
        }

        if (metadata?.number_of_frames && metadata.number_of_frames > numFrames) {
          numFrames = metadata.number_of_frames
        }

        setDicomInfo(metadata)
        setTotalSlices(numFrames)

        // Register image with Cornerstone DICOM image loader
        const dicomBlob = new Blob([arrayBuffer], { type: 'application/dicom' })
        const baseImageId = cornerstoneDICOMImageLoader.wadouri.fileManager.add(dicomBlob)
        registeredImageId = baseImageId

        // Build stack array for multi-frame support
        const imageIds = Array.from({ length: numFrames }, (_, i) =>
          i === 0 ? baseImageId : `${baseImageId}?frame=${i}`
        )

        // Create rendering engine
        const engine = new cornerstone.RenderingEngine(engineId)
        renderingEngineRef.current = engine

        // Create stack viewport
        const viewportInput = {
          viewportId,
          type: cornerstone.Enums.ViewportType.STACK,
          element: viewportRef.current,
        }
        engine.enableElement(viewportInput)

        // Set image stack and render
        const viewport = engine.getViewport(viewportId)
        await viewport.setStack(imageIds)
        viewport.render()

        // Set up tool group
        let toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId)
        if (!toolGroup) {
          toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId)
          TOOLS.forEach(({ name }) => {
            try {
              toolGroup.addTool(name)
            } catch (e) {}
          })
          try {
            toolGroup.addTool('StackScroll')
          } catch (e) {}
        }

        toolGroup.addViewport(viewportId, engineId)
        toolGroup.setToolActive('WindowLevel', {
          bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
        })
        toolGroup.setToolActive('StackScroll', {
          bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary }],
        })

        // Event listener for viewport changes (broadcasting when presenter)
        const element = viewportRef.current
        const handleViewportChange = () => {
          if (!isPresenterRef.current || isApplyingRemoteUpdateRef.current) return
          const currentVp = renderingEngineRef.current?.getViewport(viewportId)
          if (currentVp) {
            broadcastCurrentViewportRef.current?.(currentVp)
          }
        }

        const handleNewImage = (evt) => {
          if (evt.detail?.imageIdIndex !== undefined) {
            setCurrentSlice(evt.detail.imageIdIndex)
          } else {
            const vp = renderingEngineRef.current?.getViewport(viewportId)
            if (vp) setCurrentSlice(vp.getCurrentImageIdIndex() || 0)
          }
          if (isPresenterRef.current && !isApplyingRemoteUpdateRef.current) {
            const currentVp = renderingEngineRef.current?.getViewport(viewportId)
            if (currentVp) broadcastCurrentViewportRef.current?.(currentVp)
          }
        }

        const refreshAnnotationStats = () => {
          try {
            const all = cornerstoneTools.annotation.state.getAllAnnotations() || []
            const selected = cornerstoneTools.annotation.selection.getAnnotationsSelected() || []
            setAnnotationCount(all.length)
            setSelectedCount(selected.length)
          } catch (e) {}
        }

        const handleAnnotationRemoved = () => {
          refreshAnnotationStats()
          const currentVp = renderingEngineRef.current?.getViewport(viewportId)
          if (currentVp) {
            cornerstoneTools.utilities.triggerAnnotationRenderForViewportIds([viewportId])
            currentVp.render()
          }
        }

        element.addEventListener(cornerstone.Enums.Events.CAMERA_MODIFIED, handleViewportChange)
        element.addEventListener(cornerstone.Enums.Events.VOI_MODIFIED, handleViewportChange)
        element.addEventListener(cornerstone.Enums.Events.STACK_NEW_IMAGE, handleNewImage)

        cornerstone.eventTarget.addEventListener(
          cornerstoneTools.Enums.Events.ANNOTATION_ADDED,
          refreshAnnotationStats
        )
        cornerstone.eventTarget.addEventListener(
          cornerstoneTools.Enums.Events.ANNOTATION_COMPLETED,
          refreshAnnotationStats
        )
        cornerstone.eventTarget.addEventListener(
          cornerstoneTools.Enums.Events.ANNOTATION_MODIFIED,
          refreshAnnotationStats
        )
        cornerstone.eventTarget.addEventListener(
          cornerstoneTools.Enums.Events.ANNOTATION_SELECTION_CHANGE,
          refreshAnnotationStats
        )
        cornerstone.eventTarget.addEventListener(
          cornerstoneTools.Enums.Events.ANNOTATION_REMOVED,
          handleAnnotationRemoved
        )

        refreshAnnotationStats()

        if (mounted) {
          setLoading(false)
        }
      } catch (err) {
        console.error('DICOM viewer error:', err)
        if (mounted) {
          setError(err.message || 'Impossible de charger le fichier DICOM.')
          setLoading(false)
        }
      }
    }

    setup()

    return () => {
      mounted = false

      // If presenter, stop presentation on unmount
      if (isPresenterRef.current && onBroadcastPresenterModeRef.current) {
        onBroadcastPresenterModeRef.current(fileId, false, {})
      }

      if (cineIntervalRef.current) {
        clearInterval(cineIntervalRef.current)
      }

      if (broadcastTimerRef.current) {
        clearTimeout(broadcastTimerRef.current)
      }

      const element = viewportRef.current
      if (element) {
        try {
          element.removeEventListener(cornerstone.Enums.Events.CAMERA_MODIFIED, handleViewportChange)
          element.removeEventListener(cornerstone.Enums.Events.VOI_MODIFIED, handleViewportChange)
          element.removeEventListener(cornerstone.Enums.Events.STACK_NEW_IMAGE, handleNewImage)
        } catch (e) {}
      }

      try {
        cornerstone.eventTarget.removeEventListener(
          cornerstoneTools.Enums.Events.ANNOTATION_ADDED,
          refreshAnnotationStats
        )
        cornerstone.eventTarget.removeEventListener(
          cornerstoneTools.Enums.Events.ANNOTATION_COMPLETED,
          refreshAnnotationStats
        )
        cornerstone.eventTarget.removeEventListener(
          cornerstoneTools.Enums.Events.ANNOTATION_MODIFIED,
          refreshAnnotationStats
        )
        cornerstone.eventTarget.removeEventListener(
          cornerstoneTools.Enums.Events.ANNOTATION_SELECTION_CHANGE,
          refreshAnnotationStats
        )
        cornerstone.eventTarget.removeEventListener(
          cornerstoneTools.Enums.Events.ANNOTATION_REMOVED,
          handleAnnotationRemoved
        )
      } catch (e) {}

      try {
        cornerstoneTools.annotation.selection.deselectAnnotation()
        cornerstoneTools.annotation.state.removeAllAnnotations()
      } catch (e) {}

      try {
        cornerstoneTools.ToolGroupManager.destroyToolGroup(toolGroupId)
      } catch (e) {}
      try {
        renderingEngineRef.current?.destroy()
      } catch (e) {}
      if (registeredImageId) {
        try {
          cornerstoneDICOMImageLoader.wadouri.fileManager.remove(registeredImageId)
        } catch (e) {}
      }
    }
  }, [dicomUrl, fileId])

  // --- Tool Switching ---
  const handleToolChange = useCallback((toolName) => {
    setActiveTool(toolName)
    const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupIdRef.current)
    if (!toolGroup) return

    TOOLS.forEach(({ name }) => {
      try {
        toolGroup.setToolPassive(name)
      } catch (e) {}
    })

    const selected = TOOLS.find((t) => t.name === toolName)
    if (selected) {
      try {
        toolGroup.setToolActive(selected.name, {
          bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
        })
      } catch (e) {}
    }
  }, [])

  // --- Reset Viewport ---
  const handleReset = useCallback(() => {
    const viewportId = `dicom-viewport-${fileId}`
    const viewport = renderingEngineRef.current?.getViewport(viewportId)
    if (viewport) {
      viewport.resetCamera()
      viewport.render()
      if (isPresenterRef.current) {
        broadcastCurrentViewport(viewport)
      }
    }
  }, [broadcastCurrentViewport, fileId])

  // --- Slice Navigation ---
  const handleSliceChange = useCallback(async (newIndex) => {
    const clamped = Math.max(0, Math.min(totalSlices - 1, newIndex))
    setCurrentSlice(clamped)
    try {
      cornerstoneTools.annotation.selection.deselectAnnotation()
      setSelectedCount(0)
    } catch (e) {}
    const viewportId = `dicom-viewport-${fileId}`
    const viewport = renderingEngineRef.current?.getViewport(viewportId)
    if (viewport) {
      try {
        await viewport.setImageIdIndex(clamped)
        viewport.render()
        if (isPresenterRef.current) {
          broadcastCurrentViewport(viewport)
        }
      } catch (e) {
        console.warn('Error setting slice index:', e)
      }
    }
  }, [broadcastCurrentViewport, fileId, totalSlices])

  // --- Cine Playback ---
  const toggleCine = useCallback(() => {
    if (isPlayingCine) {
      if (cineIntervalRef.current) clearInterval(cineIntervalRef.current)
      setIsPlayingCine(false)
    } else {
      setIsPlayingCine(true)
      cineIntervalRef.current = setInterval(() => {
        setCurrentSlice((prev) => {
          const next = (prev + 1) % totalSlices
          const viewportId = `dicom-viewport-${fileId}`
          const viewport = renderingEngineRef.current?.getViewport(viewportId)
          if (viewport) {
            viewport.setImageIdIndex(next).catch(() => {})
            if (isPresenterRef.current) {
              broadcastCurrentViewport(viewport)
            }
          }
          return next
        })
      }, 100) // ~10 fps
    }
  }, [broadcastCurrentViewport, fileId, isPlayingCine, totalSlices])

  useEffect(() => {
    return () => {
      if (cineIntervalRef.current) clearInterval(cineIntervalRef.current)
    }
  }, [])

  // --- Delete Selected Annotations ---
  const handleDeleteSelected = useCallback(() => {
    const selectedUIDs = cornerstoneTools.annotation.selection.getAnnotationsSelected() || []
    if (selectedUIDs.length === 0) return

    selectedUIDs.forEach((uid) => {
      cornerstoneTools.annotation.selection.deselectAnnotation(uid)
      cornerstoneTools.annotation.state.removeAnnotation(uid)
    })

    const viewportId = `dicom-viewport-${fileId}`
    const vp = renderingEngineRef.current?.getViewport(viewportId)
    if (vp) {
      cornerstoneTools.utilities.triggerAnnotationRenderForViewportIds([viewportId])
      vp.render()
    }

    try {
      const all = cornerstoneTools.annotation.state.getAllAnnotations() || []
      setAnnotationCount(all.length)
      setSelectedCount(0)
    } catch (e) {}
  }, [fileId])

  // --- Clear All Annotations ---
  const handleClearAllAnnotations = useCallback(() => {
    const all = cornerstoneTools.annotation.state.getAllAnnotations() || []
    if (all.length === 0) return

    if (window.confirm(`Supprimer toutes les mesures et annotations de cette imagerie (${all.length}) ?`)) {
      cornerstoneTools.annotation.selection.deselectAnnotation()
      cornerstoneTools.annotation.state.removeAllAnnotations()

      const viewportId = `dicom-viewport-${fileId}`
      const vp = renderingEngineRef.current?.getViewport(viewportId)
      if (vp) {
        cornerstoneTools.utilities.triggerAnnotationRenderForViewportIds([viewportId])
        vp.render()
      }

      setAnnotationCount(0)
      setSelectedCount(0)
    }
  }, [fileId])

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
          })

          const viewportId = `dicom-viewport-${fileId}`
          const vp = renderingEngineRef.current?.getViewport(viewportId)
          if (vp) {
            cornerstoneTools.utilities.triggerAnnotationRenderForViewportIds([viewportId])
            vp.render()
          }

          try {
            const all = cornerstoneTools.annotation.state.getAllAnnotations() || []
            setAnnotationCount(all.length)
            setSelectedCount(0)
          } catch (err) {}
        }
      } else if (e.key === 'Escape') {
        try {
          cornerstoneTools.annotation.selection.deselectAnnotation()
          setSelectedCount(0)
        } catch (err) {}
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fileId])

  return (
    <div className={`dicom-viewer-container ${isPresenter ? 'is-presenter-active' : ''}`}>
      {/* Header */}
      <div className="dicom-viewer-header">
        <div className="dicom-header-info">
          <h3>{fileName}</h3>
          {dicomInfo?.modality && (
            <span className="dicom-modality-badge">{dicomInfo.modality}</span>
          )}
          {dicomInfo?.study_description && (
            <span className="dicom-study-desc-badge" title={dicomInfo.study_description}>
              {dicomInfo.study_description}
            </span>
          )}
        </div>

        {/* Real-time Presenter Mode Controls (Phase 2) */}
        <div className="dicom-header-collaboration">
          {/* Case 1: Current user is the presenter */}
          {isPresenter && (
            <div className="presenter-live-indicator">
              <span className="live-pulse-dot" />
              <span className="live-label">Présentation en direct</span>
              <button
                className="btn-stop-presenting"
                onClick={handleTogglePresenter}
                title="Arrêter la présentation aux participants"
              >
                Arrêter
              </button>
            </div>
          )}

          {/* Case 2: Another participant is presenting */}
          {isRemotePresenter && !isPresenter && (
            <div className="remote-presenter-badge">
              <Eye size={15} className="presenter-eye-icon" />
              <span className="presenter-text">
                <strong>{presenterName}</strong> contrôle l'affichage
              </span>
              <button
                className={`btn-follow-toggle ${isFollowing ? 'following' : 'paused'}`}
                onClick={() => setIsFollowing(!isFollowing)}
                title={isFollowing ? 'Suspendre le suivi automatique' : 'Reprendre le suivi du présentateur'}
              >
                {isFollowing ? (
                  <>
                    <Eye size={13} />
                    <span>Suivi actif</span>
                  </>
                ) : (
                  <>
                    <EyeOff size={13} />
                    <span>Suivi en pause</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Case 3: Idle - Nobody is presenting */}
          {!isPresenter && !isRemotePresenter && onBroadcastPresenterMode && (
            <button
              className="btn-start-presenting"
              onClick={handleTogglePresenter}
              title="Présenter cette imagerie à tous les participants de la conférence"
            >
              <Radio size={15} />
              <span>Présenter aux participants</span>
            </button>
          )}

          <button className="btn-close-viewer" onClick={onClose} title="Fermer l'imagerie">
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="dicom-toolbar">
        {TOOLS.map(({ name, icon: Icon, label }) => (
          <button
            key={name}
            className={`dicom-tool-btn ${activeTool === name ? 'active' : ''} ${name === 'Eraser' ? 'eraser-tool-btn' : ''}`}
            onClick={() => handleToolChange(name)}
            title={name === 'Eraser' ? "Gomme (cliquer sur une mesure ou annotation pour l'effacer)" : label}
          >
            <Icon size={17} />
            <span className="tool-label">{label}</span>
          </button>
        ))}

        <div className="dicom-toolbar-divider" />

        {/* Delete selected annotation button (appears when an annotation is selected) */}
        {selectedCount > 0 && (
          <button
            className="dicom-tool-btn danger-active-btn"
            onClick={handleDeleteSelected}
            title="Supprimer la sélection (Touche Suppr ou Retour arrière)"
          >
            <Trash2 size={17} />
            <span className="tool-label">Supprimer</span>
            <span className="dicom-kbd-shortcut">Suppr</span>
          </button>
        )}

        {/* Clear all annotations button */}
        <button
          className={`dicom-tool-btn ${annotationCount === 0 ? 'is-disabled' : ''}`}
          onClick={handleClearAllAnnotations}
          disabled={annotationCount === 0}
          title={annotationCount > 0 ? `Effacer toutes les mesures (${annotationCount})` : 'Aucune mesure à effacer'}
        >
          <Trash2 size={17} />
          <span className="tool-label">Tout effacer</span>
          {annotationCount > 0 && (
            <span className="dicom-count-badge">{annotationCount}</span>
          )}
        </button>

        <button className="dicom-tool-btn" onClick={handleReset} title="Réinitialiser l'affichage">
          <RotateCcw size={17} />
          <span className="tool-label">Réinitialiser</span>
        </button>

        {/* Multi-slice navigation controls */}
        {totalSlices > 1 && (
          <div className="dicom-slice-navigator">
            <div className="dicom-toolbar-divider" />
            <button
              className="dicom-slice-btn"
              onClick={() => handleSliceChange(currentSlice - 1)}
              disabled={currentSlice <= 0}
              title="Coupe précédente"
            >
              <ChevronLeft size={16} />
            </button>

            <input
              type="range"
              min={0}
              max={totalSlices - 1}
              value={currentSlice}
              onChange={(e) => handleSliceChange(parseInt(e.target.value, 10))}
              className="dicom-slice-slider"
              title={`Coupe ${currentSlice + 1} / ${totalSlices}`}
            />

            <button
              className="dicom-slice-btn"
              onClick={() => handleSliceChange(currentSlice + 1)}
              disabled={currentSlice >= totalSlices - 1}
              title="Coupe suivante"
            >
              <ChevronRight size={16} />
            </button>

            <button
              className={`dicom-slice-btn ${isPlayingCine ? 'active' : ''}`}
              onClick={toggleCine}
              title={isPlayingCine ? 'Pause (Ciné)' : 'Lecture continue (Ciné)'}
            >
              {isPlayingCine ? <Pause size={15} /> : <Play size={15} />}
            </button>

            <span className="dicom-slice-info">
              <Layers size={13} />
              {currentSlice + 1} / {totalSlices}
            </span>
          </div>
        )}
      </div>

      {/* Viewport */}
      <div
        className={`dicom-viewport-wrapper ${activeTool === 'Eraser' ? 'is-eraser-active' : ''}`}
        onContextMenu={(e) => e.preventDefault()}
      >
        {loading && (
          <div className="dicom-loading">
            <div className="loading-spinner" />
            <p>Chargement de l'imagerie DICOM...</p>
          </div>
        )}
        {error && (
          <div className="dicom-error">
            <p>{error}</p>
          </div>
        )}
        <div
          ref={viewportRef}
          className={`dicom-viewport ${activeTool === 'Eraser' ? 'cursor-eraser' : ''}`}
          style={{
            width: '100%',
            height: '100%',
            visibility: loading || error ? 'hidden' : 'visible',
          }}
        />

        {activeTool === 'Eraser' && !loading && !error && (
          <div className="dicom-eraser-hint">
            <Eraser size={14} />
            <span>Mode Gomme : cliquez sur une mesure pour l'effacer</span>
          </div>
        )}
      </div>

      {/* Metadata HUD Overlay */}
      {dicomInfo && !loading && !error && (
        <div className="dicom-hud">
          <div className="dicom-hud-top-left">
            {dicomInfo.patient_name && <span>{dicomInfo.patient_name}</span>}
            {dicomInfo.modality && (
              <span>
                {dicomInfo.modality}
                {dicomInfo.study_description ? ` — ${dicomInfo.study_description}` : ''}
              </span>
            )}
            {totalSlices > 1 && (
              <span className="dicom-hud-slice">Coupe: {currentSlice + 1} / {totalSlices}</span>
            )}
          </div>
          <div className="dicom-hud-top-right">
            {dicomInfo.institution_name && <span>{dicomInfo.institution_name}</span>}
            {dicomInfo.study_date && <span>{dicomInfo.study_date}</span>}
            {isPresenter && <span className="dicom-hud-presenter-flag">● VOUS PRÉSENTEZ</span>}
            {isRemotePresenter && isFollowing && (
              <span className="dicom-hud-following-flag">● SUIVI DE {presenterName.toUpperCase()}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
