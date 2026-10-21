import test from 'node:test'
import assert from 'node:assert/strict'
import { collectFields, isFilled, validateSubmission, requiredProgress } from './formValidation.js'

const sections = [
  { id: 's2', order: 2, fields: [{ id: 'c1', order: 1, field_type: 'checkbox', required: true, options: [] }], children: [] },
  {
    id: 's1', order: 1,
    fields: [
      { id: 't1', order: 2, field_type: 'text', required: true },
      { id: 'n1', order: 1, field_type: 'number', required: false },
    ],
    children: [{ id: 's1a', order: 3, fields: [{ id: 'm1', order: 1, field_type: 'checkbox', required: true, options: ['a', 'b'] }], children: [] }],
  },
]

test('collectFields follows section and field order, including nested sections', () => {
  assert.deepEqual(collectFields(sections).map((f) => f.id), ['n1', 't1', 'm1', 'c1'])
})

test('isFilled handles each field type', () => {
  assert.equal(isFilled({ field_type: 'text' }, '  '), false)
  assert.equal(isFilled({ field_type: 'text' }, 'x'), true)
  assert.equal(isFilled({ field_type: 'number' }, 0), true)
  assert.equal(isFilled({ field_type: 'number' }, ''), false)
  assert.equal(isFilled({ field_type: 'checkbox', options: ['a'] }, []), false)
  assert.equal(isFilled({ field_type: 'checkbox', options: ['a'] }, ['a']), true)
  assert.equal(isFilled({ field_type: 'checkbox', options: [] }, false), false)
  assert.equal(isFilled({ field_type: 'checkbox' }, true), true)
  assert.equal(isFilled({ field_type: 'file' }, 'scan.pdf'), true)
})

test('validateSubmission reports every missing required field and the first one in reading order', () => {
  const { errors, firstErrorId } = validateSubmission(sections, { t1: '', m1: [], c1: false }, '')
  assert.deepEqual(Object.keys(errors).sort(), ['c1', 'm1', 'patient', 't1'])
  assert.equal(firstErrorId, 'patient')
  const next = validateSubmission(sections, { t1: '', m1: [], c1: false }, 'p1')
  assert.equal(next.firstErrorId, 't1')
  assert.match(next.errors.c1, /cochée/)
})

test('a complete submission has no errors', () => {
  const { errors, firstErrorId } = validateSubmission(sections, { t1: 'ok', m1: ['a'], c1: true }, 'p1')
  assert.deepEqual(errors, {})
  assert.equal(firstErrorId, null)
})

test('requiredProgress counts the patient as a required item', () => {
  assert.deepEqual(requiredProgress(sections, { t1: 'ok', m1: [], c1: false }, 'p1'), { done: 2, total: 4, percent: 50 })
  assert.equal(requiredProgress([], {}, '').percent, 0)
})
