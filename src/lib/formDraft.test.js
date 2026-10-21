import test from 'node:test'
import assert from 'node:assert/strict'
import { clearDraft, draftKey, hasContent, loadDraft, saveDraft } from './formDraft.js'

const memory = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), size: () => m.size }
}

test('draft keys are scoped by user, form and submission', () => {
  assert.notEqual(draftKey('u1', 'f1'), draftKey('u2', 'f1'))
  assert.notEqual(draftKey('u1', 'f1'), draftKey('u1', 'f1', 's9'))
})

test('hasContent ignores empty strings, empty arrays and false', () => {
  assert.equal(hasContent({ a: '', b: [], c: false }), false)
  assert.equal(hasContent({ a: '', b: ['x'] }), true)
  assert.equal(hasContent({ a: 0 }), true)
})

test('save then load round-trips, and an empty form removes the draft', () => {
  const s = memory()
  const key = draftKey('u1', 'f1')
  saveDraft(s, key, { data: { a: 'x' }, patient: 'p1', referenceCode: 'R-1' }, 1000)
  assert.deepEqual(loadDraft(s, key, 2000), { data: { a: 'x' }, patient: 'p1', referenceCode: 'R-1', savedAt: 1000 })
  saveDraft(s, key, { data: { a: '' }, patient: '', referenceCode: '' }, 3000)
  assert.equal(s.size(), 0)
})

test('drafts expire after a day and broken JSON is ignored', () => {
  const s = memory()
  const key = draftKey('u1', 'f1')
  saveDraft(s, key, { data: { a: 'x' } }, 0)
  assert.equal(loadDraft(s, key, 25 * 3600 * 1000), null)
  s.setItem(key, '{not json')
  assert.equal(loadDraft(s, key), null)
})

test('clearDraft and a storage that throws never raise', () => {
  const s = memory()
  const key = draftKey('u1', 'f1')
  saveDraft(s, key, { data: { a: 'x' } })
  clearDraft(s, key)
  assert.equal(s.size(), 0)
  const broken = { getItem() { throw new Error('x') }, setItem() { throw new Error('x') }, removeItem() { throw new Error('x') } }
  assert.equal(saveDraft(broken, key, { data: { a: 'x' } }), null)
  assert.equal(loadDraft(broken, key), null)
  assert.doesNotThrow(() => clearDraft(broken, key))
})
