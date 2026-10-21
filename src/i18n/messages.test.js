import { test } from 'node:test'
import assert from 'node:assert/strict'
import { translate } from './messages.js'

test('translate returns the French string, and the key itself when unknown', () => {
  assert.equal(translate('fr', 'nav.forms'), 'Formulaires')
  assert.equal(translate('xx', 'nav.forms'), 'Formulaires')
  assert.equal(translate('fr', 'nope'), 'nope')
})
