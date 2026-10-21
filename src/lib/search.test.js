import test from 'node:test'
import assert from 'node:assert/strict'
import { filterAndRank, matchScore, normalizeText } from './search.js'

test('normalizeText strips accents and case', () => {
  assert.equal(normalizeText('  Réunion ÉCHO '), 'reunion echo')
  assert.equal(normalizeText(null), '')
})

test('matchScore prefers prefixes, then word starts, then substrings; all tokens must match', () => {
  assert.equal(matchScore('Réunions RCP', 'reun'), 4)
  assert.equal(matchScore('Demande de RCP', 'rcp'), 3)
  assert.equal(matchScore('Formulaires', 'mula'), 2)
  assert.equal(matchScore('Formulaires', 'xyz'), 0)
  assert.ok(matchScore('Echo-endoscopie pancréas', 'echo pancreas') > 0)
  assert.equal(matchScore('Echo-endoscopie', 'echo pancreas'), 0)
})

test('filterAndRank orders by relevance and keeps everything for an empty query', () => {
  const items = [{ n: 'Rapports' }, { n: 'Réunions RCP' }, { n: 'RCP digestive' }]
  assert.equal(filterAndRank(items, '', (i) => i.n), items)
  assert.deepEqual(filterAndRank(items, 'rcp', (i) => i.n).map((i) => i.n), ['RCP digestive', 'Réunions RCP'])
})
