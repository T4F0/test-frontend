import { useEffect, useRef, useState, useCallback } from 'react'
import { Eraser, ShieldCheck, AlertTriangle } from 'lucide-react'
import { initCornerstone } from '../../lib/cornerstoneSetup'
import * as cornerstone from '@cornerstonejs/core'
import * as cornerstoneTools from '@cornerstonejs/tools'
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader'
import dicomParser from 'dicom-parser'
import { getAuthAxios } from '../../api/authApi'
import { resolveApiUrl } from '../../api/config'
import DicomHud from './DicomHud'
import DicomTopBar from './DicomTopBar'
import DicomToolRail from './DicomToolRail'
import DicomSliceBar from './DicomSliceBar'
import DicomSidePanel from './DicomSidePanel'
import ArrowLabelDialog from './ArrowLabelDialog'
import ShortcutsOverlay from './ShortcutsOverlay'
import {
  TOOLS,
  WL_PRESETS,
  applyToolBindings,
} from '../../lib/dicomTools'
import {
  dicomEndpointFor,
  isSameDicomFile,
  normalizeDicomUrl,
  withAnonymize,
} from '../../lib/dicomIds'
import { fetchBuffers } from '../../lib/dicomFetch'
import { getUserAnnotations, removeUserAnnotations } from '../../lib/dicomAnnotations'
import useViewportResize from '../../hooks/useViewportResize'
import useDicomShortcuts from '../../hooks/useDicomShortcuts'
import useDicomFollower from '../../hooks/useDicomFollower'
import useDicomHistory from '../../hooks/useDicomHistory'
import useDicomAuthorHover from '../../hooks/useDicomAuthorHover'
import useArrowPrompt from '../../hooks/useArrowPrompt'
import { installRoiGuards } from '../../lib/dicomRoiGuards'
import { saveAnnotations, loadAnnotations } from '../../lib/dicomAnnotationStore'
import { orientationFromCamera } from '../../lib/dicomOrientation'
import { extractMeasurements } from '../../lib/dicomMeasurements'
import { captureViewport } from '../../lib/dicomKeyImage'
import { createFinding } from '../../api/caseToolsApi'
import { useAuth } from '../../context/AuthContext'

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
  const [showScale, setShowScale] = useState(true)
  const [orientation, setOrientation] = useState(null)
  const [hasOrientation, setHasOrientation] = useState(false)
  const [isInverted, setIsInverted] = useState(false)
  const showScaleRef = useRef(true)
  const followRemoteRef = useRef(false)
  const localizeAnnotationRef = useRef(null)
  const presenterInfoRef = useRef(null)
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

  // Arrow annotation naming (in-viewer prompt instead of a native dialog)
  const {
    arrowPrompt,
    arrowInputText,
    setArrowInputText,
    arrowInputRef,
    promptArrowTextRef,
    handleConfirmArrowNaming,
    handleCancelArrowNaming,
    configureArrowInstance,
  } = useArrowPrompt()

  const isApplyingRemoteAnnotationRef = useRef(false)
  const serializeAnnotationRef = useRef(null)
  const historyApiRef = useRef(null)
  const remoteAuthorsRef = useRef(new Map())
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
        invert: properties?.invert,
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
  localizeAnnotationRef.current = localizeAnnotation

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
        const all = getUserAnnotations()
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

  // --- Image tools: window numbers, invert, mirror, rotate, scale ---
  const currentViewport = useCallback(
    () => renderingEngineRef.current?.getViewport(`dicom-viewport-${fileId}`),
    [fileId],
  )

  const afterImageChange = useCallback(
    (viewport) => {
      viewport.render()
      if (isPresenterRef.current) broadcastCurrentViewport(viewport)
    },
    [broadcastCurrentViewport],
  )

  const handleSetWindow = useCallback(
    (width, center) => {
      const viewport = currentViewport()
      if (!viewport || !Number.isFinite(width) || !Number.isFinite(center) || width < 1) return
      viewport.setProperties({ voiRange: { lower: center - width / 2, upper: center + width / 2 } })
      setActiveWLPreset(null)
      setCurrentVOI({ windowWidth: Math.round(width), windowCenter: Math.round(center) })
      afterImageChange(viewport)
    },
    [afterImageChange, currentViewport],
  )

  const handleToggleInvert = useCallback(() => {
    const viewport = currentViewport()
    if (!viewport) return
    const next = !viewport.getProperties().invert
    viewport.setProperties({ invert: next })
    setIsInverted(next)
    afterImageChange(viewport)
  }, [afterImageChange, currentViewport])

  const handleFlip = useCallback(
    (axis) => {
      const viewport = currentViewport()
      if (!viewport) return
      viewport.flip(axis === 'h' ? { flipHorizontal: true } : { flipVertical: true })
      afterImageChange(viewport)
    },
    [afterImageChange, currentViewport],
  )

  const handleRotate = useCallback(
    (delta) => {
      const viewport = currentViewport()
      if (!viewport) return
      const now = viewport.getViewPresentation({ rotation: true })
      viewport.setViewPresentation({ rotation: (((now.rotation || 0) + delta) % 360 + 360) % 360 })
      afterImageChange(viewport)
    },
    [afterImageChange, currentViewport],
  )

  const handleToggleScale = useCallback(() => {
    setShowScale((v) => !v)
  }, [])

  useEffect(() => {
    showScaleRef.current = showScale
    const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupIdRef.current)
    try {
      if (showScale) toolGroup?.setToolEnabled('ScaleOverlay')
      else toolGroup?.setToolDisabled('ScaleOverlay')
    } catch (e) {}
    currentViewport()?.render()
  }, [showScale, currentViewport])

  // --- Keeping followers complete: resync request, answer and presenter heartbeat ---
  followRemoteRef.current = isRemotePresenter && isFollowing
  presenterInfoRef.current = buildPresenterFileInfo(isAnonymized)

  // A follower (joining, or resuming after a pause) asks the presenter to re-send everything
  useEffect(() => {
    if (!isRemotePresenter || !isFollowing || loading) return
    onBroadcastAnnotationSyncRef.current?.(fileId, 'resync', {})
  }, [fileId, isFollowing, isRemotePresenter, loading])

  // The presenter answers with the full annotation set and the current view
  useEffect(() => {
    if (!isPresenter || dicomAnnotationSyncState?.action !== 'resync') return
    if (!isSameDicomFile(dicomAnnotationSyncState.attachmentId, fileId, activeFile?.originalId)) return
    const viewport = currentViewport()
    if (!viewport) return
    try {
      const all = getUserAnnotations()
      onBroadcastAnnotationSyncRef.current?.(fileId, 'snapshot', { annotations: all.map(serializeAnnotation) })
    } catch (e) {}
    broadcastCurrentViewport(viewport)
  }, [activeFile?.originalId, broadcastCurrentViewport, currentViewport, dicomAnnotationSyncState, fileId, isPresenter, serializeAnnotation])

  // The server expires an idle presenter claim after two minutes: renew it
  useEffect(() => {
    if (!isPresenter) return undefined
    const timer = setInterval(() => {
      onBroadcastPresenterModeRef.current?.(fileId, true, presenterInfoRef.current)
    }, 45000)
    return () => clearInterval(timer)
  }, [fileId, isPresenter])

  const { user: authUser } = useAuth()
  const findingSubmission =
    file?.submission || file?.submissionId || activeFile?.submission || activeFile?.submissionId
  const canSaveFinding = Boolean(findingSubmission) && authUser?.role !== 'COORDINATEUR'
  const showSaveFinding = authUser?.role !== 'COORDINATEUR'
  const [savingFinding, setSavingFinding] = useState(false)

  const handleSaveFinding = useCallback(async () => {
    if (!findingSubmission || savingFinding) return
    setSavingFinding(true)
    try {
      const image = await captureViewport(viewportRef.current)
      const measurements = extractMeasurements(getUserAnnotations())
      await createFinding({
        submission: findingSubmission,
        document: activeFile?.id && /^[0-9a-f-]{36}$/i.test(String(activeFile.id)) ? activeFile.id : null,
        title: `${dicomInfo?.modality || 'Imagerie'}${totalSlices > 1 ? ` · coupe ${currentSlice + 1}/${totalSlices}` : ''}`,
        image,
        measurements,
      })
      setNotice('Image clé enregistrée dans le dossier')
    } catch (e) {
      setNotice(e?.response?.data?.image?.[0] || "Échec de l'enregistrement de l'image clé")
    } finally {
      setSavingFinding(false)
    }
  }, [activeFile, currentSlice, dicomInfo, findingSubmission, savingFinding, totalSlices])

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

  useDicomFollower({
    remoteAuthorsRef,
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
    renderingEngineRef,
    setAnnotationCount,
    setCurrentSlice,
    setIsInverted,
    setRemoteAuthor,
    setRemotePointer,
    viewportRef,
  })

  // --- Initialize Cornerstone & Viewport ---
  useEffect(() => {
    let mounted = true
    const engineId = `dicom-engine-${fileId}-${Date.now()}`
    const viewportId = `dicom-viewport-${fileId}`
    const toolGroupId = toolGroupIdRef.current
    const storeKey = `${fileId}|${seriesKey}`
    const registeredImageIds = []
    let detachListeners = null
    let removeRoiGuards = null

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
        let orientationKnown = false
        buffers.forEach((arrayBuffer, bufIndex) => {
          let numFrames = 1
          try {
            const dataSet = dicomParser.parseDicom(new Uint8Array(arrayBuffer))
            numFrames = parseInt(dataSet.string('x00280008') || '1', 10) || 1
            if (bufIndex === 0) orientationKnown = Boolean(dataSet.string('x00200037'))
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
        setHasOrientation(orientationKnown)
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
            toolGroup.addTool('ScaleOverlay', { scaleLocation: 'right' })
          } catch (e) {}
        }

        const arrowInstance = toolGroup.getToolInstance('ArrowAnnotate')
        if (arrowInstance) {
          configureArrowInstance(arrowInstance)
        }

        toolGroup.addViewport(viewportId, engineId)
        applyToolBindings(toolGroup, activeToolRef.current)
        try {
          if (showScaleRef.current) toolGroup.setToolEnabled('ScaleOverlay')
        } catch (e) {}
        removeRoiGuards = installRoiGuards({ element: viewportRef.current, toolGroup, viewportId })

        // Event listener for viewport changes (broadcasting when presenter)
        const element = viewportRef.current
        const handleViewportChange = () => {
          const currentVp = renderingEngineRef.current?.getViewport(viewportId)
          try {
            const zoom = currentVp?.getZoom?.()
            if (zoom) setZoomPct(Math.round(zoom * 100))
            const cam = currentVp?.getCamera?.()
            setOrientation(orientationFromCamera(cam?.viewUp, cam?.viewPlaneNormal))
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
            const all = getUserAnnotations()
            const selected = cornerstoneTools.annotation.selection.getAnnotationsSelected() || []
            setAnnotationCount(all.length)
            setSelectedCount(selected.length)
          } catch (e) {}
        }

        const pendingAnnotations = new Map()
        let annotationFlushRaf = null

        const handleAnnotationChanged = (evt) => {
          refreshAnnotationStats()
          if (!isApplyingRemoteAnnotationRef.current && evt.type === cornerstoneTools.Enums.Events.ANNOTATION_COMPLETED) {
            historyApiRef.current?.record()
          }
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
          if (!isApplyingRemoteAnnotationRef.current) historyApiRef.current?.record()
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

        // Bring back the annotations this image had before the viewport was rebuilt
        // (a follower gets the presenter's instead, through the resync request)
        if (!followRemoteRef.current) {
          loadAnnotations(storeKey).forEach((annotation) => {
            try {
              cornerstoneTools.annotation.state.addAnnotation(localizeAnnotationRef.current(annotation), element)
            } catch (e) {}
          })
          cornerstoneTools.utilities.triggerAnnotationRenderForViewportIds([viewportId])
        }

        try {
          const cam = viewport.getCamera()
          setOrientation(orientationFromCamera(cam.viewUp, cam.viewPlaneNormal))
          setZoomPct(Math.round((viewport.getZoom?.() || 1) * 100))
        } catch (e) {}

        refreshAnnotationStats()
        historyApiRef.current?.reset()

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
        removeRoiGuards?.()
      } catch (e) {}

      try {
        const all = getUserAnnotations()
        saveAnnotations(storeKey, all.map((a) => serializeAnnotationRef.current(a)))
      } catch (e) {}

      try {
        removeUserAnnotations()
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

  useViewportResize({
    renderingEngineRef,
    viewportRef,
    fileId,
    layoutKey: `${isSidebarOpen}|${showSeriesDrawer}|${showThumbnailPanel}`,
  })

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
      const all = getUserAnnotations()
      setAnnotationCount(all.length)
      setSelectedCount(0)
    } catch (e) {}
  }, [fileId])

  // --- Clear All Annotations ---
  const handleClearAllAnnotations = useCallback(() => {
    const all = getUserAnnotations()
    if (all.length === 0) return

    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    setConfirmClear(false)
    removeUserAnnotations()

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

  const authorHover = useDicomAuthorHover({ fileId, viewportRef, renderingEngineRef, remoteAuthorsRef })

  const annotationHistory = useDicomHistory({
    fileId,
    viewportRef,
    renderingEngineRef,
    serializeAnnotationRef,
    localizeAnnotationRef,
    isApplyingRemoteAnnotationRef,
    isPresenterRef,
    onBroadcastAnnotationSyncRef,
    setAnnotationCount,
  })
  historyApiRef.current = annotationHistory

  useDicomShortcuts({
    fileId,
    isPresenterRef,
    onBroadcastAnnotationSyncRef,
    renderingEngineRef,
    setAnnotationCount,
    setSelectedCount,
    setShowShortcuts,
    setPresentWarn,
    overlayOpen: showShortcuts || presentWarn || Boolean(arrowPrompt),
    promptOpen: Boolean(arrowPrompt),
    handleToolChange,
    handleReset,
    handleSliceChange,
    handleApplyWLPreset,
    toggleCine,
    totalSlices,
  })

  // Side panel: one tab at a time (slice thumbnails or the dossier's series)
  const sidePanel = showSeriesDrawer ? 'series' : showThumbnailPanel ? 'slices' : null
  const seriesCount = studiesList.reduce((acc, st) => acc + (st.total_series || st.series?.length || 0), 0)
  const openSidePanel = (tab) => {
    const next = sidePanel === tab ? null : tab
    setShowSeriesDrawer(next === 'series')
    setShowThumbnailPanel(next === 'slices')
  }
  const title = isAnonymized ? `Imagerie anonymisée #${fileId.slice(-4)}` : fileName
  const subtitle = [dicomInfo?.study_description, !isAnonymized && dicomInfo?.study_date].filter(Boolean).join(' · ')

  return (
    <div className={`dicom-viewer-container ${isPresenter ? 'is-presenter-active' : ''}`}>
      <DicomTopBar
        title={title}
        modality={dicomInfo?.modality}
        subtitle={subtitle}
        isAnonymized={isAnonymized}
        onToggleAnonymized={handleToggleAnonymized}
        sidePanel={sidePanel}
        onSidePanel={openSidePanel}
        slicesCount={totalSlices}
        seriesCount={seriesCount}
        canPresent={Boolean(onBroadcastPresenterMode)}
        isPresenter={isPresenter}
        isRemotePresenter={isRemotePresenter}
        presenterName={presenterName || ''}
        isFollowing={isFollowing}
        onToggleFollow={() => setIsFollowing((v) => !v)}
        pointerMode={pointerMode}
        onTogglePointer={() => setPointerMode((v) => !v)}
        onRequestPresent={requestPresent}
        onStopPresent={handleTogglePresenter}
        showHelp={showShortcuts}
        onToggleHelp={() => setShowShortcuts((v) => !v)}
        onClose={onClose}
        canSaveFinding={canSaveFinding}
        showSaveFinding={showSaveFinding}
        savingFinding={savingFinding}
        onSaveFinding={handleSaveFinding}
      />

      <div className="dv-body">
        <DicomToolRail
          activeTool={activeTool}
          onTool={handleToolChange}
          activePreset={activeWLPreset}
          showPresetMenu={showPresetMenu}
          onTogglePresetMenu={() => setShowPresetMenu((v) => !v)}
          onApplyPreset={handleApplyWLPreset}
          selectedCount={selectedCount}
          annotationCount={annotationCount}
          confirmClear={confirmClear}
          onDeleteSelected={handleDeleteSelected}
          onUndo={annotationHistory.undo}
          onRedo={annotationHistory.redo}
          canUndo={annotationHistory.canUndo}
          canRedo={annotationHistory.canRedo}
          onClearAll={handleClearAllAnnotations}
          onReset={handleReset}
          windowValues={currentVOI}
          onSetWindow={handleSetWindow}
          isInverted={isInverted}
          onInvert={handleToggleInvert}
          onFlip={handleFlip}
          onRotate={handleRotate}
          showScale={showScale}
          onToggleScale={handleToggleScale}
        />

        {sidePanel && (
          <DicomSidePanel
            tab={sidePanel}
            onTab={openSidePanel}
            onClose={() => openSidePanel(sidePanel)}
            slicesCount={totalSlices}
            seriesCount={seriesCount}
            imageIds={imageIdsRef.current}
            currentSlice={currentSlice}
            onSliceSelect={handleSliceChange}
            voiRange={
              currentVOI.windowWidth !== null
                ? {
                    lower: currentVOI.windowCenter - currentVOI.windowWidth / 2,
                    upper: currentVOI.windowCenter + currentVOI.windowWidth / 2,
                  }
                : null
            }
            studies={studiesList}
            activeSeriesUid={activeSeriesUid}
            onSelectSeries={handleSelectSeries}
          />
        )}

        <div
          className={`dicom-viewport-wrapper ${activeTool === 'Eraser' ? 'is-eraser-active' : ''}`}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="dicom-viewport-main">
            {loading && (
              <div className="dicom-loading" role="status">
                <div className="loading-spinner" />
                <p>
                  Chargement de l'imagerie…
                  {loadProgress ? ` ${loadProgress.done}/${loadProgress.total} coupes` : ''}
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
                <AlertTriangle size={28} />
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
              style={{ width: '100%', height: '100%', visibility: loading || error ? 'hidden' : 'visible' }}
            />

            {authorHover && (
              <div className="dv-author-tip" style={{ left: authorHover.x + 14, top: authorHover.y + 14, borderColor: authorHover.color }} role="status">
                <span className="dv-author-dot" style={{ background: authorHover.color }} /> {authorHover.name}
              </div>
            )}

            {dicomInfo && !loading && !error && (
              <DicomHud
                info={dicomInfo}
                isAnonymized={isAnonymized}
                voi={currentVOI}
                activePreset={activeWLPreset}
                zoomPct={zoomPct}
                isPresenter={isPresenter}
                isRemotePresenter={isRemotePresenter}
                isFollowing={isFollowing}
                presenterName={presenterName || ''}
                remoteAuthor={remoteAuthor}
                orientation={hasOrientation ? orientation : null}
              />
            )}

            {totalSlices > 1 && !loading && !error && (
              <DicomSliceBar
                current={currentSlice}
                total={totalSlices}
                onChange={handleSliceChange}
                playing={isPlayingCine}
                onTogglePlay={toggleCine}
                fps={cineFps}
                onFps={setCineFps}
              />
            )}

            {activeTool === 'Eraser' && !loading && !error && (
              <div className="dicom-eraser-hint">
                <Eraser size={14} />
                <span>Gomme : cliquez sur une mesure pour l'effacer</span>
              </div>
            )}

            {notice && (
              <div className="dicom-notice" role="status" aria-live="polite">{notice}</div>
            )}

            {remotePointer && remotePointer.slice === currentSlice && (
              <div className="dicom-remote-pointer" style={{ left: remotePointer.x, top: remotePointer.y }} aria-hidden="true" />
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
          </div>
        </div>
      </div>
    </div>
  )
}
