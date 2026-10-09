import * as cornerstone from '@cornerstonejs/core'
import * as cornerstoneTools from '@cornerstonejs/tools'
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader'

let initialized = false

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
  cornerstoneTools.addTool(cornerstoneTools.EllipticalROITool)
  cornerstoneTools.addTool(cornerstoneTools.StackScrollTool)

  initialized = true
}
