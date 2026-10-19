import test from 'node:test'
import assert from 'node:assert/strict'
import {
  authorColor,
  cleanDicomId,
  dicomEndpointFor,
  isSameDicomFile,
  normalizeDicomUrl,
  withAnonymize,
} from './dicomIds.js'

test('cleanDicomId strips known prefixes and trailing slashes', () => {
  assert.equal(cleanDicomId('submission-42'), '42')
  assert.equal(cleanDicomId('meeting-abc/'), 'abc')
  assert.equal(cleanDicomId(7), '7')
  assert.equal(cleanDicomId(null), '')
})

test('dicomEndpointFor builds the serve endpoint', () => {
  assert.equal(dicomEndpointFor('submission-9'), '/api/conferences/dicom/9/')
})

test('normalizeDicomUrl fixes legacy submission urls only', () => {
  assert.equal(normalizeDicomUrl('/api/conferences/dicom/submission-3/'), '/api/conferences/dicom/3/')
  assert.equal(normalizeDicomUrl('/api/conferences/dicom/3/'), '/api/conferences/dicom/3/')
  assert.equal(normalizeDicomUrl(undefined), undefined)
})

test('isSameDicomFile matches raw or prefix-stripped ids, never empty ones', () => {
  assert.equal(isSameDicomFile('submission-5', '5'), true)
  assert.equal(isSameDicomFile('5', 'x', 'submission-5'), true)
  assert.equal(isSameDicomFile('5', '6', '7'), false)
  assert.equal(isSameDicomFile('', ''), false)
  assert.equal(isSameDicomFile('5', undefined, ''), false)
})

test('withAnonymize only touches the DICOM endpoint', () => {
  assert.equal(withAnonymize('/api/conferences/dicom/1/', true), '/api/conferences/dicom/1/?anonymize=1')
  assert.equal(withAnonymize('/api/conferences/dicom/1/?x=2', true), '/api/conferences/dicom/1/?x=2&anonymize=1')
  assert.equal(withAnonymize('/api/conferences/dicom/1/', false), '/api/conferences/dicom/1/')
  assert.equal(withAnonymize('/other/file.dcm', true), '/other/file.dcm')
})

test('authorColor is stable per user and differs across a few users', () => {
  assert.equal(authorColor('user-1'), authorColor('user-1'))
  const colors = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(authorColor))
  assert.ok(colors.size > 1)
})
