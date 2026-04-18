import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsers, deleteUser, getPendingRegistrations, approveRegistration, rejectRegistration } from '../api/authApi'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS = {
  'MEDECIN': 'Médecin',
  'COORDINATEUR': 'Coordinateur',
  'ADMIN': 'Administrateur'
}

export default function UserManagement() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('active')
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersData, pendingData] = await Promise.all([
        getUsers(),
        getPendingRegistrations().catch(() => []) 
      ])
      setUsers(Array.isArray(usersData) ? usersData : (usersData?.results || []))
      setPendingUsers(Array.isArray(pendingData) ? pendingData : (pendingData?.results || []))
      setError(null)
    } catch (err) {
      setError('Échec du chargement des données utilisateurs')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      try {
        await deleteUser(id)
        setUsers(users.filter(u => u.id !== id))
      } catch (err) {
        setError('Échec de la suppression de l\'utilisateur')
      }
    }
  }

  const handleApprove = async (id) => {
    try {
      await approveRegistration(id)
      loadData()
    } catch (err) {
      setError('Échec de l\'approbation de l\'utilisateur')
    }
  }

  const handleReject = async (id) => {
    if (confirm('Êtes-vous sûr de vouloir rejeter cette inscription ?')) {
      try {
        await rejectRegistration(id)
        loadData()
      } catch (err) {
        setError('Échec du rejet de l\'utilisateur')
      }
    }
  }

  if (loading) return <div className="loading">Chargement des utilisateurs...</div>

  return (
    <div className="users-management">
      <div className="users-header">
        <h2>Gestion des utilisateurs</h2>
        <button onClick={() => navigate('/users/new')} className="btn-primary">
          + Ajouter un utilisateur
        </button>
      </div>

      <div className="tabs" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
        <button 
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
          style={{ padding: '0.5rem 1rem', border: 'none', borderBottom: activeTab === 'active' ? '2px solid #0056b3' : 'none', background: 'none', cursor: 'pointer', fontWeight: activeTab === 'active' ? 'bold' : 'normal' }}
        >
          Utilisateurs actifs
        </button>
        <button 
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
          style={{ padding: '0.5rem 1rem', border: 'none', borderBottom: activeTab === 'pending' ? '2px solid #0056b3' : 'none', background: 'none', cursor: 'pointer', fontWeight: activeTab === 'pending' ? 'bold' : 'normal' }}
        >
          Inscriptions en attente {pendingUsers.length > 0 && `(${pendingUsers.length})`}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {activeTab === 'active' && (
        users.length === 0 ? (
          <div className="empty">Aucun utilisateur trouvé</div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Hôpital</th>
                <th>Spécialité</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.approval_status !== 'PENDING' && u.approval_status !== 'REJECTED').map(user => (
                <tr key={user.id}>
                  <td>{user.first_name} {user.last_name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge badge-${user.role.toLowerCase()}`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td>{user.hospital || '-'}</td>
                  <td>{user.specialty || '-'}</td>
                  <td className="actions">
                    <button 
                      onClick={() => navigate(`/users/${user.id}/edit`)}
                      className="btn-small"
                    >
                      Modifier
                    </button>
                    {currentUser?.role === 'ADMIN' && (
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="btn-small btn-danger"
                      >
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {activeTab === 'pending' && (
        pendingUsers.length === 0 ? (
          <div className="empty">Aucune inscription en attente trouvée</div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Hôpital</th>
                <th>Spécialité</th>
                <th>Soumis le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.first_name} {user.last_name}</td>
                  <td>{user.email}</td>
                  <td>{user.hospital || '-'}</td>
                  <td>{user.specialty || '-'}</td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="actions" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => handleApprove(user.id)}
                      className="btn-small"
                      style={{ backgroundColor: '#28a745', color: 'white', border: 'none' }}
                    >
                      Approuver
                    </button>
                    <button 
                      onClick={() => handleReject(user.id)}
                      className="btn-small btn-danger"
                    >
                      Rejeter
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  )
}
