import test from 'node:test'
import assert from 'node:assert/strict'
import { dayDiff, describeWhen, greeting } from './relativeTime.js'

const now = new Date(2026, 9, 19, 10, 30) // 19 Oct 2026, 10:30

test('dayDiff counts calendar days, not 24h blocks', () => {
  assert.equal(dayDiff(new Date(2026, 9, 19, 23, 59), now), 0)
  assert.equal(dayDiff(new Date(2026, 9, 20, 0, 5), now), 1)
  assert.equal(dayDiff(new Date(2026, 9, 18, 23, 0), now), -1)
})

test('describeWhen phrases today, tomorrow, this week and far dates', () => {
  assert.equal(describeWhen(new Date(2026, 9, 19, 14, 0), now), 'Aujourd’hui à 14:00')
  assert.equal(describeWhen(new Date(2026, 9, 20, 9, 5), now), 'Demain à 09:05')
  assert.equal(describeWhen(new Date(2026, 9, 22, 9, 0), now), 'Dans 3 jours · 09:00')
  assert.equal(describeWhen(new Date(2026, 9, 17, 9, 0), now), 'Il y a 2 jours')
  assert.equal(describeWhen(new Date(2026, 10, 30, 8, 0), now), '30/11/2026 à 08:00')
  assert.equal(describeWhen(null, now), '')
  assert.equal(describeWhen('not a date', now), '')
})

test('greeting follows the time of day', () => {
  assert.equal(greeting(new Date(2026, 0, 1, 9)), 'Bonjour')
  assert.equal(greeting(new Date(2026, 0, 1, 19)), 'Bonsoir')
})
