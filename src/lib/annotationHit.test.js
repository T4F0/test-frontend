import test from 'node:test'
import assert from 'node:assert/strict'
import { distanceToPolyline, nearestAnnotation } from './annotationHit.js'

test('distance to a segment, a point and a closed shape', () => {
  assert.equal(distanceToPolyline([5, 3], [[0, 0], [10, 0]]), 3)
  assert.equal(distanceToPolyline([13, 4], [[0, 0], [10, 0]]), 5)
  assert.equal(distanceToPolyline([3, 4], [[0, 0]]), 5)
  const square = [[0, 0], [10, 0], [10, 10], [0, 10]]
  assert.equal(distanceToPolyline([0, 5], square, true), 0) // the closing edge
  assert.equal(distanceToPolyline([0, 5], square, false), 5) // open path has no such edge
})

test('nearestAnnotation picks the closest within the radius', () => {
  const entries = [
    { uid: 'a', points: [[0, 0], [100, 0]] },
    { uid: 'b', points: [[0, 10], [100, 10]] },
  ]
  assert.equal(nearestAnnotation(entries, [50, 8], 14), 'b')
  assert.equal(nearestAnnotation(entries, [50, 2], 14), 'a')
  assert.equal(nearestAnnotation(entries, [50, 60], 14), null)
})
