import test from 'node:test'
import assert from 'node:assert/strict'
import { titleForPath, statusLabel, SUBMISSION_STATUS_LABELS, MEETING_STATUS_LABELS } from './labels.js'

test('titleForPath picks the most specific route', () => {
  assert.equal(titleForPath('/patients'), 'Patients · e-RCP')
  assert.equal(titleForPath('/patients/abc-123'), 'Dossier patient · e-RCP')
  assert.equal(titleForPath('/patients/abc/edit'), 'Modifier le patient · e-RCP')
  assert.equal(titleForPath('/meetings/requests'), 'Demandes de RCP · e-RCP')
  assert.equal(titleForPath('/meetings/42'), 'Réunion RCP · e-RCP')
  assert.equal(titleForPath('/forms/1/submissions/9'), 'Dossier RCP · e-RCP')
  assert.equal(titleForPath('/forms/1/submissions'), 'Soumissions · e-RCP')
})

test('unknown routes fall back to the app name, never a patient identifier', () => {
  assert.equal(titleForPath('/something-else'), 'e-RCP Algérie')
  assert.ok(!titleForPath('/patients/Jean-Dupont').includes('Dupont'))
})

test('statusLabel maps known enums and degrades gracefully', () => {
  assert.equal(statusLabel(SUBMISSION_STATUS_LABELS, 'A_REDISCUTER'), 'À rediscuter')
  assert.equal(statusLabel(MEETING_STATUS_LABELS, 'LIVE'), 'En cours')
  assert.equal(statusLabel(MEETING_STATUS_LABELS, 'WEIRD'), 'WEIRD')
  assert.equal(statusLabel(MEETING_STATUS_LABELS, undefined), '—')
})
