import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getMeetings } from '../api/meetingsApi'
import { monthGrid, gridRange, shiftMonth, groupByDay, dayKey } from '../lib/calendar'

const WEEKDAYS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']
const MAX_CHIPS = 3
const timeOf = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export default function MeetingsCalendar({ status = '' }) {
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openDay, setOpenDay] = useState(null)

  useEffect(() => {
    let cancelled = false
    const { after, before } = gridRange(anchor)
    setLoading(true)
    getMeetings({
      scheduled_after: after,
      scheduled_before: before,
      page_size: 100,
      ordering: 'scheduled_date',
      ...(status && { status }),
    })
      .then((data) => { if (!cancelled) { setMeetings(data.meetings); setError(null) } })
      .catch(() => { if (!cancelled) setError('Échec du chargement du calendrier') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [anchor, status])

  const grid = useMemo(() => monthGrid(anchor), [anchor])
  const byDay = useMemo(() => groupByDay(meetings), [meetings])
  const todayKey = dayKey(new Date())
  const monthLabel = anchor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div className="mcal" aria-busy={loading}>
      <div className="mcal-toolbar">
        <button type="button" className="mcal-nav" onClick={() => { setOpenDay(null); setAnchor(shiftMonth(anchor, -1)) }} aria-label="Mois précédent">
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <h2 className="mcal-title">{monthLabel}</h2>
        <button type="button" className="mcal-nav" onClick={() => { setOpenDay(null); setAnchor(shiftMonth(anchor, 1)) }} aria-label="Mois suivant">
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <button type="button" className="mcal-today" onClick={() => { setOpenDay(null); setAnchor(new Date(new Date().getFullYear(), new Date().getMonth(), 1)) }}>
          Aujourd’hui
        </button>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="mcal-grid" role="grid" aria-label={monthLabel}>
        {WEEKDAYS.map((d) => <div key={d} className="mcal-weekday" role="columnheader">{d}</div>)}
        {grid.flat().map((day) => {
          const key = dayKey(day)
          const items = byDay[key] || []
          const expanded = openDay === key
          const shown = expanded ? items : items.slice(0, MAX_CHIPS)
          const outside = day.getMonth() !== anchor.getMonth()
          return (
            <div
              key={key}
              role="gridcell"
              className={`mcal-day${outside ? ' is-outside' : ''}${key === todayKey ? ' is-today' : ''}`}
            >
              <span className="mcal-daynum">{day.getDate()}</span>
              {shown.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`mcal-chip ${String(m.status).toLowerCase()}`}
                  onClick={() => navigate(`/meetings/${m.id}`)}
                  title={`${timeOf(m.scheduled_date)} · ${m.title || 'Réunion RCP'}`}
                >
                  <span className="mcal-chip-time">{timeOf(m.scheduled_date)}</span>
                  <span className="mcal-chip-title">{m.title || 'Réunion RCP'}</span>
                </button>
              ))}
              {items.length > MAX_CHIPS && (
                <button type="button" className="mcal-more" onClick={() => setOpenDay(expanded ? null : key)}>
                  {expanded ? 'Réduire' : `+${items.length - MAX_CHIPS} autres`}
                </button>
              )}
            </div>
          )
        })}
      </div>
      {!loading && !error && meetings.length === 0 && (
        <p className="mcal-empty">Aucune réunion sur cette période.</p>
      )}
    </div>
  )
}
