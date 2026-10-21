// Which annotation is under the pointer? Distances are measured to the polyline through an annotation's
// handle points (so a long line is hit along its length, not just at its ends).

function distanceToSegment(p, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSq))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

export function distanceToPolyline(point, points, closed = false) {
  if (!points.length) return Infinity
  if (points.length === 1) return Math.hypot(point[0] - points[0][0], point[1] - points[0][1])
  let best = Infinity
  const last = closed ? points.length : points.length - 1
  for (let i = 0; i < last; i++) {
    best = Math.min(best, distanceToSegment(point, points[i], points[(i + 1) % points.length]))
  }
  return best
}

/** entries: [{ uid, points: [[x, y], ...], closed? }] in canvas pixels. Returns the closest uid within `radius`. */
export function nearestAnnotation(entries, pointer, radius = 14) {
  let best = null
  let bestDistance = radius
  for (const entry of entries) {
    const d = distanceToPolyline(pointer, entry.points, entry.closed)
    if (d <= bestDistance) {
      best = entry.uid
      bestDistance = d
    }
  }
  return best
}
