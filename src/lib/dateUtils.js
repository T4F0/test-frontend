/**
 * Formats a date string or object into French format (dd/mm/yyyy).
 */
export const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return date
  return d.toLocaleDateString('fr-FR')
}

/**
 * Formats a date string or object into French format with time (dd/mm/yyyy à HH:mm).
 */
export const formatDateTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return date
  return `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}
