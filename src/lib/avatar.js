// Stable, well-spread avatar colour per person. A plain string hash gives neighbouring ids (u1, u2, u3...)
// neighbouring hues, so the hash is scrambled and mapped onto a curated set of clearly distinct hues.

const HUES = [235, 160, 28, 330, 195, 275, 350, 100]

export function avatarHue(seed) {
  let hash = 2166136261
  String(seed ?? '').split('').forEach((ch) => {
    hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619)
  })
  hash ^= hash >>> 15
  hash = Math.imul(hash, 2246822507)
  hash ^= hash >>> 13
  return HUES[(hash >>> 0) % HUES.length]
}

/** "Sara Khelifi" -> "SK", "karim" -> "K" */
export function initialsOf(name) {
  return (
    (name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?'
  )
}
