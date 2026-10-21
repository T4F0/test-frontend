import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getForms, deleteForm } from '../api/formsApi'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../lib/dateUtils'
import ExportFormsModal from '../components/ExportFormsModal'
import DecisionOptionsModal from '../components/DecisionOptionsModal'
import { Search, Download, Gavel, FileText, Pencil, Trash2, ListChecks, FilePlus2, ClipboardList } from 'lucide-react'
import RowActionMenu from '../components/RowActionMenu'
import SortHeader from '../components/SortHeader'
import EmptyState from '../components/EmptyState'
import TableSkeleton from '../components/TableSkeleton'
import { useConfirm } from '../components/ConfirmDialog'
import { nextSort, sortRows } from '../lib/sorting'
import { filterAndRank } from '../lib/search'

export default function FormsList() {
  const [forms, setForms] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [decisionForm, setDecisionForm] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const preselectPatientId = location.state?.preselectPatientId
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [showExportModal, setShowExportModal] = useState(false)
  const [sort, setSort] = useState(null)
  const confirm = useConfirm()

  useEffect(() => {
    loadForms()
  }, [])

  const loadForms = async () => {
    try {
      setLoading(true)
      const data = await getForms()
      const formsArray = Array.isArray(data) ? data : (data?.results || [])
      setForms(formsArray)
      setError(null)
    } catch (err) {
      setError('Failed to load forms: ' + err.message)
      console.error('Full error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    const form = forms.find((f) => f.id === id)
    const ok = await confirm({
      title: 'Supprimer ce formulaire ?',
      message: `« ${form?.name || 'Ce formulaire'} » et ses soumissions associées seront supprimés. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteForm(id)
      setForms(forms.filter(f => f.id !== id))
    } catch (err) {
      setError('Échec de la suppression du formulaire')
    }
  }

  const filteredForms = sortRows(
    filterAndRank(forms, search, (form) => `${form.name || ''} ${form.description || ''}`),
    sort,
    { created: (form) => (form.created_at ? new Date(form.created_at) : null) },
  )
  const canFill = user?.role === 'MEDECIN'
  const canSeeSubmissions = user?.role !== 'COORDINATEUR'
  const canManageDecisions = isAdmin || user?.role === 'COORDINATEUR'
  const openForm = (form) =>
    canFill
      ? navigate(`/forms/${form.id}/submit`, { state: { preselectPatientId } })
      : canSeeSubmissions
        ? navigate(`/forms/${form.id}/submissions`)
        : navigate(`/forms/${form.id}/edit`)

  if (loading) {
    return (
      <div className="forms-list">
        <div className="list-header"><h1>Formulaires</h1></div>
        <TableSkeleton rows={5} columns={4} label="Chargement des formulaires…" />
      </div>
    )
  }
  if (error) return <div className="error">{error}</div>

  return (
    <div className="forms-list">
      <div className="list-header">
        <h1>Formulaires</h1>
        <div className="list-header-actions" style={{ display: "flex", gap: "0.75rem" }}>
          {isAdmin && (
            <button className="btn-secondary btn-with-icon" onClick={() => setShowExportModal(true)}>
              <Download size={16} />
              Exporter
            </button>
          )}
          <button className="btn-create-form" onClick={() => navigate('/forms/new')}>
            <span className="btn-icon">+</span> Créer un formulaire
          </button>
        </div>
      </div>
      
      {forms.length > 0 && (
        <div style={{ position: 'relative', maxWidth: '500px', marginBottom: '1.5rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input
            type="text"
            placeholder="Rechercher un formulaire..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="modern-search-input"
            style={{ width: '100%', padding: '0.85rem 2.5rem 0.85rem 2.75rem' }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '1rem',
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
      )}
      
      {forms.length > 0 && (
        <div className="ui-count" aria-live="polite" style={{ marginBottom: '0.75rem' }}>
          {search ? `${filteredForms.length} résultat${filteredForms.length > 1 ? 's' : ''} sur ${forms.length}` : `${forms.length} formulaire${forms.length > 1 ? 's' : ''}`}
        </div>
      )}

      {forms.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucun formulaire"
          description="Les formulaires définissent les informations demandées pour chaque dossier RCP."
          action={<Link to="/forms/new" className="ui-btn ui-btn-primary"><FilePlus2 size={16} /> Créer un formulaire</Link>}
        />
      ) : filteredForms.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Aucun résultat"
          description={`Aucun formulaire ne correspond à « ${search} ».`}
          action={<button type="button" className="ui-btn ui-btn-ghost" onClick={() => setSearch('')}>Effacer la recherche</button>}
        />
      ) : (
        <>
        <div className="forms-table-wrapper table-responsive-wrapper">
          <table className="forms-table" style={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: '24%' }} />
              <col style={{ width: '36%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '27%' }} />
            </colgroup>
            <thead>
              <tr>
                <SortHeader label="Nom" sortKey="name" sort={sort} onSort={(k) => setSort(nextSort(sort, k))} />
                <SortHeader label="Description" sortKey="description" sort={sort} onSort={(k) => setSort(nextSort(sort, k))} />
                <SortHeader label="Créé" sortKey="created" sort={sort} onSort={(k) => setSort(nextSort(sort, k))} />
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filteredForms.map(form => (
                <tr key={form.id} className="ui-row-link" onClick={() => openForm(form)}>
                  <td style={{ wordBreak: 'break-word', whiteSpace: 'normal', fontWeight: 600 }}>{form.name}</td>
                  <td style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>{form.description}</td>
                  <td>{formatDate(form.created_at)}</td>
                  <td className="actions" onClick={(e) => e.stopPropagation()}>
                    <div className="ui-row-actions">
                      {canFill ? (
                        <button type="button" className="ui-primary-action" onClick={() => openForm(form)}>
                          <FileText size={15} aria-hidden="true" /> Remplir
                        </button>
                      ) : canSeeSubmissions ? (
                        <button type="button" className="ui-primary-action" onClick={() => navigate(`/forms/${form.id}/submissions`)}>
                          <ListChecks size={15} aria-hidden="true" /> Soumissions
                        </button>
                      ) : null}
                      <RowActionMenu
                        label={`Autres actions pour ${form.name}`}
                        items={[
                          { label: 'Voir les soumissions', icon: ListChecks, hidden: !canFill || !canSeeSubmissions, onClick: () => navigate(`/forms/${form.id}/submissions`) },
                          { label: 'Décisions RCP', icon: Gavel, hidden: !canManageDecisions, onClick: () => setDecisionForm(form) },
                          { label: 'Modifier le formulaire', icon: Pencil, onClick: () => navigate(`/forms/${form.id}/edit`) },
                          { label: 'Supprimer', icon: Trash2, danger: true, hidden: !isAdmin, onClick: () => handleDelete(form.id) },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-cards">
          {filteredForms.map(form => (
            <div key={form.id} className="mobile-card" onClick={() => navigate(`/forms/${form.id}/submissions`)}>
              <div className="mobile-card-header">
                <div className="mobile-card-title">
                  <strong>{form.name}</strong>
                  <div className="text-muted" style={{fontSize: '0.8rem'}}>
                    {form.description?.substring(0, 80)}{(form.description?.length > 80) ? '...' : ''}
                  </div>
                </div>
              </div>
              <div className="mobile-card-body">
                <span className="text-muted" style={{fontSize: '0.8rem'}}>Créé le {formatDate(form.created_at)}</span>
              </div>
              <div className="mobile-card-actions">
                {user?.role === 'MEDECIN' && (
                  <button className="btn-small" onClick={(e) => { e.stopPropagation(); navigate(`/forms/${form.id}/submit`, { state: { preselectPatientId } }); }}>Remplir</button>
                )}
                <button className="btn-small btn-secondary" onClick={(e) => { e.stopPropagation(); navigate(`/forms/${form.id}/submissions`); }}>Voir les soumissions</button>
                {(isAdmin || user?.role === 'COORDINATEUR') && (
                  <button
                    className="btn-small"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
                    onClick={(e) => { e.stopPropagation(); setDecisionForm(form); }}
                  >
                    <Gavel size={14} /> Décisions
                  </button>
                )}
                {user?.role !== 'COORDINATEUR' && (
                  <button className="btn-small btn-outline" onClick={(e) => { e.stopPropagation(); navigate(`/forms/${form.id}/edit`); }}>Modifier</button>
                )}
                {isAdmin && (
                  <button className="btn-small btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(form.id); }}>Supprimer</button>
                )}
              </div>
            </div>
          ))}
        </div>
        </>
      )}
      {showExportModal && <ExportFormsModal onClose={() => setShowExportModal(false)} />}
      <DecisionOptionsModal
        isOpen={!!decisionForm}
        onClose={() => setDecisionForm(null)}
        form={decisionForm}
      />
    </div>
  )
}
