import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { ariaSort } from '../lib/sorting'

/** <th> that sorts its column on click and announces its state to assistive tech. */
export default function SortHeader({ label, sortKey, sort, onSort, className = '' }) {
  const state = ariaSort(sort, sortKey)
  const Icon = state === 'ascending' ? ArrowUp : state === 'descending' ? ArrowDown : ChevronsUpDown
  return (
    <th className={className} aria-sort={state}>
      <button type="button" className={`ui-sort ${state !== 'none' ? 'is-active' : ''}`} onClick={() => onSort(sortKey)}>
        {label}
        <Icon size={14} aria-hidden="true" />
      </button>
    </th>
  )
}
