/** Placeholder rows shown while a list loads (keeps the page from jumping). */
export default function TableSkeleton({ rows = 6, columns = 4, label = 'Chargement…' }) {
  return (
    <div className="ui-skeleton" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, r) => (
        <div className="ui-skeleton-row" key={r}>
          {Array.from({ length: columns }, (_, c) => (
            <span key={c} className="ui-skeleton-cell" style={{ width: `${c === 0 ? 24 : 60 / (columns - 1)}%` }} />
          ))}
        </div>
      ))}
    </div>
  )
}
