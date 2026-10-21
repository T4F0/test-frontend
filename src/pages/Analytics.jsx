import { useEffect, useState } from 'react'
import { BarChart3, CalendarCheck, ClipboardList, Timer, ListChecks } from 'lucide-react'
import { getAnalytics } from '../api/analyticsApi'
import PageTitle from '../components/PageTitle'
import { SUBMISSION_STATUS_LABELS } from '../lib/labels'

const MONTH_FMT = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
const monthLabel = (key) => MONTH_FMT.format(new Date(Number(key.slice(0, 4)), Number(key.slice(5)) - 1, 1))

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <div className="an-stat">
      <Icon size={18} aria-hidden="true" />
      <strong>{value}</strong>
      <span>{label}</span>
      {hint && <small>{hint}</small>}
    </div>
  )
}

function Bars({ title, rows, color }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <section className="an-card" aria-label={title}>
      <h2>{title}</h2>
      <div className="an-bars" role="img" aria-label={rows.map((r) => `${monthLabel(r.month)} : ${r.count}`).join(', ')}>
        {rows.map((r) => (
          <div key={r.month} className="an-bar">
            <span className="an-bar-value">{r.count}</span>
            <div className="an-bar-fill" style={{ height: `${(r.count / max) * 100}%`, background: color }} />
            <span className="an-bar-label">{monthLabel(r.month)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function Analytics() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getAnalytics().then(setData).catch(() => setError('Impossible de charger les statistiques'))
  }, [])

  if (error) return <div className="list-container"><div className="error">{error}</div></div>
  if (!data) return <div className="loading" role="status">Chargement…</div>

  const { meetings, cases, actions, top_submitters: top } = data
  const statusTotal = Math.max(1, cases.total)

  return (
    <div className="list-container">
      <div className="list-header"><PageTitle icon={BarChart3}>Statistiques</PageTitle></div>

      <div className="an-stats">
        <Stat icon={CalendarCheck} label="Réunions" value={meetings.total} hint={`${meetings.avg_cases_per_finished_meeting} dossiers / réunion terminée`} />
        <Stat icon={ClipboardList} label="Dossiers" value={cases.total} hint={`${cases.decided} avec décision`} />
        <Stat icon={Timer} label="Délai moyen jusqu’à la décision" value={cases.avg_days_to_decision != null ? `${cases.avg_days_to_decision} j` : '—'} />
        <Stat icon={ListChecks} label="Actions de suivi ouvertes" value={actions.open} hint={actions.overdue ? `${actions.overdue} en retard` : 'aucune en retard'} />
      </div>

      <div className="an-grid">
        <Bars title="Réunions par mois" rows={meetings.per_month} color="#2563eb" />
        <Bars title="Dossiers créés par mois" rows={cases.per_month} color="#10b981" />

        <section className="an-card" aria-label="Dossiers par statut">
          <h2>Dossiers par statut</h2>
          {Object.keys(SUBMISSION_STATUS_LABELS).map((status) => {
            const n = cases.by_status[status] || 0
            return (
              <div key={status} className="an-hrow">
                <span>{SUBMISSION_STATUS_LABELS[status]}</span>
                <div className="an-htrack"><div className="an-hfill" style={{ width: `${(n / statusTotal) * 100}%` }} /></div>
                <strong>{n}</strong>
              </div>
            )
          })}
        </section>

        <section className="an-card" aria-label="Médecins les plus actifs">
          <h2>Médecins les plus actifs</h2>
          {top.length === 0 ? <p className="dash-muted">Aucune donnée.</p> : (
            <ol className="an-top">
              {top.map((t) => <li key={t.name}><span>{t.name}</span><strong>{t.count} dossier{t.count > 1 ? 's' : ''}</strong></li>)}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}
