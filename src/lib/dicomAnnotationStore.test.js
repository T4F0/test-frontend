import test from 'node:test'
import assert from 'node:assert/strict'
import { saveAnnotations, loadAnnotations, clearAnnotations } from './dicomAnnotationStore.js'

test('saves, loads and clears per key', () => {
  saveAnnotations('a', [{ annotationUID: '1' }])
  assert.equal(loadAnnotations('a').length, 1)
  assert.deepEqual(loadAnnotations('missing'), [])
  clearAnnotations('a')
  assert.deepEqual(loadAnnotations('a'), [])
})

test('saving an empty list forgets the entry', () => {
  saveAnnotations('b', [{ annotationUID: '1' }])
  saveAnnotations('b', [])
  assert.deepEqual(loadAnnotations('b'), [])
})

test('keeps at most 30 images, dropping the oldest', () => {
  for (let i = 0; i < 35; i += 1) saveAnnotations(`k${i}`, [{ annotationUID: String(i) }])
  assert.deepEqual(loadAnnotations('k0'), [])
  assert.equal(loadAnnotations('k34').length, 1)
})
