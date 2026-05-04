import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '../api/authApi'
import { ALGERIA_WILAYAS } from '../lib/constants'

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    hospital: '',
    phone_number: ''
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
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
      <div className="login-card" style={{ maxWidth: '500px' }}>
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
            <label>Hôpital / Wilaya</label>
            <select
              name="hospital"
              value={formData.hospital}
              onChange={handleChange}
              required
            >
              <option value="">Sélectionnez une wilaya</option>
              {ALGERIA_WILAYAS.map((wilaya, index) => (
                <option key={index} value={wilaya}>
                  {wilaya}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Numéro de téléphone</label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="Ex: +213 6 12 34 56 78"
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
