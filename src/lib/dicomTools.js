import { Contrast, Hand, Search, Ruler, TriangleRight, Circle, RectangleHorizontal, ArrowUpRight, Eraser } from 'lucide-react'
import * as cornerstoneTools from '@cornerstonejs/tools'

export const WL_PRESETS = [
  { name: 'Abdomen', label: 'Abdomen (Tissus mous)', windowWidth: 400, windowCenter: 50 },
  { name: 'Poumon', label: 'Poumon (Parenchyme)', windowWidth: 1500, windowCenter: -600 },
  { name: 'Os', label: 'Os (Squelette)', windowWidth: 2500, windowCenter: 480 },
  { name: 'Cerveau', label: 'Cerveau (Neuro)', windowWidth: 80, windowCenter: 40 },
  { name: 'Foie', label: 'Foie (Hépatique)', windowWidth: 150, windowCenter: 30 },
  { name: 'Médiastin', label: 'Médiastin (Thorax)', windowWidth: 350, windowCenter: 50 },
]

export const TOOLS = [
  { name: 'WindowLevel', toolClass: 'WindowLevelTool', icon: Contrast, label: 'Contraste', group: 'view', key: 'w' },
  { name: 'Pan', toolClass: 'PanTool', icon: Hand, label: 'Déplacer', group: 'view', key: 'p' },
  { name: 'Zoom', toolClass: 'ZoomTool', icon: Search, label: 'Zoomer', group: 'view', key: 'z' },
  { name: 'Length', toolClass: 'LengthTool', icon: Ruler, label: 'Mesurer', group: 'measure', key: 'l' },
  { name: 'Angle', toolClass: 'AngleTool', icon: TriangleRight, label: 'Angle', group: 'measure', key: 'a' },
  { name: 'EllipticalROI', toolClass: 'EllipticalROITool', icon: Circle, label: 'Ellipse', group: 'measure', key: 'o' },
  { name: 'RectangleROI', toolClass: 'RectangleROITool', icon: RectangleHorizontal, label: 'Rectangle', group: 'measure', key: 'b' },
  { name: 'ArrowAnnotate', toolClass: 'ArrowAnnotateTool', icon: ArrowUpRight, label: 'Flèche', group: 'annotate', key: 'f' },
  { name: 'Eraser', toolClass: 'EraserTool', icon: Eraser, label: 'Gomme', group: 'annotate', key: 'e' },
]

export const TOOL_GROUPS = [
  { id: 'view', label: 'Affichage' },
  { id: 'measure', label: 'Mesures' },
  { id: 'annotate', label: 'Annotations' },
]

export const CINE_SPEEDS = [5, 10, 15, 25]

export const SHORTCUTS = [
  ['W / P / Z', 'Contraste / Déplacer / Zoom'],
  ['L / A / O / B', 'Longueur / Angle / ROI ellipse / ROI rectangle'],
  ['F / E', 'Flèche / Gomme'],
  ['1 – 6', 'Préréglages de fenêtrage'],
  ['↑ ↓ / Molette', 'Coupe précédente / suivante'],
  ['Espace', 'Lecture / pause (ciné)'],
  ['R / Double-clic', 'Réinitialiser l’affichage'],
  ['Clic droit + glisser / Ctrl + molette', 'Zoom'],
  ['Maj + glisser', 'Nouvelle forme même sur une existante'],
  ['Suppr', 'Supprimer la sélection'],
  ['Échap', 'Désélectionner / fermer'],
  ['?', 'Afficher cette aide'],
]

// Mouse/touch bindings: primary button drives the active tool; right-drag and Ctrl+wheel always zoom;
// wheel and middle-drag scroll the stack; two-finger pinch zooms, three-finger drag scrolls.
export function applyToolBindings(toolGroup, activeName) {
  const { MouseBindings, KeyboardBindings } = cornerstoneTools.Enums
  TOOLS.forEach(({ name }) => {
    try {
      // Cornerstone only drops the plain primary binding by default: stale modifier bindings would keep the tool active
      toolGroup.setToolPassive(name, { removeAllBindings: true })
    } catch (e) {}
  })

  const zoomBindings = [
    { mouseButton: MouseBindings.Secondary },
    { mouseButton: MouseBindings.Wheel, modifierKey: KeyboardBindings.Ctrl },
    { numTouchPoints: 2 },
  ]
  try {
    if (activeName === 'Zoom') {
      toolGroup.setToolActive('Zoom', { bindings: [{ mouseButton: MouseBindings.Primary }, ...zoomBindings] })
    } else {
      // Shift + drag runs the same tool; the ROI guards use it to start a new shape over an existing one
      toolGroup.setToolActive(activeName, {
        bindings: [
          { mouseButton: MouseBindings.Primary },
          { mouseButton: MouseBindings.Primary, modifierKey: KeyboardBindings.Shift },
        ],
      })
      toolGroup.setToolActive('Zoom', { bindings: zoomBindings })
    }
  } catch (e) {}
  try {
    toolGroup.setToolActive('StackScroll', {
      bindings: [
        { mouseButton: MouseBindings.Auxiliary },
        { mouseButton: MouseBindings.Wheel },
        { numTouchPoints: 3 },
      ],
    })
  } catch (e) {}
}

// Keep the ArrowAnnotate text box and leader line anchored to the tail of the arrow, never the head.
// Installed on the tool instance (see configureArrowInstance), so `this` is the tool.
export function renderArrowTextBox(options) {
  const { canvasCoordinates, annotation, enabledElement } = options
  if (!canvasCoordinates || canvasCoordinates.length < 2 || !enabledElement?.viewport) {
    return cornerstoneTools.AnnotationTool.prototype.renderLinkedTextBoxAnnotation.call(this, options)
  }

  const isArrowFirst = Boolean(this.configuration?.arrowFirst)
  const tailCanvas = isArrowFirst ? canvasCoordinates[1] : canvasCoordinates[0]
  const headCanvas = isArrowFirst ? canvasCoordinates[0] : canvasCoordinates[1]

  const dx = tailCanvas[0] - headCanvas[0]
  const dy = tailCanvas[1] - headCanvas[1]
  const len = Math.hypot(dx, dy)
  const normX = len > 0.001 ? dx / len : -1
  const normY = len > 0.001 ? dy / len : 0
  const offset = 28
  const initialTextBoxCanvas = [tailCanvas[0] + normX * offset, tailCanvas[1] + normY * offset]

  const { data } = annotation
  if (data?.handles && (!data.handles.textBox || !data.handles.textBox.hasMoved)) {
    const worldPos = enabledElement.viewport.canvasToWorld(initialTextBoxCanvas)
    data.handles.textBox = {
      hasMoved: false,
      worldPosition: worldPos,
      worldBoundingBox: {
        topLeft: worldPos,
        topRight: worldPos,
        bottomLeft: worldPos,
        bottomRight: worldPos,
      },
    }
  }

  return cornerstoneTools.AnnotationTool.prototype.renderLinkedTextBoxAnnotation.call(this, {
    ...options,
    canvasCoordinates: [tailCanvas],
    placementPoints: [initialTextBoxCanvas],
  })
}
