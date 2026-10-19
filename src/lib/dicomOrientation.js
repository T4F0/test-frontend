// Patient-orientation letters (R/L/A/P/S/I) for the four edges of the image, from the viewport camera.
// DICOM world space is LPS: +x = patient Left, +y = Posterior, +z = Superior.

const EPSILON = 0.35 // ignore components weaker than ~20° off-axis so oblique slices show one clean letter

function letterFor(v) {
  const [x, y, z] = v
  const ax = Math.abs(x)
  const ay = Math.abs(y)
  const az = Math.abs(z)
  const max = Math.max(ax, ay, az)
  if (max < EPSILON) return ''
  if (max === ax) return x > 0 ? 'L' : 'R'
  if (max === ay) return y > 0 ? 'P' : 'A'
  return z > 0 ? 'S' : 'I'
}

const negate = (v) => [-v[0], -v[1], -v[2]]
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

/** @param viewUp screen-up vector in world space, @param normal view-plane normal */
export function orientationFromCamera(viewUp, normal) {
  if (!viewUp || !normal) return null
  const right = cross(viewUp, normal)
  return {
    top: letterFor(viewUp),
    bottom: letterFor(negate(viewUp)),
    left: letterFor(negate(right)),
    right: letterFor(right),
  }
}
