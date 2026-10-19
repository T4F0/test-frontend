import * as cornerstone from '@cornerstonejs/core'
import * as cornerstoneTools from '@cornerstonejs/tools'
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader'

let initialized = false

// Custom Eraser Tool for deleting measurements, angles, and annotations
export class CustomEraserTool extends cornerstoneTools.BaseTool {
  constructor(toolProps = {}, defaultToolProps = { supportedInteractionTypes: ['Mouse', 'Touch'] }) {
    super(toolProps, defaultToolProps)
    this.preMouseDownCallback = (evt) => this._deleteNearbyAnnotations(evt, 'mouse')
    this.preTouchStartCallback = (evt) => this._deleteNearbyAnnotations(evt, 'touch')
  }

  _deleteNearbyAnnotations(evt, interactionType) {
    // Only allow primary (left) click to delete annotations - right click triggers nothing
    if (interactionType === 'mouse' && evt.detail?.event && evt.detail.event.button !== 0) {
      return false
    }
    const { renderingEngineId, viewportId, element, currentPoints } = evt.detail
    const enabledElement = cornerstone.getEnabledElement(element)
    if (!enabledElement) return false

    // Check near point with generous 20px hit-area (covers lines, endpoints/handles, and text labels)
    let annotation = cornerstoneTools.utilities.getAnnotationNearPointOnEnabledElement(
      enabledElement,
      currentPoints.canvas,
      20
    )

    // Fallback: check registered tool instances manually
    if (!annotation) {
      const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroupForViewport(viewportId, renderingEngineId)
      if (toolGroup) {
        const tools = toolGroup._toolInstances
        for (const toolName in tools) {
          const toolInstance = tools[toolName]
          const annotations = cornerstoneTools.annotation.state.getAnnotations(toolName, element)
          if (!annotations || !annotations.length) continue
          for (const ann of annotations) {
            const isNear =
              (typeof toolInstance.isPointNearTool === 'function' &&
                toolInstance.isPointNearTool(element, ann, currentPoints.canvas, 25, interactionType)) ||
              (typeof toolInstance.getHandleNearImagePoint === 'function' &&
                toolInstance.getHandleNearImagePoint(element, ann, currentPoints.canvas, 25))
            if (isNear) {
              annotation = ann
              break
            }
          }
          if (annotation) break
        }
      }
    }

    // Direct fallback: check distance to handle points and textBox bounding box
    if (!annotation) {
      try {
        const allAnnotations = cornerstoneTools.annotation.state.getAllAnnotations() || []
        const { viewport } = enabledElement
        for (const ann of allAnnotations) {
          const points = ann.data?.handles?.points
          if (points && viewport) {
            for (const pt of points) {
              const canvasPt = viewport.worldToCanvas(pt)
              const dist = Math.hypot(canvasPt[0] - currentPoints.canvas[0], canvasPt[1] - currentPoints.canvas[1])
              if (dist <= 30) {
                annotation = ann
                break
              }
            }
          }
          if (annotation) break
          const textBox = ann.data?.handles?.textBox
          if (textBox?.worldBoundingBox && viewport) {
            const topLeft = viewport.worldToCanvas(textBox.worldBoundingBox.topLeft)
            const bottomRight = viewport.worldToCanvas(textBox.worldBoundingBox.bottomRight)
            if (
              currentPoints.canvas[0] >= Math.min(topLeft[0], bottomRight[0]) - 15 &&
              currentPoints.canvas[0] <= Math.max(topLeft[0], bottomRight[0]) + 15 &&
              currentPoints.canvas[1] >= Math.min(topLeft[1], bottomRight[1]) - 15 &&
              currentPoints.canvas[1] <= Math.max(topLeft[1], bottomRight[1]) + 15
            ) {
              annotation = ann
              break
            }
          }
        }
      } catch (e) {}
    }

    if (annotation) {
      cornerstoneTools.annotation.selection.deselectAnnotation(annotation.annotationUID)
      cornerstoneTools.annotation.state.removeAnnotation(annotation.annotationUID)
      const vp = enabledElement.viewport
      if (vp) {
        cornerstoneTools.utilities.triggerAnnotationRenderForViewportIds([viewportId])
        vp.render()
      }
      evt.preventDefault()
      return true
    }
    return false
  }
}
CustomEraserTool.toolName = 'Eraser'

export async function initCornerstone() {
  if (initialized) return

  // Initialize Cornerstone3D core rendering engine
  await cornerstone.init()

  // Initialize the DICOM image loader
  try {
    const maxWorkers =
      typeof navigator !== 'undefined' && navigator.hardwareConcurrency
        ? Math.min(navigator.hardwareConcurrency, 4)
        : 2
    cornerstoneDICOMImageLoader.init({
      maxWebWorkers: maxWorkers,
    })
  } catch (err) {
    console.warn('Cornerstone DICOM image loader initialization warning:', err)
  }

  // Register and initialize tools
  cornerstoneTools.init()
  cornerstoneTools.addTool(cornerstoneTools.WindowLevelTool)
  cornerstoneTools.addTool(cornerstoneTools.PanTool)
  cornerstoneTools.addTool(cornerstoneTools.ZoomTool)
  cornerstoneTools.addTool(cornerstoneTools.LengthTool)
  cornerstoneTools.addTool(cornerstoneTools.AngleTool)
  cornerstoneTools.addTool(cornerstoneTools.ArrowAnnotateTool)
  cornerstoneTools.addTool(cornerstoneTools.EllipticalROITool)
  cornerstoneTools.addTool(cornerstoneTools.RectangleROITool)
  cornerstoneTools.addTool(cornerstoneTools.StackScrollTool)
  cornerstoneTools.addTool(cornerstoneTools.ScaleOverlayTool)
  cornerstoneTools.addTool(CustomEraserTool)

  initialized = true
}
