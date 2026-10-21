import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuditLogs, exportAuditLogsCsv } from '../api/auditLogsApi'
import { formatDateTime } from '../lib/dateUtils'
import AuditLogDrawer from '../components/AuditLogDrawer'
import PageTitle from '../components/PageTitle'
import RowActionMenu from '../components/RowActionMenu'
import EmptyState from '../components/EmptyState'
import TableSkeleton from '../components/TableSkeleton'
import { 
  Activity, PlusCircle, Edit, Trash2, Eye, Info,
  User, Calendar, FileText, FileType, Stethoscope, File, Shield,
  LogIn, LogOut, AlertTriangle, Download, Search, X, FilterX, ExternalLink
} from 'lucide-react'

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED']
const OBJECT_TYPES = [
  'User', 'Patient', 'RCPMeeting', 'RCPReport', 'MedicalDocument',
  'Form', 'FormSubmission', 'Session'
]

const ACTION_LABELS = {
  'CREATE': 'Création',
  'UPDATE': 'Modification',
  'DELETE': 'Suppression',
  'VIEW': 'Consultation',
  'LOGIN': 'Connexion',
  'LOGOUT': 'Déconnexion',
  'LOGIN_FAILED': 'Échec de connexion'
}

const ACTION_ICONS = {
  'CREATE': <PlusCircle size={16} style={{ color: '#10b981' }} />,
  'UPDATE': <Edit size={16} style={{ color: '#f59e0b' }} />,
  'DELETE': <Trash2 size={16} style={{ color: '#ef4444' }} />,
  'VIEW': <Eye size={16} style={{ color: '#3b82f6' }} />,
  'LOGIN': <LogIn size={16} style={{ color: '#10b981' }} />,
  'LOGOUT': <LogOut size={16} style={{ color: '#64748b' }} />,
  'LOGIN_FAILED': <AlertTriangle size={16} style={{ color: '#ef4444' }} />
}

const OBJECT_TYPE_LABELS = {
  'User': 'Utilisateur / Compte',
  'Patient': 'Dossier Patient',
  'RCPMeeting': 'Réunion RCP',
  'RCPReport': 'Compte-rendu RCP',
  'MedicalDocument': 'Document Médical',
  'Form': 'Modèle de Formulaire',
  'FormSubmission': 'Soumission de Dossier',
  'Session': 'Session'
}

const OBJECT_TYPE_ICONS = {
  'User': <User size={14} />,
  'Patient': <Stethoscope size={14} />,
  'RCPMeeting': <Calendar size={14} />,
  'RCPReport': <FileText size={14} />,
  'MedicalDocument': <File size={14} />,
  'Form': <FileType size={14} />,
  'FormSubmission': <FileText size={14} />,
  'Session': <LogIn size={14} />
}

