import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getUsers, getServices } from '../api/authApi'
import { useAuth } from '../context/AuthContext'
import { User, Mail, Phone, MapPin, Briefcase, Activity } from 'lucide-react'

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

      <div className="detail-grid-layout">
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
      </div>
    </div>
  )
}
