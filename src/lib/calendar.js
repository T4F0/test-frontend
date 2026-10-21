// Month-grid helpers for the meetings calendar. Weeks start on Monday.

const pad = (n) => String(n).padStart(2, '0')

export const dayKey = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 6 weeks x 7 days of Date objects covering the month containing `anchor`. */
export function monthGrid(anchor) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset)
  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d)),
  )
}

/** ISO range (local dates) covering the whole visible grid, for the API filter. */
export function gridRange(anchor) {
  const grid = monthGrid(anchor)
  return { after: dayKey(grid[0][0]), before: dayKey(grid[5][6]) }
}

export function shiftMonth(anchor, delta) {
  return new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1)
}

/** Map of dayKey -> meetings sorted by time. */
export function groupByDay(meetings) {
  const map = {}
  for (const m of meetings) {
    if (!m.scheduled_date) continue
    ;(map[dayKey(m.scheduled_date)] ||= []).push(m)
  }
  for (const list of Object.values(map)) {
    list.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
  }
  return map
}
