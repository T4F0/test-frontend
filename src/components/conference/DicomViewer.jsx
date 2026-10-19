import { useEffect, useRef, useState, useCallback } from 'react'
import {
  X,
  RotateCcw,
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
  Sliders,
  Shield,
  ShieldCheck,
  FolderOpen,
  PanelLeft,
  PanelLeftClose,
  Keyboard,
  MousePointer2,
  AlertTriangle,
} from 'lucide-react'
import { initCornerstone } from '../../lib/cornerstoneSetup'
import * as cornerstone from '@cornerstonejs/core'
import * as cornerstoneTools from '@cornerstonejs/tools'
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader'
import dicomParser from 'dicom-parser'
import { getAuthAxios } from '../../api/authApi'
import { resolveApiUrl } from '../../api/config'
import DicomThumbnailPanel from './DicomThumbnailPanel'
import DicomHud from './DicomHud'
import DicomSeriesDrawer from './DicomSeriesDrawer'
import ArrowLabelDialog from './ArrowLabelDialog'
import ShortcutsOverlay from './ShortcutsOverlay'
import {
  TOOLS,
  TOOL_GROUPS,
  WL_PRESETS,
  CINE_SPEEDS,
  applyToolBindings,
  renderArrowTextBox,
} from '../../lib/dicomTools'
import {
  authorColor,
  dicomEndpointFor,
  isSameDicomFile,
  normalizeDicomUrl,
  withAnonymize,
} from '../../lib/dicomIds'
import { fetchBuffers } from '../../lib/dicomFetch'

