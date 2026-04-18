import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login, getCurrentUser } from '../api/authApi'
import { useAuth } from '../context/AuthContext'

export default function Login() {

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setUser } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      await login(username, password)
      // Reload user data
      const userData = await getCurrentUser()
      setUser(userData)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Échec de la connexion')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🏥 Formulaires Médicaux</h1>
        <p className="login-subtitle">Système d'Information Patient</p>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Nom d'utilisateur</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Entrez votre nom d'utilisateur"
              required
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Entrez votre mot de passe"
              required
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <p className="login-footer">
          Identifiants : Utilisez votre compte hospitalier
        </p>
        <p className="login-footer" style={{ marginTop: '0.5rem' }}>
          Vous n'avez pas de compte ? <Link to="/register">Inscrivez-vous ici</Link>
        </p>
      </div>
    </div>
  )
}
