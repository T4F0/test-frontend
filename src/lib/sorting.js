// Client-side sorting for lists that are loaded in full.

const collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' })

/** Cycle one column: ascending -> descending -> unsorted. */
export function nextSort(current, key) {
  if (!current || current.key !== key) return { key, dir: 'asc' }
  if (current.dir === 'asc') return { key, dir: 'desc' }
  return null
}

function compareValues(a, b) {
  const aEmpty = a === null || a === undefined || a === ''
  const bEmpty = b === null || b === undefined || b === ''
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1 // empty values always last
  if (bEmpty) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (a instanceof Date && b instanceof Date) return a - b
  return collator.compare(String(a), String(b))
}

/**
 * @param rows    array to sort (not mutated)
 * @param sort    { key, dir } | null
 * @param getters { [key]: (row) => comparable value }
 */
export function sortRows(rows, sort, getters = {}) {
  if (!sort) return rows
  const get = getters[sort.key] || ((row) => row[sort.key])
  const factor = sort.dir === 'desc' ? -1 : 1
  return rows
    .map((row, index) => ({ row, index }))
    .sort((x, y) => {
      const a = get(x.row)
      const b = get(y.row)
      const aEmpty = a === null || a === undefined || a === ''
      const bEmpty = b === null || b === undefined || b === ''
      // keep "empty last" in both directions
      if (aEmpty !== bEmpty) return aEmpty ? 1 : -1
      return compareValues(a, b) * factor || x.index - y.index
    })
    .map((x) => x.row)
}

export function ariaSort(sort, key) {
  if (!sort || sort.key !== key) return 'none'
  return sort.dir === 'asc' ? 'ascending' : 'descending'
}
