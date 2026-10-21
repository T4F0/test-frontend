import test from 'node:test'
import assert from 'node:assert/strict'
import { nextSort, sortRows, ariaSort } from './sorting.js'

test('nextSort cycles asc, desc, none and restarts on a new column', () => {
  let s = nextSort(null, 'name')
  assert.deepEqual(s, { key: 'name', dir: 'asc' })
  s = nextSort(s, 'name')
  assert.deepEqual(s, { key: 'name', dir: 'desc' })
  assert.equal(nextSort(s, 'name'), null)
  assert.deepEqual(nextSort(s, 'date'), { key: 'date', dir: 'asc' })
})

test('sortRows sorts French text with accents, numerically for numbers, without mutating', () => {
  const rows = [{ n: 'Écho' }, { n: 'Zèbre' }, { n: 'abc' }, { n: 'Étude' }]
  const out = sortRows(rows, { key: 'n', dir: 'asc' })
  assert.deepEqual(out.map((r) => r.n), ['abc', 'Écho', 'Étude', 'Zèbre'])
  assert.deepEqual(rows.map((r) => r.n), ['Écho', 'Zèbre', 'abc', 'Étude'])
  const nums = sortRows([{ v: 10 }, { v: 2 }, { v: 33 }], { key: 'v', dir: 'desc' })
  assert.deepEqual(nums.map((r) => r.v), [33, 10, 2])
})

test('empty values stay last in both directions and ties keep their order', () => {
  const rows = [{ k: '', id: 1 }, { k: 'b', id: 2 }, { k: 'a', id: 3 }, { k: 'a', id: 4 }]
  assert.deepEqual(sortRows(rows, { key: 'k', dir: 'asc' }).map((r) => r.id), [3, 4, 2, 1])
  assert.deepEqual(sortRows(rows, { key: 'k', dir: 'desc' }).map((r) => r.id), [2, 3, 4, 1])
})

test('custom getters and aria-sort', () => {
  const rows = [{ d: { x: 3 } }, { d: { x: 1 } }]
  assert.deepEqual(sortRows(rows, { key: 'x', dir: 'asc' }, { x: (r) => r.d.x }).map((r) => r.d.x), [1, 3])
  assert.equal(ariaSort({ key: 'a', dir: 'asc' }, 'a'), 'ascending')
  assert.equal(ariaSort({ key: 'a', dir: 'desc' }, 'a'), 'descending')
  assert.equal(ariaSort(null, 'a'), 'none')
})
