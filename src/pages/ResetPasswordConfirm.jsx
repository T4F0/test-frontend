import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { resetPasswordConfirm } from '../api/authApi'
import { Lock, CheckCircle2, ArrowRight } from 'lucide-react'

export default function ResetPasswordConfirm() {
  const { uidb64, token } = useParams()
  const navigate = useNavigate()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await resetPasswordConfirm(uidb64, token, password)
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.password?.[0] || 'Le lien de réinitialisation est invalide ou a expiré')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🏥 e-RCP Algerie</h1>
        <p className="login-subtitle">Définir un nouveau mot de passe</p>

        {success ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            <CheckCircle2 size={64} color="var(--success, #10b981)" />
            <h2 style={{ fontSize: '1.25rem', border: 'none', padding: 0, margin: 0, color: 'var(--gray-900)' }}>Mot de passe réinitialisé</h2>
            <p style={{ color: 'var(--gray-600)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>
            <Link to="/login" className="login-button" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              Se connecter <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="error">{error}</div>}

            <div className="form-group">
              <label htmlFor="password">Nouveau mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  required
                  autoFocus
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Lock size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmez votre mot de passe"
                  required
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Lock size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-button"
              style={{ marginTop: '1.5rem' }}
            >
              {loading ? 'Réinitialisation...' : 'Enregistrer le mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
