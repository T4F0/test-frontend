import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register, getPublicServices } from '../api/authApi'
import { ALGERIA_WILAYAS } from '../lib/constants'
import { validatePhoneNumber } from '../lib/validators'

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    hospital: '',
    phone_number: '+213',
    service: ''
  })
  const [services, setServices] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const list = await getPublicServices()
        setServices(Array.isArray(list) ? list : (list?.results || []))
      } catch (err) {
        console.error("Failed to load services:", err)
      }
    }
    fetchServices()
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handlePhoneChange = (e) => {
    const val = e.target.value
    // Always enforce +213 prefix — cannot be deleted
    const safe = !val.startsWith('+213')
      ? ('+213'.startsWith(val) ? '+213' : '+213' + val.replace(/^\+?2?1?3?/, ''))
      : val
    setFormData({ ...formData, phone_number: safe })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.phone_number && !validatePhoneNumber(formData.phone_number)) {
      setError('Le numéro de téléphone doit commencer par +213 suivi de 9 chiffres.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await register(formData)
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.username?.[0] || 'Échec de l\'inscription')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <h1>🏥 Inscription envoyée</h1>
          <p style={{ marginTop: '1rem', color: '#666' }}>
            Votre demande d'inscription a été soumise avec succès à l'administrateur. 
            Vous serez notifié(e) une fois votre compte approuvé.
          </p>
          <button 
            className="login-button" 
            style={{ marginTop: '2rem' }}
            onClick={() => navigate('/login')}
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: '500px' }} data-nosnippet="">
        <h1>🏥 Inscription Médecin</h1>
        <p className="login-subtitle">Rejoindre la plateforme de formulaires médicaux</p>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error">{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Prénom</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Nom</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Nom d'utilisateur</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>E-mail</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="text"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Service</label>
            <select
              name="service"
              value={formData.service}
              onChange={handleChange}
              required
            >
              <option value="" disabled hidden>Sélectionnez un service</option>
              {services.map(srv => (
                <option key={srv.id} value={srv.id}>
                  {srv.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Numéro de téléphone</label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number || '+213'}
              onChange={handlePhoneChange}
              placeholder="+213612345678"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="login-button"
            style={{ marginTop: '1rem' }}
          >
            {loading ? 'Envoi en cours...' : 'S\'inscrire'}
          </button>
        </form>

        <p className="login-footer">
          Vous avez déjà un compte ? <Link to="/login">Connectez-vous ici</Link>
        </p>
      </div>
    </div>
  )
}
