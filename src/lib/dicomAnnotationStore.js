// Annotations survive anything that rebuilds the Cornerstone viewport: toggling anonymisation, switching
// series and coming back, closing and reopening the same image. They are kept per image, serialised with
// the stack index of the slice they sit on (blob image ids change on every reload), and capped in size.

const MAX_ENTRIES = 30
const store = new Map()

export function saveAnnotations(key, annotations) {
  if (!key) return
  store.delete(key)
  if (annotations && annotations.length > 0) {
    store.set(key, annotations)
    while (store.size > MAX_ENTRIES) store.delete(store.keys().next().value)
  }
}

export function loadAnnotations(key) {
  return (key && store.get(key)) || []
}

export function clearAnnotations(key) {
  store.delete(key)
}
