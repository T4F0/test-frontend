import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuditLogs } from '../api/auditLogsApi'
import { formatDateTime } from '../lib/dateUtils'
import AuditLogDrawer from '../components/AuditLogDrawer'
import { 
  Activity, PlusCircle, Edit, Trash2, Eye, Info,
  User, Calendar, FileText, FileType, Stethoscope, File, Shield
} from 'lucide-react'

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'VIEW']
const OBJECT_TYPES = [
  'User', 'Patient', 'RCPMeeting', 'RCPReport', 'MedicalDocument',
  'Form', 'FormSubmission'
]

const ACTION_LABELS = {
  'CREATE': 'Création',
  'UPDATE': 'Modification',
  'DELETE': 'Suppression',
  'VIEW': 'Consultation'
}

const ACTION_ICONS = {
  'CREATE': <PlusCircle size={16} style={{ color: '#10b981' }} />,
  'UPDATE': <Edit size={16} style={{ color: '#f59e0b' }} />,
  'DELETE': <Trash2 size={16} style={{ color: '#ef4444' }} />,
  'VIEW': <Eye size={16} style={{ color: '#3b82f6' }} />
}

const OBJECT_TYPE_LABELS = {
  'User': 'Utilisateur / Compte',
  'Patient': 'Dossier Patient',
  'RCPMeeting': 'Réunion RCP',
  'RCPReport': 'Compte-rendu RCP',
  'MedicalDocument': 'Document Médical',
  'Form': 'Modèle de Formulaire',
  'FormSubmission': 'Soumission de Dossier'
}

const OBJECT_TYPE_ICONS = {
  'User': <User size={14} />,
  'Patient': <Stethoscope size={14} />,
  'RCPMeeting': <Calendar size={14} />,
  'RCPReport': <FileText size={14} />,
  'MedicalDocument': <File size={14} />,
  'Form': <FileType size={14} />,
  'FormSubmission': <FileText size={14} />
}