export default function AuditLogsList() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(null)

  const [action, setAction] = useState('')
  const [objectType, setObjectType] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrev, setHasPrev] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)

  // The person search runs on the server: wait for a pause in typing
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const filters = useMemo(() => {
    const f = {}
    if (action) f.action = action
    if (objectType) f.object_type = objectType
    if (debouncedSearch) f.q = debouncedSearch
    if (dateFrom) f.date_from = dateFrom
    if (dateTo) f.date_to = dateTo
    return f
  }, [action, objectType, debouncedSearch, dateFrom, dateTo])

  const hasFilters = Object.keys(filters).length > 0 || search !== ''

  useEffect(() => {
    setPage(1)
  }, [filters])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const data = await getAuditLogs(page > 1 ? { ...filters, page } : filters)
        if (cancelled) return
        setLogs(Array.isArray(data.logs) ? data.logs : [])
        setTotal(data.count)
        setHasNext(data.hasNext)
        setHasPrev(data.hasPrev)
        setError(null)
      } catch (err) {
        if (!cancelled) setError("Échec du chargement de l'historique. Accès administrateur requis.")
        console.error(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [filters, page])

  const resetFilters = () => {
    setAction('')
    setObjectType('')
    setSearch('')
    setDebouncedSearch('')
    setDateFrom('')
    setDateTo('')
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      await exportAuditLogsCsv(filters)
    } catch (err) {
      setError("Échec de l'export. Réessayez.")
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  const getObjectLink = (type, id) => {
    switch (type) {
      case 'User': return `/users/${id}`
      case 'Patient': return `/patients/${id}`
      case 'RCPMeeting': return `/meetings/${id}`
      case 'Form': return `/forms/${id}/submissions`
      default: return null
    }
  }

  const displayName = (log) => log.user_full_name || log.username || 'Système'

  const rowMenu = (log) => {
    const link = log.action !== 'DELETE' ? getObjectLink(log.object_type, log.object_id) : null
    return [
      { label: "Consulter l'élément", icon: ExternalLink, hidden: !link, onClick: () => navigate(link) },
      { label: 'Voir la personne', icon: User, hidden: !log.user, onClick: () => navigate(`/users/${log.user}`) },
    ]
  }

  if (error && logs.length === 0) return <div className="error">{error}</div>

  return (
    <div className="list-container audit-page">
      <div className="list-header audit-header">
        <div>
          <PageTitle icon={Shield}>Historique des activités</PageTitle>
          <p className="text-muted audit-subtitle">Qui a fait quoi, et quand, sur la plateforme.</p>
        </div>
        <button type="button" className="ui-btn ui-btn-ghost" onClick={handleExport} disabled={exporting || total === 0}>
          <Download size={16} aria-hidden="true" />
          {exporting ? 'Export…' : 'Exporter en CSV'}
        </button>
      </div>

      <div className="audit-filters">
        <label className="audit-field">
          <span>Action</span>
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">Toutes les actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>)}
          </select>
        </label>
        <label className="audit-field">
          <span>Type d'élément</span>
          <select value={objectType} onChange={(e) => setObjectType(e.target.value)}>
            <option value="">Tous les types</option>
            {OBJECT_TYPES.map((t) => <option key={t} value={t}>{OBJECT_TYPE_LABELS[t] || t}</option>)}
          </select>
        </label>
        <label className="audit-field">
          <span>Du</span>
          <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label className="audit-field">
          <span>Au</span>
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <label className="audit-field audit-field-search">
          <span>Personne</span>
          <div className="audit-search">
            <Search size={16} aria-hidden="true" />
            <input type="text" placeholder="Nom, identifiant ou email…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && (
              <button type="button" aria-label="Effacer la recherche" onClick={() => setSearch('')}>
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        </label>
        {hasFilters && (
          <button type="button" className="ui-btn ui-btn-ghost audit-reset" onClick={resetFilters}>
            <FilterX size={16} aria-hidden="true" /> Réinitialiser
          </button>
        )}
      </div>

      <div className="ui-count" aria-live="polite" style={{ marginBottom: '0.75rem' }}>
        {loading ? 'Chargement…' : `${total} événement${total > 1 ? 's' : ''}${hasFilters ? ' correspondant aux filtres' : ''}`}
      </div>

      {loading && logs.length === 0 ? (
        <TableSkeleton rows={8} columns={4} label="Chargement de l'historique…" />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Aucune activité trouvée"
          description={hasFilters ? 'Aucun événement ne correspond à ces filtres.' : "Rien n'a encore été enregistré."}
          action={hasFilters ? <button type="button" className="ui-btn ui-btn-ghost" onClick={resetFilters}>Réinitialiser les filtres</button> : null}
        />
      ) : (
        <>
          <div className="audit-table-wrapper">
            <table className="forms-table audit-table">
              <thead>
                <tr>
                  <th>Date et heure</th>
                  <th>Intervenant</th>
                  <th>Action réalisée</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="ui-row-link" onClick={() => setSelectedLog(log)}>
                    <td className="audit-date">{formatDateTime(log.timestamp)}</td>
                    <td>
                      <div className="audit-person">
                        <span className="audit-avatar"><User size={18} aria-hidden="true" /></span>
                        <div>
                          <strong>{displayName(log)}</strong>
                          {log.user_email && <div className="audit-email">{log.user_email}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="audit-action">
                        <span className="audit-action-icon">{ACTION_ICONS[log.action] || <Activity size={16} />}</span>
                        <span>
                          <strong>{ACTION_LABELS[log.action] || log.action}</strong>
                          <span className="audit-object">{OBJECT_TYPE_ICONS[log.object_type]}{OBJECT_TYPE_LABELS[log.object_type] || log.object_type}</span>
                        </span>
                      </div>
                    </td>
                    <td className="actions" onClick={(e) => e.stopPropagation()}>
                      <div className="ui-row-actions">
                        <button type="button" className="ui-primary-action" onClick={() => setSelectedLog(log)}>
                          <Info size={15} aria-hidden="true" /> Détails
                        </button>
                        <RowActionMenu label="Autres actions" items={rowMenu(log)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-cards">
            {logs.map((log) => (
              <div key={log.id} className="mobile-card" onClick={() => setSelectedLog(log)}>
                <div className="mobile-card-header">
                  <div className="mobile-card-title">
                    <div className="audit-action">
                      <span className="audit-action-icon">{ACTION_ICONS[log.action] || <Activity size={14} />}</span>
                      <strong>{ACTION_LABELS[log.action] || log.action}</strong>
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>{formatDateTime(log.timestamp)}</div>
                  </div>
                </div>
                <div className="mobile-card-body">
                  <span>{displayName(log)}</span>
                  <span className="audit-object" style={{ marginLeft: 'auto' }}>{OBJECT_TYPE_LABELS[log.object_type] || log.object_type}</span>
                </div>
                <div className="mobile-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="ui-primary-action" onClick={() => setSelectedLog(log)}>
                    <Info size={15} aria-hidden="true" /> Détails
                  </button>
                  <RowActionMenu label="Autres actions" items={rowMenu(log)} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {logs.length > 0 && (
        <div className="pagination-bar">
          <button className="pagination-bar__btn" disabled={!hasPrev || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            ← Précédente
          </button>
          <span className="pagination-bar__page">Page {page}</span>
          <button className="pagination-bar__btn" disabled={!hasNext || loading} onClick={() => setPage((p) => p + 1)}>
            Suivante →
          </button>
        </div>
      )}

      {selectedLog && <AuditLogDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  )
}