export default function DicomViewer({
  file,
  onClose,
  onViewportChange,
  dicomPresenter,
  dicomSyncState,
  dicomAnnotationSyncState,
  onBroadcastViewportSync,
  onBroadcastPresenterMode,
  onBroadcastAnnotationSync,
  currentUserId,
  currentUserName,
  conferenceId,
  isSidebarOpen,
}) {
  const viewportRef = useRef(null)
  const renderingEngineRef = useRef(null)
  const toolGroupIdRef = useRef(`dicom-tools-${Math.random().toString(36).substring(2, 9)}`)
  const isApplyingRemoteUpdateRef = useRef(false)
  const lastBroadcastTimeRef = useRef(0)
  const broadcastTimerRef = useRef(null)
  const isPresenterRef = useRef(false)
  const keepPresenterOnReloadRef = useRef(false)
  const imageIdsRef = useRef([])

  const [activeTool, setActiveTool] = useState('WindowLevel')
  const activeToolRef = useRef('WindowLevel')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dicomInfo, setDicomInfo] = useState(null)
  const [currentSlice, setCurrentSlice] = useState(0)
  const [totalSlices, setTotalSlices] = useState(1)
  const [isPlayingCine, setIsPlayingCine] = useState(false)
  const [annotationCount, setAnnotationCount] = useState(0)
  const [selectedCount, setSelectedCount] = useState(0)
  const [showThumbnailPanel, setShowThumbnailPanel] = useState(false)
  const [loadProgress, setLoadProgress] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [zoomPct, setZoomPct] = useState(100)
  const [cineFps, setCineFps] = useState(10)
  const [confirmClear, setConfirmClear] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [notice, setNotice] = useState(null)
  const [pointerMode, setPointerMode] = useState(false)
  const [remotePointer, setRemotePointer] = useState(null)
  const [remoteAuthor, setRemoteAuthor] = useState(null)
  const [presentWarn, setPresentWarn] = useState(false)
  const phiWarnedRef = useRef(false)
  const lastPointerSentRef = useRef(0)
  const pointerHideTimerRef = useRef(null)

  // Real-time synchronization state (Phase 2)
  const [isPresenter, setIsPresenter] = useState(false)
  const [isFollowing, setIsFollowing] = useState(true)

  // Phase 3: Presets, Anonymization & Series State
  const [activeWLPreset, setActiveWLPreset] = useState(null)
  const [showPresetMenu, setShowPresetMenu] = useState(false)
  const [currentVOI, setCurrentVOI] = useState({ windowWidth: null, windowCenter: null })
  const [isAnonymized, setIsAnonymized] = useState(false)
  const [studiesList, setStudiesList] = useState([])
  const [showSeriesDrawer, setShowSeriesDrawer] = useState(false)
  const [activeSeriesUid, setActiveSeriesUid] = useState(null)
  const [currentSeriesFile, setCurrentSeriesFile] = useState(null)

  // Arrow Annotation Naming Prompt State (In-visualization modal to avoid native browser alerts)
  const [arrowPrompt, setArrowPrompt] = useState(null)
  const [arrowInputText, setArrowInputText] = useState('')
  const arrowInputRef = useRef(null)
  const promptArrowTextRef = useRef(null)

  promptArrowTextRef.current = (doneCallback, initialText = '', isEditing = false) => {
    setArrowInputText(initialText || '')
    setArrowPrompt({ doneCallback, initialText, isEditing })
  }

  useEffect(() => {
    if (arrowPrompt) {
      setTimeout(() => {
        arrowInputRef.current?.focus()
        arrowInputRef.current?.select()
      }, 60)
    }
  }, [arrowPrompt])

  const handleConfirmArrowNaming = useCallback((text) => {
    if (arrowPrompt?.doneCallback) {
      const trimmed = (text || '').trim() || 'Flèche'
      arrowPrompt.doneCallback(trimmed)
    }
    setArrowPrompt(null)
    setArrowInputText('')
  }, [arrowPrompt])

  const handleCancelArrowNaming = useCallback(() => {
    if (arrowPrompt?.doneCallback) {
      if (arrowPrompt.isEditing) {
        arrowPrompt.doneCallback(arrowPrompt.initialText || 'Flèche')
      } else {
        arrowPrompt.doneCallback(null)
      }
    }
    setArrowPrompt(null)
    setArrowInputText('')
  }, [arrowPrompt])

  const configureArrowInstance = useCallback((arrowInstance) => {
    if (!arrowInstance) return

    arrowInstance.configuration = {
      ...arrowInstance.configuration,
      arrowFirst: false,
      getTextCallback: (doneCallback) => {
        promptArrowTextRef.current?.(doneCallback, '', false)
      },
      changeTextCallback: (data, eventData, doneCallback) => {
        const currentLabel = data?.data?.label || data?.label || ''
        promptArrowTextRef.current?.(doneCallback, currentLabel, true)
      },
    }

    arrowInstance.renderLinkedTextBoxAnnotation = renderArrowTextBox
  }, [])

  const isApplyingRemoteAnnotationRef = useRef(false)
  const serializeAnnotationRef = useRef(null)
  const onBroadcastAnnotationSyncRef = useRef(onBroadcastAnnotationSync)
  useEffect(() => {
    onBroadcastAnnotationSyncRef.current = onBroadcastAnnotationSync
  }, [onBroadcastAnnotationSync])

  const activeFile = currentSeriesFile || file
  const fileName = activeFile?.name || activeFile?.original_filename || activeFile?.display_name || 'DICOM'
  const fileId = String(activeFile?.originalId || activeFile?.id || activeFile?.attachment_id || 'dicom-view')

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

  // Fetch studies for series drawer if conferenceId is provided
  useEffect(() => {
    let mounted = true
    if (!conferenceId) return

    const fetchStudies = async () => {
      try {
        const authAxios = getAuthAxios()
        const res = await authAxios.get(resolveApiUrl(`/api/conferences/${conferenceId}/dicom-studies/${isAnonymized ? '?anonymize=1' : ''}`))
        if (mounted && Array.isArray(res.data)) {
          setStudiesList(res.data)
        }
      } catch (e) {
        console.warn('Could not load conference DICOM studies:', e)
      }
    }

    fetchStudies()
    return () => {
      mounted = false
    }
  }, [conferenceId, isAnonymized])

  // Sync anonymization state if remote presenter controls it
  useEffect(() => {
    if (dicomPresenter?.fileInfo?.is_anonymized !== undefined && isRemotePresenter && isFollowing) {
      setIsAnonymized(Boolean(dicomPresenter.fileInfo.is_anonymized))
    }
  }, [dicomPresenter, isFollowing, isRemotePresenter])

  // Determine DICOM fetch URL
  let dicomUrl = activeFile?.dicom_url || activeFile?.dicomUrl || activeFile?.url || activeFile?.file
  if (!dicomUrl && fileId && fileId !== 'dicom-view') {
    dicomUrl = dicomEndpointFor(fileId)
  }
  dicomUrl = normalizeDicomUrl(dicomUrl)

  // A series made of several single-frame files is loaded as one stack
  const seriesUrls = (activeFile?.series_dicom_urls || []).filter(Boolean)
  const seriesKey = seriesUrls.join('|')

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

      let presentation
      try {
        presentation = viewport.getViewPresentation?.({
          zoom: true,
          pan: true,
          rotation: true,
          flipHorizontal: true,
          flipVertical: true,
        })
      } catch (e) {}

      const payload = {
        camera,
        presentation,
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

  // The blob image ids (dicomfile:N) differ per client: send the stack index so receivers can remap
  const serializeAnnotation = useCallback((ann) => {
    const idx = imageIdsRef.current.indexOf(ann?.metadata?.referencedImageId)
    return { ...ann, _imageIndex: idx }
  }, [])

  // (receiver) point the annotation at this client's own image id
  const localizeAnnotation = useCallback((ann) => {
    const local = imageIdsRef.current[ann?._imageIndex]
    if (!local || !ann?.metadata) return ann
    return { ...ann, metadata: { ...ann.metadata, referencedImageId: local } }
  }, [])

  const buildPresenterFileInfo = useCallback((anonymized) => ({
    name: anonymized ? `[Imagerie Anonymisée #${fileId.slice(-4)}]` : fileName,
    modality: dicomInfo?.modality || '',
    study_description: dicomInfo?.study_description || '',
    institution_name: anonymized ? '[Établissement Masqué]' : (dicomInfo?.institution_name || ''),
    dicom_url: dicomUrl,
    series_dicom_urls: seriesUrls,
    url: activeFile?.url || activeFile?.file || '',
    file_type: activeFile?.file_type || activeFile?.fileType || 'DICOM',
    original_id: activeFile?.originalId || fileId,
    is_anonymized: anonymized,
  }), [activeFile, dicomInfo, dicomUrl, fileId, fileName, seriesKey])

  serializeAnnotationRef.current = serializeAnnotation

  // --- Toggle Presenter Mode ---
  const handleTogglePresenter = useCallback(() => {
    const nextPresenterState = !isPresenter
    setIsPresenter(nextPresenterState)
    isPresenterRef.current = nextPresenterState

    if (onBroadcastPresenterModeRef.current) {
      onBroadcastPresenterModeRef.current(fileId, nextPresenterState, buildPresenterFileInfo(isAnonymized))
    }

    if (nextPresenterState) {
      // Immediately broadcast initial viewport state to all participants
      const viewportId = `dicom-viewport-${fileId}`
      const viewport = renderingEngineRef.current?.getViewport(viewportId)
      if (viewport) {
        broadcastCurrentViewport(viewport)
      }
      // Broadcast current snapshot of all annotations to followers
      try {
        const all = cornerstoneTools.annotation.state.getAllAnnotations() || []
        if (all.length > 0 && onBroadcastAnnotationSyncRef.current) {
          onBroadcastAnnotationSyncRef.current(fileId, 'snapshot', { annotations: all.map(serializeAnnotation) })
        }
      } catch (e) {}
    }
  }, [broadcastCurrentViewport, buildPresenterFileInfo, fileId, isAnonymized, isPresenter, serializeAnnotation])

  const sendPointer = useCallback((evt) => {
    if (!isPresenterRef.current || !pointerMode) return
    const now = Date.now()
    if (evt.type !== 'pointerleave' && now - lastPointerSentRef.current < 40) return
    lastPointerSentRef.current = now
    const viewport = renderingEngineRef.current?.getViewport(`dicom-viewport-${fileId}`)
    const element = viewportRef.current
    if (!viewport || !element) return
    if (evt.type === 'pointerleave') {
      onBroadcastViewportSyncRef.current?.(fileId, { pointer: null })
      return
    }
    const rect = element.getBoundingClientRect()
    try {
      const world = viewport.canvasToWorld([evt.clientX - rect.left, evt.clientY - rect.top])
      onBroadcastViewportSyncRef.current?.(fileId, {
        pointer: { world, slice: viewport.getCurrentImageIdIndex() },
      })
    } catch (e) {}
  }, [fileId, pointerMode])

  // Interacting with the image yourself pauses auto-follow, so the presenter does not fight you
  const pauseFollowOnInteract = useCallback(() => {
    if (isRemotePresenter && isFollowing) {
      setIsFollowing(false)
      setNotice('Suivi en pause : vous contrôlez votre vue')
    }
  }, [isFollowing, isRemotePresenter])

  useEffect(() => {
    if (!notice) return undefined
    const t = setTimeout(() => setNotice(null), 3500)
    return () => clearTimeout(t)
  }, [notice])

  const wasRemotePresenterRef = useRef(false)
  useEffect(() => {
    if (isRemotePresenter && !wasRemotePresenterRef.current) {
      setNotice(`${presenterName} présente cette imagerie`)
    } else if (!isRemotePresenter && wasRemotePresenterRef.current) {
      setNotice('La présentation est terminée')
      setRemotePointer(null)
    }
    wasRemotePresenterRef.current = isRemotePresenter
  }, [isRemotePresenter, presenterName])

  useEffect(() => () => {
    if (pointerHideTimerRef.current) clearTimeout(pointerHideTimerRef.current)
  }, [])

  // Warn once before showing identified patient data to the whole conference
  const requestPresent = useCallback(() => {
    if (!isAnonymized && !phiWarnedRef.current) {
      setPresentWarn(true)
    } else {
      handleTogglePresenter()
    }
  }, [handleTogglePresenter, isAnonymized])

  const presentAsIs = useCallback(() => {
    phiWarnedRef.current = true
    setPresentWarn(false)
    handleTogglePresenter()
  }, [handleTogglePresenter])

  const presentAnonymized = useCallback(() => {
    phiWarnedRef.current = true
    setPresentWarn(false)
    keepPresenterOnReloadRef.current = true
    setIsPresenter(true)
    isPresenterRef.current = true
    onBroadcastPresenterModeRef.current?.(fileId, true, buildPresenterFileInfo(true))
    setIsAnonymized(true)
  }, [buildPresenterFileInfo, fileId])

  const handleToggleAnonymized = useCallback(() => {
    const next = !isAnonymized
    if (isPresenterRef.current) {
      keepPresenterOnReloadRef.current = true
      onBroadcastPresenterModeRef.current?.(fileId, true, buildPresenterFileInfo(next))
    }
    setIsAnonymized(next)
  }, [buildPresenterFileInfo, fileId, isAnonymized])

  // Another participant already presents: the server refused our request, so step down
  const otherUserPresenting = Boolean(
    dicomPresenter && String(dicomPresenter.userId) !== String(currentUserId)
  )
  useEffect(() => {
    if (otherUserPresenting && isPresenter) {
      setIsPresenter(false)
      isPresenterRef.current = false
    }
  }, [otherUserPresenting, isPresenter])

  // --- Apply Window / Level Preset (Phase 3) ---
  const handleApplyWLPreset = useCallback((preset) => {
    setActiveWLPreset(preset.name)
    setShowPresetMenu(false)

    const viewportId = `dicom-viewport-${fileId}`
    const viewport = renderingEngineRef.current?.getViewport(viewportId)
    if (!viewport) return

    const lower = preset.windowCenter - preset.windowWidth / 2
    const upper = preset.windowCenter + preset.windowWidth / 2

    viewport.setProperties({ voiRange: { lower, upper } })
    viewport.render()

    setCurrentVOI({ windowWidth: preset.windowWidth, windowCenter: preset.windowCenter })

    if (isPresenterRef.current) {
      broadcastCurrentViewport(viewport)
    }
  }, [broadcastCurrentViewport, fileId])

  // --- Select Series from Drawer (Phase 3) ---
  const handleSelectSeries = useCallback((series) => {
    if (!series || !series.slices || series.slices.length === 0) return
    setActiveSeriesUid(series.series_instance_uid || series.series_id)
    const firstSlice = series.slices[0]
    setCurrentSeriesFile({
      ...firstSlice,
      series_dicom_urls: series.slices.map((sl) => sl.dicom_url).filter(Boolean),
    })
  }, [])

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

      if (action === 'clear') {
        try {
          cornerstoneTools.annotation.selection.deselectAnnotation()
          cornerstoneTools.annotation.state.removeAllAnnotations()
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
          cornerstoneTools.annotation.selection.deselectAnnotation()
          cornerstoneTools.annotation.state.removeAllAnnotations()
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
        const all = cornerstoneTools.annotation.state.getAllAnnotations() || []
        setAnnotationCount(all.length)
      } catch (e) {}
    } catch (err) {
      console.warn('Error applying remote annotation sync:', err)
    } finally {
      setTimeout(() => {
        isApplyingRemoteAnnotationRef.current = false
      }, 60)
    }
  }, [activeFile?.originalId, dicomAnnotationSyncState, fileId, isFollowing, isPresenter, localizeAnnotation])

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

        // 3. Sync Camera or Zoom/Pan
        if (state.presentation && typeof viewport.setViewPresentation === 'function') {
          // Size-independent zoom/pan: stays correct when the follower's window differs
          viewport.setViewPresentation(state.presentation)
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
  }, [activeFile?.originalId, dicomSyncState, fileId, isFollowing, isPresenter])

  // --- Initialize Cornerstone & Viewport ---
  useEffect(() => {
    let mounted = true
    const engineId = `dicom-engine-${fileId}-${Date.now()}`
    const viewportId = `dicom-viewport-${fileId}`
    const toolGroupId = toolGroupIdRef.current
    const registeredImageIds = []
    let detachListeners = null

    const setup = async () => {
      try {
        setLoading(true)
        setError(null)
        setIsPlayingCine(false)

        if (!dicomUrl) {
          throw new Error('Aucune URL de fichier DICOM fournie.')
        }

        await initCornerstone()

        if (!viewportRef.current || !mounted) return

        // Fetch DICOM bytes via authenticated request (whole series when selected from the drawer)
        const urls = (seriesUrls.length > 1 ? seriesUrls : [dicomUrl]).map((u) =>
          withAnonymize(u, isAnonymized)
        )
        const buffers = await fetchBuffers(
          urls,
          () => !mounted,
          (done, total) => mounted && setLoadProgress(total > 1 ? { done, total } : null)
        )

        if (!mounted) return
        setLoadProgress(null)

        // Register every file with the Cornerstone loader and expand multi-frame files
        const imageIds = []
        let metadata = isAnonymized ? null : file?.dicom_metadata
        buffers.forEach((arrayBuffer, bufIndex) => {
          let numFrames = 1
          try {
            const dataSet = dicomParser.parseDicom(new Uint8Array(arrayBuffer))
            numFrames = parseInt(dataSet.string('x00280008') || '1', 10) || 1
            if (!metadata && bufIndex === 0) {
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
          if (buffers.length === 1 && metadata?.number_of_frames > numFrames) {
            numFrames = metadata.number_of_frames
          }

          const dicomBlob = new Blob([arrayBuffer], { type: 'application/dicom' })
          const baseImageId = cornerstoneDICOMImageLoader.wadouri.fileManager.add(dicomBlob)
          registeredImageIds.push(baseImageId)
          for (let i = 0; i < numFrames; i++) {
            imageIds.push(i === 0 ? baseImageId : `${baseImageId}?frame=${i}`)
          }
        })

        setDicomInfo(metadata)
        setTotalSlices(imageIds.length)
        setCurrentSlice(0)
        imageIdsRef.current = imageIds

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
        if (!mounted) return
        viewport.render()

        const initialProps = viewport.getProperties()
        if (initialProps?.voiRange) {
          const ww = Math.round(initialProps.voiRange.upper - initialProps.voiRange.lower)
          const wc = Math.round(initialProps.voiRange.lower + (initialProps.voiRange.upper - initialProps.voiRange.lower) / 2)
          setCurrentVOI({ windowWidth: ww, windowCenter: wc })
        }

        // Set up tool group
        const arrowConfig = {
          arrowFirst: false,
          getTextCallback: (doneCallback) => {
            promptArrowTextRef.current?.(doneCallback, '', false)
          },
          changeTextCallback: (data, eventData, doneCallback) => {
            const currentLabel = data?.data?.label || data?.label || ''
            promptArrowTextRef.current?.(doneCallback, currentLabel, true)
          },
        }

        let toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId)
        if (!toolGroup) {
          toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId)
          TOOLS.forEach(({ name }) => {
            try {
              if (name === 'ArrowAnnotate') {
                toolGroup.addTool(name, arrowConfig)
              } else {
                toolGroup.addTool(name)
              }
            } catch (e) {}
          })
          try {
            toolGroup.addTool('StackScroll')
          } catch (e) {}
        }

        const arrowInstance = toolGroup.getToolInstance('ArrowAnnotate')
        if (arrowInstance) {
          configureArrowInstance(arrowInstance)
        }

        toolGroup.addViewport(viewportId, engineId)
        applyToolBindings(toolGroup, activeToolRef.current)

        // Event listener for viewport changes (broadcasting when presenter)
        const element = viewportRef.current
        const handleViewportChange = () => {
          const currentVp = renderingEngineRef.current?.getViewport(viewportId)
          try {
            const zoom = currentVp?.getZoom?.()
            if (zoom) setZoomPct(Math.round(zoom * 100))
          } catch (e) {}
          if (!isPresenterRef.current || isApplyingRemoteUpdateRef.current) return
          if (currentVp) {
            broadcastCurrentViewportRef.current?.(currentVp)
          }
        }

        const handleVOIChange = () => {
          const currentVp = renderingEngineRef.current?.getViewport(viewportId)
          if (currentVp) {
            const props = currentVp.getProperties()
            if (props?.voiRange) {
              const ww = Math.round(props.voiRange.upper - props.voiRange.lower)
              const wc = Math.round(props.voiRange.lower + (props.voiRange.upper - props.voiRange.lower) / 2)
              setCurrentVOI({ windowWidth: ww, windowCenter: wc })
              setActiveWLPreset((prev) => {
                if (!prev) return prev
                const preset = WL_PRESETS.find((p) => p.name === prev)
                const matches =
                  preset &&
                  Math.abs(preset.windowWidth - ww) <= 1 &&
                  Math.abs(preset.windowCenter - wc) <= 1
                return matches ? prev : null
              })
            }
          }
          handleViewportChange()
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

        const pendingAnnotations = new Map()
        let annotationFlushRaf = null

        const handleAnnotationChanged = (evt) => {
          refreshAnnotationStats()
          if (!isPresenterRef.current || isApplyingRemoteAnnotationRef.current) return
          const ann = evt.detail?.annotation
          if (!ann) return
          // Dragging a handle fires MODIFIED on every mouse move: keep only the latest per animation frame
          pendingAnnotations.set(ann.annotationUID, ann)
          if (annotationFlushRaf) return
          annotationFlushRaf = requestAnimationFrame(() => {
            annotationFlushRaf = null
            const batch = Array.from(pendingAnnotations.values())
            pendingAnnotations.clear()
            batch.forEach((a) => onBroadcastAnnotationSyncRef.current?.(fileId, 'modify', { annotation: serializeAnnotationRef.current(a) }))
          })
        }

        const handleAnnotationRemoved = (evt) => {
          refreshAnnotationStats()
          const currentVp = renderingEngineRef.current?.getViewport(viewportId)
          if (currentVp) {
            cornerstoneTools.utilities.triggerAnnotationRenderForViewportIds([viewportId])
            currentVp.render()
          }
          if (!isPresenterRef.current || isApplyingRemoteAnnotationRef.current) return
          const annUID = evt.detail?.annotation?.annotationUID || evt.detail?.annotationUID
          if (annUID && onBroadcastAnnotationSyncRef.current) {
            onBroadcastAnnotationSyncRef.current(fileId, 'remove', { annotation_uid: annUID })
          }
        }

        element.addEventListener(cornerstone.Enums.Events.CAMERA_MODIFIED, handleViewportChange)
        element.addEventListener(cornerstone.Enums.Events.VOI_MODIFIED, handleVOIChange)
        element.addEventListener(cornerstone.Enums.Events.STACK_NEW_IMAGE, handleNewImage)

        cornerstone.eventTarget.addEventListener(
          cornerstoneTools.Enums.Events.ANNOTATION_ADDED,
          handleAnnotationChanged
        )
        cornerstone.eventTarget.addEventListener(
          cornerstoneTools.Enums.Events.ANNOTATION_COMPLETED,
          handleAnnotationChanged
        )
        cornerstone.eventTarget.addEventListener(
          cornerstoneTools.Enums.Events.ANNOTATION_MODIFIED,
          handleAnnotationChanged
        )
        cornerstone.eventTarget.addEventListener(
          cornerstoneTools.Enums.Events.ANNOTATION_SELECTION_CHANGE,
          refreshAnnotationStats
        )
        cornerstone.eventTarget.addEventListener(
          cornerstoneTools.Enums.Events.ANNOTATION_REMOVED,
          handleAnnotationRemoved
        )

        detachListeners = () => {
          if (annotationFlushRaf) cancelAnimationFrame(annotationFlushRaf)
          element.removeEventListener(cornerstone.Enums.Events.CAMERA_MODIFIED, handleViewportChange)
          element.removeEventListener(cornerstone.Enums.Events.VOI_MODIFIED, handleVOIChange)
          element.removeEventListener(cornerstone.Enums.Events.STACK_NEW_IMAGE, handleNewImage)
          const { eventTarget } = cornerstone
          const { Events } = cornerstoneTools.Enums
          eventTarget.removeEventListener(Events.ANNOTATION_ADDED, handleAnnotationChanged)
          eventTarget.removeEventListener(Events.ANNOTATION_COMPLETED, handleAnnotationChanged)
          eventTarget.removeEventListener(Events.ANNOTATION_MODIFIED, handleAnnotationChanged)
          eventTarget.removeEventListener(Events.ANNOTATION_SELECTION_CHANGE, refreshAnnotationStats)
          eventTarget.removeEventListener(Events.ANNOTATION_REMOVED, handleAnnotationRemoved)
        }

        refreshAnnotationStats()

        // Presentation survived a reload: push the fresh view to followers
        if (isPresenterRef.current) {
          broadcastCurrentViewportRef.current?.(viewport)
        }

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
      if (keepPresenterOnReloadRef.current) {
        // Anonymisation toggle: same file reloads, the presentation continues
        keepPresenterOnReloadRef.current = false
      } else if (isPresenterRef.current && onBroadcastPresenterModeRef.current) {
        onBroadcastPresenterModeRef.current(fileId, false, {})
        isPresenterRef.current = false
        setIsPresenter(false)
      }

      if (broadcastTimerRef.current) {
        clearTimeout(broadcastTimerRef.current)
      }

      try {
        detachListeners?.()
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
      registeredImageIds.forEach((id) => {
        try {
          cornerstoneDICOMImageLoader.wadouri.fileManager.remove(id)
        } catch (e) {}
      })
    }
  }, [dicomUrl, fileId, isAnonymized, seriesKey, reloadToken])

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
  }, [fileId])

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
  }, [isSidebarOpen, showSeriesDrawer, showThumbnailPanel, scheduleStaggeredResize])

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
  }, [triggerResize])

  // --- Tool Switching ---
  const handleToolChange = useCallback((toolName) => {
    setActiveTool(toolName)
    activeToolRef.current = toolName
    const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupIdRef.current)
    if (!toolGroup) return

    if (toolName === 'ArrowAnnotate') {
      const arrowInstance = toolGroup.getToolInstance('ArrowAnnotate')
      if (arrowInstance) {
        configureArrowInstance(arrowInstance)
      }
    }
    applyToolBindings(toolGroup, toolName)
  }, [configureArrowInstance])

  // --- Reset Viewport ---
  const handleReset = useCallback(() => {
    const viewportId = `dicom-viewport-${fileId}`
    const viewport = renderingEngineRef.current?.getViewport(viewportId)
    if (viewport) {
      viewport.resetCamera()
      viewport.resetProperties?.()
      setActiveWLPreset(null)
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
  const toggleCine = useCallback(() => setIsPlayingCine((playing) => !playing), [])

  useEffect(() => {
    if (!isPlayingCine || totalSlices <= 1) return undefined
    const intervalId = setInterval(() => {
      const viewport = renderingEngineRef.current?.getViewport(`dicom-viewport-${fileId}`)
      if (!viewport) return
      const next = (viewport.getCurrentImageIdIndex() + 1) % totalSlices
      setCurrentSlice(next)
      viewport.setImageIdIndex(next).catch(() => {})
      if (isPresenterRef.current) {
        broadcastCurrentViewport(viewport)
      }
    }, 1000 / cineFps)
    return () => clearInterval(intervalId)
  }, [broadcastCurrentViewport, cineFps, fileId, isPlayingCine, totalSlices])

  // --- Delete Selected Annotations ---
  const handleDeleteSelected = useCallback(() => {
    const selectedUIDs = cornerstoneTools.annotation.selection.getAnnotationsSelected() || []
    if (selectedUIDs.length === 0) return

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
      const all = cornerstoneTools.annotation.state.getAllAnnotations() || []
      setAnnotationCount(all.length)
      setSelectedCount(0)
    } catch (e) {}
  }, [fileId])

  // --- Clear All Annotations ---
  const handleClearAllAnnotations = useCallback(() => {
    const all = cornerstoneTools.annotation.state.getAllAnnotations() || []
    if (all.length === 0) return

    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    setConfirmClear(false)
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

    if (isPresenterRef.current && onBroadcastAnnotationSyncRef.current) {
      onBroadcastAnnotationSyncRef.current(fileId, 'clear', {})
    }
  }, [confirmClear, fileId])

  // The two-step "Tout effacer" confirmation lapses on its own
  useEffect(() => {
    if (!confirmClear) return undefined
    const t = setTimeout(() => setConfirmClear(false), 4000)
    return () => clearTimeout(t)
  }, [confirmClear])

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
            const all = cornerstoneTools.annotation.state.getAllAnnotations() || []
            setAnnotationCount(all.length)
            setSelectedCount(0)
          } catch (err) {}
        }
      } else if (e.key === 'Escape') {
        setShowShortcuts(false)
        try {
          cornerstoneTools.annotation.selection.deselectAnnotation()
          setSelectedCount(0)
        } catch (err) {}
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fileId])

  // --- Tool / navigation shortcuts (always read the latest handlers through a ref) ---
  const shortcutActionsRef = useRef({})
  shortcutActionsRef.current = {
    handleToolChange,
    handleReset,
    handleSliceChange,
    handleApplyWLPreset,
    toggleCine,
    totalSlices,
    getSlice: () =>
      renderingEngineRef.current?.getViewport(`dicom-viewport-${fileId}`)?.getCurrentImageIdIndex() ?? 0,
    promptOpen: Boolean(arrowPrompt),
  }

  useEffect(() => {
    const handleShortcut = (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return
      const actions = shortcutActionsRef.current
      if (actions.promptOpen) return

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
  }, [])

  return (
    <div className={`dicom-viewer-container ${isPresenter ? 'is-presenter-active' : ''}`}>
      {/* Header */}
      <div className="dicom-viewer-header">
        <div className="dicom-header-info">
          <h3>{isAnonymized ? `[Imagerie Anonymisée #${fileId.slice(-4)}]` : fileName}</h3>
          {dicomInfo?.modality && (
            <span className="dicom-modality-badge">{dicomInfo.modality}</span>
          )}
          {dicomInfo?.study_description && (
            <span className="dicom-study-desc-badge" title={dicomInfo.study_description}>
              {dicomInfo.study_description}
            </span>
          )}
        </div>

        {/* Real-time Presenter Mode & Phase 3 Collaboration Controls */}
        <div className="dicom-header-collaboration">
          {/* Anonymization PHI Masking Toggle (Phase 3) */}
          <button
            className={`dicom-tool-btn ${isAnonymized ? 'anonymize-active' : ''}`}
            onClick={handleToggleAnonymized}
            title={isAnonymized ? "Afficher les identifiants patients" : "Masquer les données identifiantes (Protection PHI)"}
          >
            {isAnonymized ? <ShieldCheck size={15} /> : <Shield size={15} />}
            <span>{isAnonymized ? 'Anonymisé' : 'Anonymiser'}</span>
          </button>

          {/* Séries Drawer Toggle (Phase 3) */}
          {studiesList.length > 0 && (
            <button
              className={`dicom-tool-btn ${showSeriesDrawer ? 'active' : ''}`}
              onClick={() => setShowSeriesDrawer(!showSeriesDrawer)}
              title="Afficher les séries et coupes disponibles"
            >
              <FolderOpen size={15} />
              <span>Séries ({studiesList.reduce((acc, s) => acc + (s.total_series || s.series?.length || 0), 0)})</span>
            </button>
          )}

          {/* Case 1: Current user is the presenter */}
          {isPresenter && (
            <div className="presenter-live-indicator">
              <span className="live-pulse-dot" />
              <span className="live-label">Présentation en direct</span>
              <button
                className={`btn-stop-presenting btn-pointer-toggle ${pointerMode ? 'is-on' : ''}`}
                onClick={() => setPointerMode((v) => !v)}
                title="Pointeur laser visible par les participants"
                aria-pressed={pointerMode}
              >
                <MousePointer2 size={12} /> Pointeur
              </button>
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
                    <span>Reprendre le suivi</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Case 3: Idle - Nobody is presenting */}
          {!isPresenter && !isRemotePresenter && onBroadcastPresenterMode && (
            <button
              className="btn-start-presenting"
              onClick={requestPresent}
              title="Présenter cette imagerie à tous les participants de la conférence"
            >
              <Radio size={15} />
              <span>Présenter aux participants</span>
            </button>
          )}

          <button className="btn-close-viewer" onClick={onClose} title="Fermer l'imagerie" aria-label="Fermer l'imagerie">
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="dicom-toolbar" role="toolbar" aria-label="Outils d'imagerie">
        {TOOL_GROUPS.map(({ id, label: groupLabel }, groupIndex) => (
          <div key={id} className="dicom-tool-group" role="group" aria-label={groupLabel}>
            {groupIndex > 0 && <div className="dicom-toolbar-divider" />}
            {TOOLS.filter((t) => t.group === id).map(({ name, icon: Icon, label, key }) => (
              <button
                key={name}
                className={`dicom-tool-btn ${activeTool === name ? 'active' : ''} ${name === 'Eraser' ? 'eraser-tool-btn' : ''}`}
                onClick={() => handleToolChange(name)}
                title={`${name === 'Eraser' ? "Gomme (cliquer sur une mesure ou annotation pour l'effacer)" : label} (${key.toUpperCase()})`}
                aria-label={label}
                aria-pressed={activeTool === name}
              >
                <Icon size={17} />
                <span className="tool-label">{label}</span>
              </button>
            ))}
          </div>
        ))}

        <div className="dicom-toolbar-divider" />

        {/* W/L Presets Dropdown (Phase 3) */}
        <div className="dicom-preset-dropdown-container">
          <button
            className={`dicom-tool-btn ${activeWLPreset ? 'preset-active' : ''}`}
            onClick={() => setShowPresetMenu(!showPresetMenu)}
            title="Préréglages Fenêtrage (Window / Level)"
            aria-haspopup="menu"
            aria-expanded={showPresetMenu}
          >
            <Sliders size={17} />
            <span className="tool-label">{activeWLPreset || 'Fenêtrage'}</span>
          </button>

          {showPresetMenu && (
            <div className="dicom-preset-menu">
              <div className="dicom-preset-menu-header">
                <span>Préréglages Cliniques</span>
              </div>
              {WL_PRESETS.map((p) => (
                <button
                  key={p.name}
                  className={`dicom-preset-item ${activeWLPreset === p.name ? 'selected' : ''}`}
                  onClick={() => handleApplyWLPreset(p)}
                >
                  <div className="preset-item-label">
                    <kbd className="dicom-kbd-shortcut">{WL_PRESETS.indexOf(p) + 1}</kbd> {p.label}
                  </div>
                  <div className="preset-item-values">W: {p.windowWidth} / C: {p.windowCenter}</div>
                </button>
              ))}
            </div>
          )}
        </div>

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
          className={`dicom-tool-btn ${annotationCount === 0 ? 'is-disabled' : ''} ${confirmClear ? 'danger-active-btn' : ''}`}
          onClick={handleClearAllAnnotations}
          disabled={annotationCount === 0}
          title={annotationCount > 0 ? `Effacer toutes les mesures (${annotationCount})` : 'Aucune mesure à effacer'}
          aria-label="Tout effacer"
        >
          <Trash2 size={17} />
          <span className="tool-label">{confirmClear ? 'Confirmer ?' : 'Tout effacer'}</span>
          {annotationCount > 0 && (
            <span className="dicom-count-badge">{annotationCount}</span>
          )}
        </button>

        <button className="dicom-tool-btn" onClick={handleReset} title="Réinitialiser l'affichage (R)" aria-label="Réinitialiser l'affichage">
          <RotateCcw size={17} />
          <span className="tool-label">Réinitialiser</span>
        </button>

        {/* Multi-slice navigation controls */}
        {totalSlices > 1 && (
          <div className="dicom-slice-navigator">
            <div className="dicom-toolbar-divider" />

            {/* Thumbnail Panel Toggle */}
            <button
              className={`dicom-tool-btn ${showThumbnailPanel ? 'active' : ''}`}
              onClick={() => setShowThumbnailPanel(!showThumbnailPanel)}
              title={showThumbnailPanel ? 'Masquer le panneau des coupes' : 'Afficher le panneau des coupes'}
            >
              {showThumbnailPanel ? <PanelLeftClose size={17} /> : <PanelLeft size={17} />}
              <span className="tool-label">Coupes</span>
            </button>

            <button
              className="dicom-slice-btn"
              onClick={() => handleSliceChange(currentSlice - 1)}
              disabled={currentSlice <= 0}
              title="Coupe précédente (↑)"
              aria-label="Coupe précédente"
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
              aria-label="Position dans la série"
              aria-valuetext={`Coupe ${currentSlice + 1} sur ${totalSlices}`}
            />

            <button
              className="dicom-slice-btn"
              onClick={() => handleSliceChange(currentSlice + 1)}
              disabled={currentSlice >= totalSlices - 1}
              title="Coupe suivante (↓)"
              aria-label="Coupe suivante"
            >
              <ChevronRight size={16} />
            </button>

            <button
              className={`dicom-slice-btn ${isPlayingCine ? 'active' : ''}`}
              onClick={toggleCine}
              title={isPlayingCine ? 'Pause (Espace)' : 'Lecture continue (Espace)'}
              aria-label={isPlayingCine ? 'Mettre en pause' : 'Lecture continue'}
              aria-pressed={isPlayingCine}
            >
              {isPlayingCine ? <Pause size={15} /> : <Play size={15} />}
            </button>

            <select
              className="dicom-cine-speed"
              value={cineFps}
              onChange={(e) => setCineFps(Number(e.target.value))}
              title="Vitesse de lecture"
              aria-label="Vitesse de lecture"
            >
              {CINE_SPEEDS.map((fps) => (
                <option key={fps} value={fps}>{fps} i/s</option>
              ))}
            </select>

            <span className="dicom-slice-info">
              <Layers size={13} />
              {currentSlice + 1} / {totalSlices}
            </span>
          </div>
        )}

        <button
          className={`dicom-tool-btn dicom-help-btn ${showShortcuts ? 'active' : ''}`}
          onClick={() => setShowShortcuts((v) => !v)}
          title="Raccourcis clavier (?)"
          aria-label="Raccourcis clavier"
          aria-pressed={showShortcuts}
        >
          <Keyboard size={17} />
        </button>
      </div>

      {/* Viewport */}
      <div
        className={`dicom-viewport-wrapper ${activeTool === 'Eraser' ? 'is-eraser-active' : ''} ${showThumbnailPanel && totalSlices > 1 ? 'has-thumbnail-panel' : ''}`}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Thumbnail Panel */}
        {showThumbnailPanel && totalSlices > 1 && (
          <DicomThumbnailPanel
            imageIds={imageIdsRef.current}
            currentSlice={currentSlice}
            onSliceSelect={handleSliceChange}
            totalSlices={totalSlices}
            voiRange={currentVOI.windowWidth !== null ? {
              lower: currentVOI.windowCenter - currentVOI.windowWidth / 2,
              upper: currentVOI.windowCenter + currentVOI.windowWidth / 2,
            } : null}
          />
        )}

        <div className="dicom-viewport-main">
        {loading && (
          <div className="dicom-loading">
            <div className="loading-spinner" />
            <p>
              Chargement de l'imagerie DICOM...
              {loadProgress ? ` (${loadProgress.done}/${loadProgress.total} coupes)` : ''}
            </p>
            {loadProgress && (
              <div className="dicom-load-bar" role="progressbar" aria-valuemin={0} aria-valuemax={loadProgress.total} aria-valuenow={loadProgress.done}>
                <div style={{ width: `${(loadProgress.done / loadProgress.total) * 100}%` }} />
              </div>
            )}
          </div>
        )}
        {error && (
          <div className="dicom-error" role="alert">
            <p>{error}</p>
            <div className="dicom-error-actions">
              <button type="button" className="dicom-arrow-btn-confirm" onClick={() => setReloadToken((t) => t + 1)}>
                Réessayer
              </button>
              <button type="button" className="dicom-arrow-btn-cancel" onClick={onClose}>
                Fermer
              </button>
            </div>
          </div>
        )}
        <div
          ref={viewportRef}
          className={`dicom-viewport ${activeTool === 'Eraser' ? 'cursor-eraser' : ''}`}
          onPointerDown={pauseFollowOnInteract}
          onWheel={pauseFollowOnInteract}
          onPointerMove={sendPointer}
          onPointerLeave={sendPointer}
          onDoubleClick={() => {
            if (['WindowLevel', 'Pan', 'Zoom'].includes(activeTool)) handleReset()
          }}
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

        {arrowPrompt && (
          <ArrowLabelDialog
            prompt={arrowPrompt}
            text={arrowInputText}
            onTextChange={setArrowInputText}
            onConfirm={handleConfirmArrowNaming}
            onCancel={handleCancelArrowNaming}
            inputRef={arrowInputRef}
          />
        )}

        {showSeriesDrawer && studiesList.length > 0 && (
          <DicomSeriesDrawer
            studies={studiesList}
            activeSeriesUid={activeSeriesUid}
            onSelectSeries={handleSelectSeries}
            onClose={() => setShowSeriesDrawer(false)}
          />
        )}

        {dicomInfo && !loading && !error && (
          <DicomHud
            info={dicomInfo}
            isAnonymized={isAnonymized}
            totalSlices={totalSlices}
            currentSlice={currentSlice}
            voi={currentVOI}
            activePreset={activeWLPreset}
            zoomPct={zoomPct}
            isPresenter={isPresenter}
            isRemotePresenter={isRemotePresenter}
            isFollowing={isFollowing}
            presenterName={presenterName || ''}
            remoteAuthor={remoteAuthor}
          />
        )}

        {notice && (
          <div className="dicom-notice" role="status" aria-live="polite">{notice}</div>
        )}

        {remotePointer && remotePointer.slice === currentSlice && (
          <div className="dicom-remote-pointer" style={{ left: remotePointer.x, top: remotePointer.y }} aria-hidden="true" />
        )}

        {presentWarn && (
          <div className="dicom-arrow-naming-backdrop" onClick={() => setPresentWarn(false)}>
            <div className="dicom-arrow-naming-modal" role="alertdialog" aria-label="Données patient visibles" onClick={(e) => e.stopPropagation()}>
              <div className="dicom-arrow-naming-header">
                <div className="dicom-arrow-naming-title">
                  <AlertTriangle size={18} />
                  <span>Données patient visibles</span>
                </div>
              </div>
              <div className="dicom-arrow-naming-body">
                <p className="dicom-warn-text">
                  Cette imagerie contient le nom et l'identifiant du patient. Tous les participants de la
                  conférence les verront. Voulez-vous anonymiser avant de présenter&nbsp;?
                </p>
              </div>
              <div className="dicom-arrow-naming-footer">
                <button type="button" className="dicom-arrow-btn-cancel" onClick={() => setPresentWarn(false)}>Annuler</button>
                <button type="button" className="dicom-arrow-btn-cancel" onClick={presentAsIs}>Présenter tel quel</button>
                <button type="button" className="dicom-arrow-btn-confirm" onClick={presentAnonymized}>
                  <ShieldCheck size={15} />
                  <span>Anonymiser et présenter</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}
        </div>{/* end dicom-viewport-main */}
      </div>

    </div>
  )
}
