import { test } from 'node:test'
import assert from 'node:assert/strict'
import { monthGrid, gridRange, shiftMonth, groupByDay, dayKey } from './calendar.js'

test('monthGrid starts on a Monday and has 6 full weeks', () => {
  const grid = monthGrid(new Date(2026, 10, 15))
  assert.equal(grid.length, 6)
  assert.ok(grid.every((w) => w.length === 7))
  assert.equal(grid[0][0].getDay(), 1)
  assert.equal(dayKey(grid[0][0]), '2026-10-26')
  assert.equal(dayKey(grid[5][6]), '2026-12-06')
})

test('gridRange spans the visible grid', () => {
  assert.deepEqual(gridRange(new Date(2026, 10, 1)), { after: '2026-10-26', before: '2026-12-06' })
})

test('shiftMonth crosses year boundaries', () => {
  const d = shiftMonth(new Date(2026, 11, 20), 1)
  assert.equal(d.getFullYear(), 2027)
  assert.equal(d.getMonth(), 0)
})

test('groupByDay buckets and sorts by time', () => {
  const g = groupByDay([
    { id: 1, scheduled_date: new Date(2026, 10, 3, 15).toISOString() },
    { id: 2, scheduled_date: new Date(2026, 10, 3, 9).toISOString() },
    { id: 3, scheduled_date: new Date(2026, 10, 4, 9).toISOString() },
  ])
  assert.deepEqual(g['2026-11-03'].map((m) => m.id), [2, 1])
  assert.equal(g['2026-11-04'].length, 1)
})
