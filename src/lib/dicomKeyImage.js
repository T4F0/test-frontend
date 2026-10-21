// Capture the Cornerstone viewport (image canvas + SVG annotation layer) as a compact JPEG data URL.

const MAX_SIDE = 1024

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

export async function captureViewport(element) {
  const canvas = element?.querySelector('canvas')
  if (!canvas || !canvas.width || !canvas.height) throw new Error('Aucune image à capturer')
  const scale = Math.min(1, MAX_SIDE / Math.max(canvas.width, canvas.height))
  const out = document.createElement('canvas')
  out.width = Math.round(canvas.width * scale)
  out.height = Math.round(canvas.height * scale)
  const ctx = out.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.drawImage(canvas, 0, 0, out.width, out.height)

  // Annotations live in an SVG layer on top of the canvas; draw it too when the browser allows.
  const svg = element.querySelector('svg')
  if (svg) {
    try {
      const clone = svg.cloneNode(true)
      const rect = svg.getBoundingClientRect()
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      clone.setAttribute('width', rect.width)
      clone.setAttribute('height', rect.height)
      const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`
      ctx.drawImage(await loadImage(url), 0, 0, out.width, out.height)
    } catch {
      /* the image alone is still useful */
    }
  }
  return out.toDataURL('image/jpeg', 0.85)
}
