import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createUser, updateUser, getUsers, getServices } from '../api/authApi'
import { useAuth } from '../context/AuthContext'
import { ALGERIA_WILAYAS } from '../lib/constants'

const ROLE_CHOICES = [
  { value: 'MEDECIN', label: 'Médecin traitant' },
  { value: 'COORDINATEUR', label: 'Coordinateur' },
  { value: 'ADMIN', label: 'Administrateur' }
]

export default function UserForm() {
  const { user: currentUser } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  useEffect(() => {
    if (currentUser?.role === 'MEDECIN') {
      navigate('/')
    }
  }, [currentUser, navigate])

  const [user, setUser] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'MEDECIN',
    hospital: '',
    phone_number: '',
    service: '',
    is_global_admin: false
  })
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchServices = async () => {
      if (currentUser?.is_global_admin) {
        try {
          const list = await getServices()
          setServices(Array.isArray(list) ? list : (list?.results || []))
        } catch (err) {
          console.error("Failed to load services:", err)
        }
      }
    }
    fetchServices()
  }, [currentUser])

  useEffect(() => {
    if (isEdit) {
      loadUser()
    }
  }, [id])

  const loadUser = async () => {
    try {
      const users = await getUsers()
      const foundUser = Array.isArray(users) ? users.find(u => u.id === id) : users.find(u => u.id === id)
      if (foundUser) {
        setUser({
          ...foundUser,
          service: foundUser.service || '',
          is_global_admin: foundUser.is_global_admin || false
        })
      }
    } catch (err) {
      setError('Échec du chargement de l\'utilisateur')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)

      // Copy user data to avoid modifying state directly
      const payload = { ...user }

      if (isEdit) {
        if (!payload.password) {
          delete payload.password
        }
        await updateUser(id, payload)
      } else {
        await createUser(payload)
      }

      navigate('/users')
    } catch (err) {
      const errorData = err.response?.data
      if (typeof errorData === 'object' && !Array.isArray(errorData)) {
        const fieldErrors = Object.entries(errorData)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n')
        setError(fieldErrors || 'Échec de l\'enregistrement de l\'utilisateur')
      } else {
        setError(err.response?.data?.detail || 'Échec de l\'enregistrement de l\'utilisateur')
      }
      console.error('Error details:', err.response?.data)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading">Chargement de l'utilisateur...</div>

  return (
    <div className="user-form-container">
      <h2>{isEdit ? 'Modifier l\'utilisateur' : 'Créer un nouvel utilisateur'}</h2>

      {error && <div className="error" style={{ whiteSpace: 'pre-line' }}>{error}</div>}

      <form onSubmit={handleSubmit} className="user-form">
        <div className="form-row">
          <div className="form-group">
            <label>Prénom *</label>
            <input
              type="text"
              value={user.first_name}
              onChange={(e) => setUser({ ...user, first_name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Nom *</label>
            <input
              type="text"
              value={user.last_name}
              onChange={(e) => setUser({ ...user, last_name: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={user.email}
              onChange={(e) => setUser({ ...user, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Nom d'utilisateur *</label>
            <input
              type="text"
              value={user.username}
              onChange={(e) => setUser({ ...user, username: e.target.value })}
              required
              disabled={isEdit}
            />
          </div>
        </div>

        {!isEdit && (
          <div className="form-group">
            <label>Mot de passe *</label>
            <input
              type="text"
              value={user.password}
              onChange={(e) => setUser({ ...user, password: e.target.value })}
              required
            />
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>Rôle *</label>
            <select
              value={user.role}
              onChange={(e) => setUser({ ...user, role: e.target.value })}
            >
              {ROLE_CHOICES.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Hôpital / Wilaya</label>
            <select
              value={user.hospital || ''}
              onChange={(e) => setUser({ ...user, hospital: e.target.value })}
            >
              <option value="">Sélectionnez une wilaya</option>
              {ALGERIA_WILAYAS.map((wilaya, index) => (
                <option key={index} value={wilaya}>
                  {wilaya}
                </option>
              ))}
            </select>
          </div>
        </div>

        {currentUser?.is_global_admin && (
          <div className="form-row">
            <div className="form-group">
              <label>Service</label>
              <select
                value={user.service || ''}
                onChange={(e) => setUser({ ...user, service: e.target.value })}
              >
                <option value="">Sélectionnez un service</option>
                {services.map(srv => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
              <input
                type="checkbox"
                id="is_global_admin"
                checked={user.is_global_admin || false}
                onChange={(e) => setUser({ ...user, is_global_admin: e.target.checked })}
                style={{ width: 'auto' }}
              />
              <label htmlFor="is_global_admin" style={{ margin: 0, cursor: 'pointer', fontWeight: 500 }}>Administrateur Global</label>
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Numéro de téléphone</label>
          <input
            type="tel"
            value={user.phone_number || ''}
            onChange={(e) => setUser({ ...user, phone_number: e.target.value })}
            placeholder="Ex: +213 6 12 34 56 78"
          />
        </div>

        <div className="form-actions">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer l\'utilisateur'}
          </button>
          <button type="button" onClick={() => navigate('/users')}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
