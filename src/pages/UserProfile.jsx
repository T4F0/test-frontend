import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getUsers, getServices, changePassword } from '../api/authApi'
import { useAuth } from '../context/AuthContext'
import { User, Mail, Phone, MapPin, Briefcase, Activity, Lock } from 'lucide-react'

const ROLE_LABELS = {
  MEDECIN: 'Médecin traitant',
  COORDINATEUR: 'Coordinateur',
  ADMIN: 'Administrateur'
}

export default function UserProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  
  const [user, setUser] = useState(null)
  const [serviceName, setServiceName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Change Password states
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState(null)
  const [pwdSuccess, setPwdSuccess] = useState(null)

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    
    if (newPassword !== confirmNewPassword) {
      setPwdError('Les nouveaux mots de passe ne correspondent pas')
      setPwdSuccess(null)
      return
    }

    if (newPassword.length < 6) {
      setPwdError('Le nouveau mot de passe doit contenir au moins 6 caractères')
      setPwdSuccess(null)
      return
    }

    try {
      setPwdLoading(true)
      setPwdError(null)
      setPwdSuccess(null)
      await changePassword(oldPassword, newPassword)
      setPwdSuccess('Votre mot de passe a été modifié avec succès.')
      setOldPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (err) {
      const data = err.response?.data
      setPwdError(
        data?.old_password?.[0] || 
        data?.new_password?.[0] || 
        data?.detail || 
        'Échec de la modification du mot de passe'
      )
      console.error(err)
    } finally {
      setPwdLoading(false)
    }
  }

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true)
        const users = await getUsers()
        const foundUser = Array.isArray(users) ? users.find(u => u.id === id) : users.find(u => u.id === id)
        
        if (foundUser) {
          setUser(foundUser)
          
          if (foundUser.service) {
            try {
              const services = await getServices()
              const servicesArray = Array.isArray(services) ? services : (services?.results || [])
              const foundService = servicesArray.find(s => s.id === foundUser.service || s.id === parseInt(foundUser.service))
              if (foundService) {
                setServiceName(foundService.name)
              }
            } catch (err) {
              console.error("Failed to load services", err)
            }
          }
        } else {
          setError('Utilisateur introuvable')
        }
      } catch (err) {
        setError('Échec du chargement du profil')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchUser()
  }, [id])

  if (loading) return <div className="loading">Chargement du profil...</div>
  if (error) return <div className="error">{error}</div>
  if (!user) return <div className="error">Utilisateur introuvable</div>

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username

  return (
    <div className="meeting-detail-container">
      <div className="detail-header">
        <h1>Profil Utilisateur</h1>
        <div className="detail-actions">
          {['ADMIN', 'COORDINATEUR'].includes(currentUser?.role) && (
            <button className="btn-secondary" onClick={() => navigate(`/users/${id}/edit`)}>Modifier</button>
          )}
          <button className="btn-secondary" onClick={() => navigate(-1)}>Retour</button>
        </div>
      </div>

      <div className="detail-grid-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        <div className="detail-card info-card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', borderBottom: '1px solid var(--gray-200)', paddingBottom: '2rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
              {user.first_name?.[0] || user.username?.[0] || 'U'}
            </div>
            <div>
              <h2 style={{ border: 'none', margin: 0, padding: 0, fontSize: '2rem' }}>{fullName}</h2>
              <span className={`status-badge planned`} style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                {ROLE_LABELS[user.role] || user.role}
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="profile-data-row">
              <div className="profile-data-label"><Mail size={18} /> Email</div>
              <div className="profile-data-value">{user.email || 'Non renseigné'}</div>
            </div>
            <div className="profile-data-row">
              <div className="profile-data-label"><User size={18} /> Nom d'utilisateur</div>
              <div className="profile-data-value">{user.username}</div>
            </div>
            <div className="profile-data-row">
              <div className="profile-data-label"><Phone size={18} /> Téléphone</div>
              <div className="profile-data-value">{user.phone_number || 'Non renseigné'}</div>
            </div>
            <div className="profile-data-row">
              <div className="profile-data-label"><MapPin size={18} /> Hôpital / Wilaya</div>
              <div className="profile-data-value">{user.hospital || 'Non renseigné'}</div>
            </div>
            {(user.service || serviceName) && (
              <div className="profile-data-row">
                <div className="profile-data-label"><Activity size={18} /> Service</div>
                <div className="profile-data-value">{serviceName || `Service ID: ${user.service}`}</div>
              </div>
            )}
          </div>
        </div>

        {currentUser?.id === user.id && (
          <div className="detail-card info-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: '1rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.35rem' }}>
              <Lock size={20} /> Modifier le mot de passe
            </h2>
            <form onSubmit={handlePasswordChange} className="login-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: 0 }}>
              {pwdSuccess && <div className="success" style={{ color: '#0f5132', background: '#d1e7dd', padding: '0.75rem', borderRadius: '8px', border: '1px solid #badbcc', fontSize: '0.9rem', fontWeight: '500' }}>{pwdSuccess}</div>}
              {pwdError && <div className="error" style={{ margin: 0 }}>{pwdError}</div>}
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block', color: 'var(--gray-900)' }}>Mot de passe actuel</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Entrez votre mot de passe actuel"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block', color: 'var(--gray-900)' }}>Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block', color: 'var(--gray-900)' }}>Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirmez le nouveau mot de passe"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={pwdLoading}
                className="login-button"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                {pwdLoading ? 'Modification en cours...' : 'Modifier le mot de passe'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
