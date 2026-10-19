import { SUBMISSION_STATUS_COLORS, SUBMISSION_STATUS_LABELS } from '../lib/labels'

/** Coloured pill for a case (submission) status: shows the French label, never the raw enum. */
export default function StatusBadge({ status, className = '' }) {
  const color = SUBMISSION_STATUS_COLORS[status] || '#64748b'
  return (
    <span
      className={`status-pill ${className}`}
      style={{ '--pill-color': color }}
      data-status={status}
    >
      {SUBMISSION_STATUS_LABELS[status] || status || '—'}
    </span>
  )
}
