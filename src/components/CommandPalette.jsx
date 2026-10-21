import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, ClipboardList, CornerDownLeft, FilePlus2, Search, UserPlus, UserRound, Users } from 'lucide-react'
import { getPatients } from '../api/patientsApi'
import { getMeetings } from '../api/meetingsApi'
import { getForms } from '../api/formsApi'
import { searchSubmissions } from '../api/caseToolsApi'
import { formatDate } from '../lib/dateUtils'
import { filterAndRank, normalizeText } from '../lib/search'

/**
 * Global search / quick navigation (Ctrl+K or "/").
 * Pages and actions are instant; patients are searched on the server as you type;
 * meetings and forms are loaded once and filtered here.
 */
export default function CommandPalette({ open, onClose, pages, user }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [meetings, setMeetings] = useState([])
  const [forms, setForms] = useState([])
  const [patients, setPatients] = useState([])
  const [cases, setCases] = useState([])
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const canCreate = ['MEDECIN', 'MEDECIN_EXPERT', 'ADMIN'].includes(user?.role)
  const actions = useMemo(
    () =>
      canCreate
        ? [
            { id: 'a-case', label: 'Nouveau dossier RCP', hint: 'Action', icon: FilePlus2, to: '/cases/new' },
            { id: 'a-patient', label: 'Nouveau patient', hint: 'Action', icon: UserPlus, to: '/patients/new' },
          ]
        : [],
    [canCreate],
  )

  // Reset and load the small lists each time the palette opens
  useEffect(() => {
    if (!open) return undefined
    setQuery('')
    setActive(0)
    setPatients([])
    inputRef.current?.focus()
    let cancelled = false
    getMeetings()
      .then((r) => !cancelled && setMeetings(r.meetings || []))
      .catch(() => {})
    getForms()
      .then((r) => !cancelled && setForms(Array.isArray(r) ? r : []))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [open])

  // Debounced server-side patient search
  useEffect(() => {
    if (!open) return undefined
    const q = query.trim()
    if (q.length < 2) {
      setPatients([])
      setCases([])
      setLoadingPatients(false)
      return undefined
    }
    let cancelled = false
    setLoadingPatients(true)
    const timer = setTimeout(() => {
      getPatients(1, q)
        .then((rows) => !cancelled && setPatients((Array.isArray(rows) ? rows : []).slice(0, 6)))
        .catch(() => !cancelled && setPatients([]))
        .finally(() => !cancelled && setLoadingPatients(false))
      // Full-text search inside case content (not available to coordinators)
      if (user?.role !== 'COORDINATEUR') {
        searchSubmissions(q)
          .then((r) => !cancelled && setCases((r.results || []).slice(0, 6)))
          .catch(() => !cancelled && setCases([]))
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, open, user?.role])

  const groups = useMemo(() => {
    const q = query.trim()
    const pageItems = pages.map((p) => ({ id: `p-${p.to}`, label: p.label, hint: 'Page', icon: p.icon, to: p.to }))
    const actionItems = filterAndRank(actions, q, (a) => a.label)
    const meetingItems = filterAndRank(meetings, q, (m) => `${m.name || m.title || ''} ${m.specialty || ''}`).slice(0, 5).map((m) => ({
      id: `m-${m.id}`,
      label: m.name || m.title || 'Réunion RCP',
      hint: m.scheduled_date ? formatDate(m.scheduled_date) : 'Réunion',
      icon: Calendar,
      to: `/meetings/${m.id}`,
    }))
    const formItems = filterAndRank(forms, q, (f) => `${f.name || ''} ${f.description || ''}`).slice(0, 5).map((f) => ({
      id: `f-${f.id}`,
      label: f.name,
      hint: 'Formulaire',
      icon: ClipboardList,
      to: `/forms/${f.id}/submissions`,
    }))
    const patientItems = patients.map((p) => ({
      id: `pt-${p.id}`,
      label: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Patient',
      hint: p.anonymized_code || 'Patient',
      icon: UserRound,
      to: `/patients/${p.id}`,
    }))
    const caseItems = cases.map((c) => ({
      id: `c-${c.id}`,
      label: `${c.patient_name || 'Dossier'} · ${c.form_name}`,
      hint: c.snippet || c.reference_code || 'Dossier',
      icon: ClipboardList,
      to: `/forms/${c.form}/submissions/${c.id}`,
    }))
    const result = [
      { title: 'Patients', items: patientItems },
      { title: 'Contenu des dossiers', items: caseItems },
      { title: 'Actions', items: actionItems },
      { title: 'Pages', items: filterAndRank(pageItems, q, (p) => p.label) },
      { title: 'Réunions', items: q ? meetingItems : [] },
      { title: 'Formulaires', items: q ? formItems : [] },
    ].filter((g) => g.items.length > 0)
    return result
  }, [query, pages, actions, meetings, forms, patients, cases])

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups])

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest' })
  }, [active, groups])

  if (!open) return null

  const go = (item) => {
    onClose()
    navigate(item.to)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (flat.length ? (i + 1) % flat.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flat[active]) go(flat[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  let index = -1
  return (
    <div className="ui-dialog-backdrop ui-palette-backdrop" onMouseDown={onClose}>
      <div className="ui-palette" role="dialog" aria-modal="true" aria-label="Recherche rapide" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ui-palette-input">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Rechercher un patient, une réunion, un formulaire, une page…"
            role="combobox"
            aria-expanded="true"
            aria-controls="ui-palette-list"
            aria-activedescendant={flat[active] ? `ui-opt-${flat[active].id}` : undefined}
            aria-label="Rechercher"
            autoComplete="off"
          />
          <kbd>Échap</kbd>
        </div>
        <div className="ui-palette-list" id="ui-palette-list" role="listbox" ref={listRef}>
          {groups.length === 0 && (
            <div className="ui-palette-empty">
              {loadingPatients ? 'Recherche…' : query.trim() ? `Aucun résultat pour « ${query.trim()} »` : 'Commencez à taper pour rechercher'}
            </div>
          )}
          {groups.map((group) => (
            <div key={group.title} role="group" aria-label={group.title}>
              <div className="ui-palette-group">{group.title}</div>
              {group.items.map((item) => {
                index += 1
                const i = index
                const Icon = item.icon || Users
                return (
                  <div
                    key={item.id}
                    id={`ui-opt-${item.id}`}
                    role="option"
                    aria-selected={i === active}
                    className={`ui-palette-item ${i === active ? 'is-active' : ''}`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(item)}
                  >
                    <Icon size={17} aria-hidden="true" />
                    <span className="ui-palette-label">{item.label}</span>
                    <span className="ui-palette-hint">{item.hint}</span>
                    {i === active && <CornerDownLeft size={14} aria-hidden="true" />}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div className="ui-palette-foot">
          <span><kbd>↑</kbd> <kbd>↓</kbd> naviguer</span>
          <span><kbd>↵</kbd> ouvrir</span>
          <span><kbd>Ctrl</kbd> <kbd>K</kbd> ouvrir / fermer</span>
        </div>
      </div>
    </div>
  )
}
