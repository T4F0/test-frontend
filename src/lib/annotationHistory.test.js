import test from 'node:test'
import assert from 'node:assert/strict'
import { createHistory } from './annotationHistory.js'

const a = (id) => ({ annotationUID: id })

test('undo and redo walk through snapshots', () => {
  const h = createHistory()
  h.reset([])
  h.record([a('1')])
  h.record([a('1'), a('2')])
  assert.deepEqual(h.undo(), [a('1')])
  assert.deepEqual(h.undo(), [])
  assert.equal(h.undo(), null)
  assert.deepEqual(h.redo(), [a('1')])
  assert.deepEqual(h.redo(), [a('1'), a('2')])
  assert.equal(h.redo(), null)
})

test('a new action clears the redo branch; identical snapshots are ignored', () => {
  const h = createHistory()
  h.reset([a('1')])
  assert.equal(h.record([a('1')]), false)
  h.record([])
  h.undo()
  assert.equal(h.canRedo(), true)
  h.record([a('1'), a('3')])
  assert.equal(h.canRedo(), false)
})

test('history is bounded and snapshots are copies', () => {
  const h = createHistory(3)
  const live = [a('x')]
  h.reset(live)
  live[0].annotationUID = 'mutated'
  for (let i = 0; i < 6; i++) h.record([a(String(i))])
  let steps = 0
  while (h.undo()) steps++
  assert.equal(steps, 3)
})
