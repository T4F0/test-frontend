import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getMeetings, deleteMeeting } from '../api/meetingsApi'
import { useAuth } from '../context/AuthContext'

const STATUS_LABELS = { PLANNED: 'Planifiée', LIVE: 'En cours', FINISHED: 'Terminée' }

export default function MeetingsList() {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const [searchParams] = useSearchParams()
  const filterCase = searchParams.get('medical_case') || ''
  const navigate = useNavigate()
  const { user } = useAuth()
  const canManage = user?.role === 'ADMIN' || user?.role === 'COORDINATEUR'

  useEffect(() => {
    loadMeetings()
  }, [filter, filterCase])

  const loadMeetings = async () => {
    try {
      setLoading(true)
      const params = { ...(filter && { status: filter }), ...(filterCase && { medical_case: filterCase }) }
      const data = await getMeetings(params)
      setMeetings(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      setError('Échec du chargement des réunions')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette réunion ?')) return
    try {
      await deleteMeeting(id)
      setMeetings(meetings.filter((m) => m.id !== id))
    } catch (err) {
      setError('Échec de la suppression de la réunion')
    }
  }

  if (loading) return <div className="loading">Chargement des réunions...</div>

  return (
    <div className="list-container">
      <div className="list-header">
        <h1>Réunions</h1>
        <div className="list-header-actions">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Tous les statuts</option>
            <option value="PLANNED">Planifiée</option>
            <option value="LIVE">En cours</option>
            <option value="FINISHED">Terminée</option>
          </select>
          <button className="btn-primary" onClick={() => navigate('/meetings/new')}>
            + Nouvelle réunion
          </button>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {meetings.length === 0 ? (
        <p className="empty">Aucune réunion trouvée.</p>
      ) : (
        <table className="forms-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Dossier médical</th>
              <th>Statut</th>
              <th>Spécialité</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.scheduled_date).toLocaleString()}</td>
                <td>{m.medical_case ? String(m.medical_case).slice(0, 8) + '…' : '—'}</td>
                <td><span className="badge">{STATUS_LABELS[m.status] ?? m.status}</span></td>
                <td>{m.specialty || '—'}</td>
                <td className="actions">
                  <button className="btn-small btn-secondary" onClick={() => navigate(`/meetings/${m.id}`)}>Voir</button>
                  <button className="btn-small btn-secondary" onClick={() => navigate(`/meetings/${m.id}/edit`)}>Modifier</button>
                  <button className="btn-small btn-danger" onClick={() => handleDelete(m.id)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
