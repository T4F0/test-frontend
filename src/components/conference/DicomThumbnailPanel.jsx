import { useEffect, useRef, useCallback, useMemo } from 'react'
import * as cornerstone from '@cornerstonejs/core'
import { Layers } from 'lucide-react'

const THUMBNAIL_WIDTH = 120
const THUMBNAIL_HEIGHT = 120
const OBSERVER_ROOT_MARGIN = '200px 0px' // pre-render 200px buffer above/below

/**
 * DicomThumbnailPanel — PowerPoint-style left-side thumbnail navigation panel.
 *
 * Renders a scrollable list of DICOM slice/frame thumbnails with lazy loading
 * via IntersectionObserver, an in-memory pixel cache, active-slice highlighting,
 * and click-to-navigate interaction.
 *
 * @param {Object}   props
 * @param {string[]} props.imageIds       - Cornerstone image IDs for every frame
 * @param {number}   props.currentSlice   - 0-based active slice index
 * @param {Function} props.onSliceSelect  - Callback(index) when a thumbnail is clicked
 * @param {number}   props.totalSlices    - Total number of slices/frames
 * @param {Object|null} props.voiRange    - Current VOI range {lower, upper} for W/L sync
 */
export default function DicomThumbnailPanel({
  imageIds,
  currentSlice,
  onSliceSelect,
  totalSlices,
  voiRange,
}) {
  const panelRef = useRef(null)
  const thumbnailCacheRef = useRef(new Map()) // Map<imageId, ImageData>
  const observerRef = useRef(null)
  const canvasRefsMap = useRef(new Map()) // Map<index, HTMLCanvasElement>
  const mountedRef = useRef(true)
  const lastVoiRef = useRef(voiRange)
  const voiRangeRef = useRef(voiRange)
  voiRangeRef.current = voiRange

  // Track which thumbnails are currently being loaded to avoid duplicate work
  const loadingSetRef = useRef(new Set())

  // ----- Thumbnail rendering logic -----
  const renderThumbnail = useCallback(async (imageId, index) => {
    if (!mountedRef.current) return
    if (loadingSetRef.current.has(index)) return
    loadingSetRef.current.add(index)

    try {
      const image = await cornerstone.imageLoader.loadImage(imageId)
      if (!mountedRef.current) return

      const canvas = canvasRefsMap.current.get(index)
      if (!canvas) return

      // Determine source dimensions
      const srcW = image.width || image.columns || THUMBNAIL_WIDTH
      const srcH = image.height || image.rows || THUMBNAIL_HEIGHT

      // Keep aspect ratio, fit inside THUMBNAIL_WIDTH x THUMBNAIL_HEIGHT
      const scale = Math.min(THUMBNAIL_WIDTH / srcW, THUMBNAIL_HEIGHT / srcH)
      const drawW = Math.round(srcW * scale)
      const drawH = Math.round(srcH * scale)

      canvas.width = THUMBNAIL_WIDTH
      canvas.height = THUMBNAIL_HEIGHT

      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT)

      // Try to get pixel data from the image and render it
      if (image.getCanvas) {
        // Cornerstone image has a pre-rendered canvas
        const srcCanvas = image.getCanvas()
        if (srcCanvas) {
          const offX = Math.round((THUMBNAIL_WIDTH - drawW) / 2)
          const offY = Math.round((THUMBNAIL_HEIGHT - drawH) / 2)
          ctx.drawImage(srcCanvas, offX, offY, drawW, drawH)
          thumbnailCacheRef.current.set(imageId, ctx.getImageData(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT))
          canvas.dataset.loaded = 'true'
          return
        }
      }

      // Fallback: render from pixel data
      if (image.getPixelData) {
        const pixelData = image.getPixelData()
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = srcW
        tempCanvas.height = srcH
        const tempCtx = tempCanvas.getContext('2d')
        const imgData = tempCtx.createImageData(srcW, srcH)

        // Apply VOI range (window/level) to the pixel data
        const voi = voiRangeRef.current || { lower: image.minPixelValue || 0, upper: image.maxPixelValue || 255 }
        const wl = voi.lower
        const ww = voi.upper - voi.lower || 1

        if (pixelData.length >= srcW * srcH) {
          for (let i = 0; i < srcW * srcH; i++) {
            let val = ((pixelData[i] - wl) / ww) * 255
            val = Math.max(0, Math.min(255, val))
            imgData.data[i * 4] = val
            imgData.data[i * 4 + 1] = val
            imgData.data[i * 4 + 2] = val
            imgData.data[i * 4 + 3] = 255
          }
        }

        tempCtx.putImageData(imgData, 0, 0)
        const offX = Math.round((THUMBNAIL_WIDTH - drawW) / 2)
        const offY = Math.round((THUMBNAIL_HEIGHT - drawH) / 2)
        ctx.drawImage(tempCanvas, offX, offY, drawW, drawH)
        thumbnailCacheRef.current.set(imageId, ctx.getImageData(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT))
        canvas.dataset.loaded = 'true'
      }
    } catch (err) {
      // Silently fail — thumbnail will stay as skeleton
      console.warn(`Thumbnail render failed for frame ${index}:`, err)
    } finally {
      loadingSetRef.current.delete(index)
    }
  }, [])

  // ----- Draw from cache -----
  const drawFromCache = useCallback((imageId, index) => {
    const cached = thumbnailCacheRef.current.get(imageId)
    const canvas = canvasRefsMap.current.get(index)
    if (!cached || !canvas) return false

    canvas.width = THUMBNAIL_WIDTH
    canvas.height = THUMBNAIL_HEIGHT
    const ctx = canvas.getContext('2d')
    ctx.putImageData(cached, 0, 0)
    canvas.dataset.loaded = 'true'
    return true
  }, [])

  // ----- IntersectionObserver setup -----
  useEffect(() => {
    if (!panelRef.current || !imageIds || imageIds.length === 0) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.dataset.index, 10)
            if (isNaN(index) || index < 0 || index >= imageIds.length) return

            const imageId = imageIds[index]
            // Try cache first
            if (!drawFromCache(imageId, index)) {
              renderThumbnail(imageId, index)
            }
          }
        })
      },
      {
        root: panelRef.current,
        rootMargin: OBSERVER_ROOT_MARGIN,
        threshold: 0,
      }
    )

    // Observe all thumbnail placeholders
    const items = panelRef.current.querySelectorAll('.dicom-thumb-item')
    items.forEach((item) => observerRef.current.observe(item))

    return () => {
      observerRef.current?.disconnect()
    }
  }, [imageIds, drawFromCache, renderThumbnail])

  // ----- Re-render visible thumbnails when VOI changes -----
  useEffect(() => {
    const prevVoi = lastVoiRef.current
    lastVoiRef.current = voiRange

    // Only re-render if VOI actually changed
    if (
      voiRange &&
      prevVoi &&
      Math.abs((voiRange.lower || 0) - (prevVoi.lower || 0)) < 1 &&
      Math.abs((voiRange.upper || 0) - (prevVoi.upper || 0)) < 1
    ) {
      return
    }

    // Clear cache and re-render visible thumbnails
    thumbnailCacheRef.current.clear()

    if (!panelRef.current || !imageIds || imageIds.length === 0) return

    const items = panelRef.current.querySelectorAll('.dicom-thumb-item')
    items.forEach((item) => {
      const canvas = item.querySelector('canvas')
      if (canvas && canvas.dataset.loaded === 'true') {
        const index = parseInt(item.dataset.index, 10)
        if (!isNaN(index) && index >= 0 && index < imageIds.length) {
          canvas.dataset.loaded = 'false'
          renderThumbnail(imageIds[index], index)
        }
      }
    })
  }, [voiRange, imageIds, renderThumbnail])

  // ----- Scroll active thumbnail into view -----
  useEffect(() => {
    if (!panelRef.current) return
    const activeItem = panelRef.current.querySelector(`.dicom-thumb-item[data-index="${currentSlice}"]`)
    if (activeItem) {
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentSlice])

  // ----- Keyboard navigation -----
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        if (currentSlice > 0) onSliceSelect(currentSlice - 1)
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        if (currentSlice < totalSlices - 1) onSliceSelect(currentSlice + 1)
      } else if (e.key === 'Home') {
        e.preventDefault()
        onSliceSelect(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        onSliceSelect(totalSlices - 1)
      }
    },
    [currentSlice, onSliceSelect, totalSlices]
  )

  // ----- Canvas ref registration callback -----
  const setCanvasRef = useCallback((index, el) => {
    if (el) {
      canvasRefsMap.current.set(index, el)
    }
  }, [])

  // ----- Cleanup -----
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      thumbnailCacheRef.current.clear()
      canvasRefsMap.current.clear()
      loadingSetRef.current.clear()
    }
  }, [])

  // ----- Build thumbnail items array -----
  const thumbnailItems = useMemo(() => {
    if (!imageIds || imageIds.length === 0) return []
    return imageIds.map((_, index) => index)
  }, [imageIds])

  if (!imageIds || imageIds.length <= 1) return null

  return (
    <div
      className="dicom-thumbnail-panel"
      ref={panelRef}
      role="listbox"
      aria-label={`Navigateur de coupes — ${totalSlices} coupes`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="dicom-thumbnail-panel-header">
        <Layers size={13} />
        <span>Coupes</span>
        <span className="dicom-thumbnail-count">{totalSlices}</span>
      </div>

      <div className="dicom-thumbnail-list">
        {thumbnailItems.map((index) => {
          const isActive = index === currentSlice
          return (
            <div
              key={index}
              className={`dicom-thumb-item ${isActive ? 'is-active' : ''}`}
              data-index={index}
              role="option"
              aria-selected={isActive}
              aria-label={`Coupe ${index + 1} sur ${totalSlices}`}
              onClick={() => onSliceSelect(index)}
              title={`Coupe ${index + 1} / ${totalSlices}`}
            >
              <div className="dicom-thumb-canvas-wrap">
                <canvas
                  ref={(el) => setCanvasRef(index, el)}
                  className="dicom-thumb-canvas"
                  width={THUMBNAIL_WIDTH}
                  height={THUMBNAIL_HEIGHT}
                />
                <div className="dicom-thumb-skeleton" />
              </div>
              <span className="dicom-thumb-label">#{index + 1}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
