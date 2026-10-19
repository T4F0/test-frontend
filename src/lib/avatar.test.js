import test from 'node:test'
import assert from 'node:assert/strict'
import { avatarHue, initialsOf } from './avatar.js'

test('avatarHue is stable and spreads neighbouring ids across several hues', () => {
  assert.equal(avatarHue('u1'), avatarHue('u1'))
  const hues = new Set(['u1', 'u2', 'u3', 'u4', 'u5', 'u6'].map(avatarHue))
  assert.ok(hues.size >= 4, `expected a spread of hues, got ${[...hues]}`)
})

test('initialsOf', () => {
  assert.equal(initialsOf('Sara Khelifi'), 'SK')
  assert.equal(initialsOf('karim'), 'K')
  assert.equal(initialsOf('  Ana  Maria  Lopez '), 'AM')
  assert.equal(initialsOf(''), '?')
  assert.equal(initialsOf(null), '?')
})