export default function AuditLogsList() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [action, setAction] = useState('')
  const [objectType, setObjectType] = useState('')
  const [search, setSearch] = useState('')

  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrev, setHasPrev] = useState(false)

  const [selectedLog, setSelectedLog] = useState(null)

  // Reset to first page when filtering
  useEffect(() => {
    setPage(1)
  }, [action, objectType])

  useEffect(() => {
    loadLogs()
  }, [action, objectType, page])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const filters = {}
      if (action) filters.action = action
      if (objectType) filters.object_type = objectType
      if (page > 1) filters.page = page
      
      const data = await getAuditLogs(filters)
      setLogs(Array.isArray(data.logs) ? data.logs : [])
      setHasNext(data.hasNext)
      setHasPrev(data.hasPrev)
      setError(null)
    } catch (err) {
      setError('Échec du chargement de l\'historique. Accès administrateur requis.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (log.username?.toLowerCase().includes(searchLower) || 
              log.user_email?.toLowerCase().includes(searchLower));
  })

  const getObjectLink = (type, id) => {
    switch(type) {
      case 'User': return `/users/${id}`
      case 'Patient': return `/patients/${id}`
      case 'RCPMeeting': return `/meetings/${id}`
      case 'Form': return `/forms/${id}`
      default: return null
    }
  }

  if (loading && logs.length === 0) return <div className="loading">Chargement de l'historique...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="list-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="list-header" style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
          <Shield className="text-primary" size={28} />
          Historique des Activités
        </h1>
        <p className="text-muted" style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem' }}>
          Suivi complet et simplifié des actions réalisées sur la plateforme.
        </p>
      </div>

      <div className="filters-bar" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>Filtrer par action</label>
          <select value={action} onChange={(e) => setAction(e.target.value)} className="filter-select" style={{ width: '100%', margin: 0, padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <option value="">Toutes les actions</option>
            {ACTIONS.map(a => <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>Filtrer par type d'élément</label>
          <select value={objectType} onChange={(e) => setObjectType(e.target.value)} className="filter-select" style={{ width: '100%', margin: 0, padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <option value="">Tous les types d'éléments</option>
            {OBJECT_TYPES.map(t => <option key={t} value={t}>{OBJECT_TYPE_LABELS[t] || t}</option>)}
          </select>
        </div>

        <div style={{ flex: 2, minWidth: '250px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>Recherche rapide</label>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Rechercher un médecin, un email ou une référence..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="filter-input"
              style={{ width: '100%', margin: 0, padding: '0.6rem 2rem 0.6rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--gray-400)',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button onClick={loadLogs} className="btn-secondary btn-with-icon" style={{ height: '42px', padding: '0 1rem' }}>
            <Activity size={16} /> Actualiser
          </button>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="empty-inline-card" style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
          <Activity size={48} style={{ color: '#94a3b8', margin: '0 auto 1rem' }} />
          <p style={{ color: '#475569', fontSize: '1.1rem', margin: 0 }}>Aucune activité trouvée pour ces critères.</p>
        </div>
      ) : (
        <div className="table-responsive-wrapper" style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <table className="forms-table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f1f5f9' }}>
              <tr>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#334155', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Date & Heure</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#334155', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Intervenant</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#334155', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Action Réalisée</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#334155', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Lien vers l'élément</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const objectLink = getObjectLink(log.object_type, log.object_id);
                return (
                <tr 
                  key={log.id} 
                  onClick={() => { if (log.user) navigate(`/users/${log.user}`) }}
                  style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s', cursor: log.user ? 'pointer' : 'default' }}
                  className={log.user ? "hover-row-highlight" : ""}
                >
                  <td style={{ padding: '1rem', verticalAlign: 'middle', color: '#475569', whiteSpace: 'nowrap' }}>
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0 }}>
                        <User size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {log.username || 'Système'}
                        </div>
                        {log.user_email && (
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{log.user_email}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        {ACTION_ICONS[log.action] || <Activity size={16} />}
                      </div>
                      <span>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{ACTION_LABELS[log.action] || log.action}</span>
                        {' '}sur un(e){' '}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem', color: '#475569', fontWeight: 500, border: '1px solid #e2e8f0' }}>
                          {OBJECT_TYPE_ICONS[log.object_type]}
                          {OBJECT_TYPE_LABELS[log.object_type] || log.object_type}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', verticalAlign: 'middle' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {log.action === 'DELETE' ? (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>Élément supprimé</span>
                      ) : objectLink ? (
                        <button 
                          className="btn-small btn-outline" 
                          onClick={(e) => { e.stopPropagation(); navigate(objectLink); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem' }}
                        >
                          <Eye size={14} />
                          Consulter
                        </button>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>Non consultable directement</span>
                      )}
                      <button
                        className="btn-small btn-outline"
                        onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                        title="Voir les détails"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.65rem', color: '#6366f1', borderColor: '#c7d2fe' }}
                      >
                        <Info size={14} />
                        Détails
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {logs.length > 0 && (
        <div className="pagination-controls" style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center', alignItems: 'center' }}>
          <button 
            className="btn-secondary" 
            disabled={!hasPrev || loading} 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', cursor: (!hasPrev || loading) ? 'not-allowed' : 'pointer', opacity: (!hasPrev || loading) ? 0.6 : 1 }}
          >
            ← Page Précédente
          </button>
          <span style={{ fontWeight: 500, color: '#475569', minWidth: '80px', textAlign: 'center', fontSize: '0.95rem' }}>Page {page}</span>
          <button 
            className="btn-secondary" 
            disabled={!hasNext || loading} 
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', cursor: (!hasNext || loading) ? 'not-allowed' : 'pointer', opacity: (!hasNext || loading) ? 0.6 : 1 }}
          >
            Page Suivante →
          </button>
        </div>
      )}

      {selectedLog && (
        <AuditLogDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  )
}
