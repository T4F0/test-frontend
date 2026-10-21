import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login, getCurrentUser } from '../api/authApi'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Activity } from 'lucide-react'
import TwoFactorPrompt from '../components/TwoFactorPrompt'

export default function Login() {

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [otpRequired, setOtpRequired] = useState(false)
  const [otpError, setOtpError] = useState(null)
  const navigate = useNavigate()
  const { setUser } = useAuth()

  const attempt = async (otp) => {
    try {
      setLoading(true)
      setError(null)
      setOtpError(null)
      await login(username, password, otp)
      // Reload user data
      const userData = await getCurrentUser()
      setUser(userData)
      navigate('/')
    } catch (err) {
      if (err.response?.data?.otp_required) {
        setOtpRequired(true)
        // The first answer only asks for a code; later ones say the code was refused
        setOtpError(otp ? err.response.data.detail || 'Code incorrect.' : null)
      } else {
        setOtpRequired(false)
        setError(err.response?.data?.detail || 'Échec de la connexion')
      }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    attempt(undefined)
  }

  return (
    <div className="login-container">
      <div className="login-card" data-nosnippet="">
        <h1><Activity size={26} aria-hidden="true" style={{ verticalAlign: '-4px', marginRight: 8 }} />e-RCP Algerie</h1>
        <p className="login-subtitle">Portail de coordination des RCP</p>

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
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez votre mot de passe"
                required
                autoComplete="current-password"
                style={{ paddingRight: '2.5rem', width: '100%', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0 0.35rem',
                  minWidth: 40,
                  minHeight: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                tabIndex="-1"
                title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        {otpRequired && (
          <TwoFactorPrompt
            error={otpError}
            loading={loading}
            onSubmit={attempt}
            onCancel={() => { setOtpRequired(false); setOtpError(null) }}
          />
        )}

        <p className="login-footer">
          Identifiants : Utilisez votre compte hospitalier
        </p>
        <p className="login-footer" style={{ marginTop: '0.5rem' }}>
          <Link to="/forgot-password">Mot de passe oublié ?</Link>
        </p>
        <p className="login-footer" style={{ marginTop: '0.5rem' }}>
          Vous n'avez pas de compte ? <Link to="/register">Inscrivez-vous ici</Link>
        </p>
      </div>
    </div>
  )
}
