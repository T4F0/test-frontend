import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createUser, updateUser, getUsers } from '../api/authApi'
import { useAuth } from '../context/AuthContext'

const ROLE_CHOICES = [
  { value: 'MEDECIN', label: 'Médecin' },
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
    specialty: ''
  })
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

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
        setUser(foundUser)
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

      if (isEdit) {
        delete user.password // Don't update password if empty
        if (!user.password) {
          const { password, ...userData } = user
          await updateUser(id, userData)
        } else {
          await updateUser(id, user)
        }
      } else {
        await createUser(user)
      }

      navigate('/users')
    } catch (err) {
      const errorData = err.response?.data
      if (typeof errorData === 'object' && !Array.isArray(errorData)) {
        // Show field-specific errors
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

      {error && <div className="error">{error}</div>}

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
            <label>Hôpital</label>
            <input
              type="text"
              value={user.hospital || ''}
              onChange={(e) => setUser({ ...user, hospital: e.target.value })}
              placeholder="Nom de l'établissement"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Spécialité</label>
          <input
            type="text"
            value={user.specialty || ''}
            onChange={(e) => setUser({ ...user, specialty: e.target.value })}
            placeholder="Spécialité médicale"
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
