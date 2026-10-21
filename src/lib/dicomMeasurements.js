// Turn Cornerstone annotations into a short, printable list of measurements.

const TOOL_LABELS = {
  Length: 'Longueur',
  Height: 'Hauteur',
  Width: 'Largeur',
  Angle: 'Angle',
  CobbAngle: 'Angle de Cobb',
  EllipticalROI: 'ROI elliptique',
  RectangleROI: 'ROI rectangulaire',
  CircleROI: 'ROI circulaire',
  Bidirectional: 'Bidirectionnel',
  Probe: 'Sonde',
  ArrowAnnotate: 'Flèche',
}

const round = (n, digits = 1) => (Number.isFinite(n) ? String(Math.round(n * 10 ** digits) / 10 ** digits) : '')

// cachedStats is keyed by the image id the annotation sits on
const firstStats = (annotation) => Object.values(annotation?.data?.cachedStats || {})[0] || {}

export function extractMeasurements(annotations = []) {
  const rows = []
  for (const a of annotations) {
    const tool = a?.metadata?.toolName
    if (!tool) continue
    const label = TOOL_LABELS[tool] || tool
    const s = firstStats(a)
    if (tool === 'ArrowAnnotate') {
      const text = a.data?.label || a.data?.text
      if (text) rows.push({ tool, label: `${label} : ${text}`, value: '', unit: '' })
      continue
    }
    if (Number.isFinite(s.length)) rows.push({ tool, label, value: round(s.length), unit: s.unit || 'mm' })
    else if (Number.isFinite(s.angle)) rows.push({ tool, label, value: round(s.angle), unit: '°' })
    else if (Number.isFinite(s.area)) {
      rows.push({ tool, label, value: round(s.area), unit: s.areaUnit || 'mm²' })
      if (Number.isFinite(s.mean)) rows.push({ tool, label: `${label} (moyenne)`, value: round(s.mean), unit: s.modalityUnit || '' })
    } else if (Number.isFinite(s.length1) && Number.isFinite(s.length2)) {
      rows.push({ tool, label, value: `${round(s.length1)} × ${round(s.length2)}`, unit: s.unit || 'mm' })
    }
  }
  return rows
}
