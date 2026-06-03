import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  getUsers, 
  deleteUser, 
  getPendingRegistrations, 
  approveRegistration, 
  rejectRegistration,
  getServices,
  createService,
  deleteService,
  updateService
} from '../api/authApi'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../lib/dateUtils'

const ROLE_LABELS = {
  'MEDECIN': 'Médecin traitant',
  'COORDINATEUR': 'Coordinateur',
  'ADMIN': 'Administrateur'
}

export default function UserManagement() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('active')
  const [search, setSearch] = useState('')

  // Service creation state
  const [newServiceName, setNewServiceName] = useState('')
  const [serviceError, setServiceError] = useState(null)
  const [serviceSaving, setServiceSaving] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const promises = [
        getUsers(),
        getPendingRegistrations().catch(() => [])
      ]
      
      if (currentUser?.is_global_admin) {
        promises.push(getServices().catch(() => []))
      }
      
      const [usersData, pendingData, servicesData] = await Promise.all(promises)
      setUsers(Array.isArray(usersData) ? usersData : (usersData?.results || []))
      setPendingUsers(Array.isArray(pendingData) ? pendingData : (pendingData?.results || []))
      if (servicesData) {
        setServices(Array.isArray(servicesData) ? servicesData : (servicesData?.results || []))
      }
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

  // Services management actions
  const handleCreateService = async (e) => {
    e.preventDefault()
    if (!newServiceName.trim()) return
    try {
      setServiceSaving(true)
      setServiceError(null)
      await createService({ name: newServiceName })
      setNewServiceName('')
      const updatedServices = await getServices()
      setServices(Array.isArray(updatedServices) ? updatedServices : (updatedServices?.results || []))
    } catch (err) {
      setServiceError(err.response?.data?.name?.[0] || err.response?.data?.detail || "Échec de la création du service")
      console.error(err)
    } finally {
      setServiceSaving(false)
    }
  }

  const handleToggleService = async (service) => {
    try {
      setServiceError(null)
      await updateService(service.id, { is_active: !service.is_active })
      const updatedServices = await getServices()
      setServices(Array.isArray(updatedServices) ? updatedServices : (updatedServices?.results || []))
    } catch (err) {
      setServiceError("Échec de la mise à jour du service")
      console.error(err)
    }
  }

  const handleDeleteService = async (id) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) {
      try {
        setServiceError(null)
        await deleteService(id)
        setServices(services.filter(s => s.id !== id))
      } catch (err) {
        setServiceError(err.response?.data?.detail || "Échec de la suppression du service (les services contenant des utilisateurs ou des données ne peuvent pas être supprimés)")
        console.error(err)
      }
    }
  }

  if (loading) return <div className="loading">Chargement des données...</div>

  // Filter: For coordinators, only show MEDECIN
  const isCoordinateur = currentUser?.role === 'COORDINATEUR'
  
  const activeUsers = users.filter(u => 
    u.approval_status !== 'PENDING' && 
    u.approval_status !== 'REJECTED' &&
    (!isCoordinateur || u.role === 'MEDECIN')
  )
  
  const searchLower = search.toLowerCase()
  const filteredUsers = activeUsers.filter(u =>
    !search ||
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchLower) ||
    (u.email || '').toLowerCase().includes(searchLower) ||
    (u.hospital || '').toLowerCase().includes(searchLower) ||
    (u.service_name || '').toLowerCase().includes(searchLower)
  )

  return (
    <div className="users-management">
      <div className="users-header">
        <h2>{isCoordinateur ? 'Gestion des médecins' : 'Gestion des utilisateurs'}</h2>
        <button onClick={() => navigate('/users/new')} className="btn-primary">
          + Ajouter un {isCoordinateur ? 'médecin' : 'utilisateur'}
        </button>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Rechercher par nom, email, hôpital ou service..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
          style={{ width: '100%', maxWidth: '420px' }}
        />
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
        {currentUser?.is_global_admin && (
          <button 
            className={`tab ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
            style={{ padding: '0.5rem 1rem', border: 'none', borderBottom: activeTab === 'services' ? '2px solid #0056b3' : 'none', background: 'none', cursor: 'pointer', fontWeight: activeTab === 'services' ? 'bold' : 'normal' }}
          >
            Services
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {activeTab === 'active' && (
        users.length === 0 ? (
          <div className="empty">Aucun utilisateur trouvé</div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty">Aucun résultat pour "{search}"</div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                {currentUser?.is_global_admin && <th>Service</th>}
                <th>Hôpital</th>
                <th>Téléphone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.first_name} {user.last_name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge badge-${user.role.toLowerCase()}`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  {currentUser?.is_global_admin && (
                    <td>
                      <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {user.service_name || '-'}
                      </span>
                    </td>
                  )}
                  <td>{user.hospital || '-'}</td>
                  <td>{user.phone_number || '-'}</td>
                  <td className="actions">
                    {user.role === 'MEDECIN' && (
                      <button
                        onClick={() => navigate(`/patients?doctor=${user.id}`)}
                        className="btn-small btn-info"
                        style={{ marginRight: '5px' }}
                        title="Voir les patients de ce médecin"
                      >
                        👥 Voir patients
                      </button>
                    )}
                    <button 
                      onClick={() => navigate(`/users/${user.id}/edit`)}
                      className="btn-small"
                      style={{ marginRight: '5px' }}
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
                  <td>{formatDate(user.created_at)}</td>
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

      {activeTab === 'services' && currentUser?.is_global_admin && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '2rem', marginTop: '1.5rem' }}>
          {/* Create Service form */}
          <div className="card" style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Créer un nouveau service</h3>
            {serviceError && <div className="error" style={{ marginBottom: '1rem' }}>{serviceError}</div>}
            <form onSubmit={handleCreateService}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Nom du service *</label>
                <input
                  type="text"
                  placeholder="Ex: Pneumologie"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <button 
                type="submit" 
                disabled={serviceSaving}
                className="btn-primary"
                style={{ width: '100%' }}
              >
                {serviceSaving ? 'Création...' : 'Créer le service'}
              </button>
            </form>
          </div>

          {/* List of Services */}
          <div>
            <h3 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Liste des services</h3>
            {serviceError && !services.length && <div className="error" style={{ marginBottom: '1rem' }}>{serviceError}</div>}
            {services.length === 0 ? (
              <div className="empty">Aucun service créé</div>
            ) : (
              <div>
                {serviceError && <div className="error" style={{ marginBottom: '1rem' }}>{serviceError}</div>}
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Slug / Code</th>
                      <th>Statut</th>
                      <th>Date de création</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map(service => (
                      <tr key={service.id}>
                        <td style={{ fontWeight: 600 }}>{service.name}</td>
                        <td><code>{service.slug}</code></td>
                        <td>
                          <span className={`badge ${service.is_active ? 'badge-active' : 'badge-inactive'}`} style={{ backgroundColor: service.is_active ? '#def7ec' : '#fde8e8', color: service.is_active ? '#03543f' : '#9b1c1c', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {service.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td>{formatDate(service.created_at)}</td>
                        <td className="actions" style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleToggleService(service)}
                            className="btn-small"
                            style={{ backgroundColor: service.is_active ? '#e2e8f0' : '#2563eb', color: service.is_active ? '#334155' : 'white', border: 'none' }}
                          >
                            {service.is_active ? 'Désactiver' : 'Activer'}
                          </button>
                          {service.slug !== 'default' && (
                            <button
                              onClick={() => handleDeleteService(service.id)}
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
