// Tiny event-based toast API usable from components and plain hooks alike.
let nextId = 1
const listeners = new Set()

export function subscribeToasts(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function push(kind, message, options = {}) {
  const toast = { id: nextId++, kind, message: String(message), duration: options.duration ?? (kind === 'error' ? 8000 : 4500) }
  listeners.forEach((fn) => fn(toast))
  return toast.id
}

export const toast = {
  success: (message, options) => push('success', message, options),
  error: (message, options) => push('error', message, options),
  info: (message, options) => push('info', message, options),
}
