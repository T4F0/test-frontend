import test from 'node:test'
import assert from 'node:assert/strict'
import { orientationFromCamera } from './dicomOrientation.js'

// Standard axial slice, radiological display: patient Right on the screen's left, Anterior at the top.
test('axial slice: R left, L right, A top, P bottom', () => {
  const o = orientationFromCamera([0, -1, 0], [0, 0, -1])
  assert.deepEqual(o, { top: 'A', bottom: 'P', left: 'R', right: 'L' })
})

test('a vertical mirror (up and normal both reversed) swaps top and bottom only', () => {
  const o = orientationFromCamera([0, 1, 0], [0, 0, 1])
  assert.equal(o.top, 'P')
  assert.equal(o.bottom, 'A')
  assert.equal(o.left, 'R')
})

test('coronal slice shows S at the top', () => {
  const o = orientationFromCamera([0, 0, 1], [0, 1, 0])
  assert.equal(o.top, 'S')
  assert.equal(o.bottom, 'I')
})

test('very oblique vectors give no letter and missing camera gives null', () => {
  const o = orientationFromCamera([0.2, 0.2, 0.2], [0, 0, -1])
  assert.equal(o.top, '')
  assert.equal(orientationFromCamera(null, null), null)
})
