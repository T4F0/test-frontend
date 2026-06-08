import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { forgotPassword } from '../api/authApi'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      await forgotPassword(email)
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.email?.[0] || "Échec de l'envoi de l'e-mail de réinitialisation")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🏥 e-RCP Algerie</h1>
        <p className="login-subtitle">Réinitialisation de mot de passe</p>

        {success ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            <CheckCircle2 size={64} color="var(--success, #10b981)" />
            <h2 style={{ fontSize: '1.25rem', border: 'none', padding: 0, margin: 0, color: 'var(--gray-900)' }}>E-mail envoyé</h2>
            <p style={{ color: 'var(--gray-600)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Si l'adresse email existe, un lien de réinitialisation vous a été envoyé. Veuillez vérifier votre boîte de réception (et vos spams).
            </p>
            <Link to="/login" className="login-button" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <ArrowLeft size={18} /> Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="error">{error}</div>}

            <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
              Saisissez l'adresse e-mail associée à votre compte hospitalier. Nous vous enverrons un lien de réinitialisation.
            </p>

            <div className="form-group">
              <label htmlFor="email">Adresse e-mail</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@hopital.dz"
                  required
                  autoFocus
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Mail size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-button"
              style={{ marginTop: '1rem' }}
            >
              {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
            </button>
            
            <p className="login-footer" style={{ marginTop: '1.5rem' }}>
              <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none', color: 'var(--primary)' }}>
                <ArrowLeft size={16} /> Retour à la connexion
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
