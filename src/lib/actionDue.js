// Classify a follow-up action's due date for display.
export function dueState(action, today = new Date()) {
  if (action.is_done) return 'done'
  if (!action.due_date) return 'none'
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const [y, m, d] = action.due_date.split('-').map(Number)
  const due = new Date(y, m - 1, d)
  const days = Math.round((due - start) / 86400000)
  if (days < 0) return 'overdue'
  if (days <= 3) return 'soon'
  return 'later'
}

export const formatDue = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}
