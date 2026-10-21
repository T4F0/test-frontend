import SortHeader from './SortHeader'
import TableSkeleton from './TableSkeleton'
import { nextSort } from '../lib/sorting'

/**
 * Shared list table: sortable headers, clickable rows, loading skeleton and a mobile card layout.
 *
 * columns: [{ key, label, render?(row), sortable?, className?, mobile? }]
 *   - the first column is the card title on phones; `mobile: false` hides a column there
 * actions(row): optional node rendered in a last, non-clickable cell
 */
export default function DataTable({
  columns,
  rows,
  rowKey = (row) => row.id,
  sort,
  onSortChange,
  onRowClick,
  actions,
  actionsLabel = 'Actions',
  loading = false,
  empty = null,
  skeletonRows = 5,
  loadingLabel,
  className = '',
}) {
  if (loading) return <TableSkeleton rows={skeletonRows} columns={columns.length + (actions ? 1 : 0)} label={loadingLabel} />
  if (rows.length === 0) return empty

  const cell = (col, row) => (col.render ? col.render(row) : row[col.key] ?? '—')
  const clickable = (row) =>
    onRowClick
      ? {
          onClick: (e) => !e.target.closest('button, a, input, select, label') && onRowClick(row),
          className: 'hover-row-highlight is-clickable',
        }
      : {}

  return (
    <>
      <div className={`table-responsive-wrapper ${className}`}>
        <table className="forms-table">
          <thead>
            <tr>
              {columns.map((col) =>
                col.sortable ? (
                  <SortHeader key={col.key} label={col.label} sortKey={col.key} sort={sort} onSort={(k) => onSortChange(nextSort(sort, k))} className={col.className} />
                ) : (
                  <th key={col.key} className={col.className}>{col.label}</th>
                ),
              )}
              {actions && <th>{actionsLabel}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} {...clickable(row)}>
                {columns.map((col) => <td key={col.key} className={col.className}>{cell(col, row)}</td>)}
                {actions && <td className="actions" onClick={(e) => e.stopPropagation()}>{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-cards">
        {rows.map((row) => {
          const [titleCol, ...rest] = columns
          return (
            <div key={rowKey(row)} className="mobile-card" {...(onRowClick ? { onClick: (e) => !e.target.closest('button, a') && onRowClick(row) } : {})}>
              <div className="mobile-card-header">
                <div className="mobile-card-title">{cell(titleCol, row)}</div>
              </div>
              <div className="mobile-card-body dt-card-body">
                {rest.filter((c) => c.mobile !== false).map((col) => (
                  <span key={col.key} className="dt-card-field"><small>{col.label}</small>{cell(col, row)}</span>
                ))}
              </div>
              {actions && <div className="mobile-card-actions" onClick={(e) => e.stopPropagation()}>{actions(row)}</div>}
            </div>
          )
        })}
      </div>
    </>
  )
}
