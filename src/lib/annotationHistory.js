// Snapshot-based undo/redo for viewer annotations. Each entry is the full list of annotations after an
// action; going back restores the previous list, so add, move, delete and clear-all are all undoable.

const clone = (value) => JSON.parse(JSON.stringify(value))

export function createHistory(limit = 50) {
  let past = []
  let future = []
  let current = []

  return {
    /** Set the baseline (after loading an image) and forget everything else. */
    reset(snapshot = []) {
      past = []
      future = []
      current = clone(snapshot)
    },
    /** Call after every user action with the new full annotation list. */
    record(snapshot) {
      const next = clone(snapshot)
      if (JSON.stringify(next) === JSON.stringify(current)) return false
      past.push(current)
      if (past.length > limit) past.shift()
      current = next
      future = []
      return true
    },
    undo() {
      if (past.length === 0) return null
      future.push(current)
      current = past.pop()
      return clone(current)
    },
    redo() {
      if (future.length === 0) return null
      past.push(current)
      current = future.pop()
      return clone(current)
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  }
}
