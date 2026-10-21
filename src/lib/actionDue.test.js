import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dueState } from './actionDue.js'

const today = new Date(2026, 10, 10)
test('dueState classifies', () => {
  assert.equal(dueState({ is_done: true, due_date: '2020-01-01' }, today), 'done')
  assert.equal(dueState({ due_date: null }, today), 'none')
  assert.equal(dueState({ due_date: '2026-11-09' }, today), 'overdue')
  assert.equal(dueState({ due_date: '2026-11-10' }, today), 'soon')
  assert.equal(dueState({ due_date: '2026-11-13' }, today), 'soon')
  assert.equal(dueState({ due_date: '2026-11-14' }, today), 'later')
})
