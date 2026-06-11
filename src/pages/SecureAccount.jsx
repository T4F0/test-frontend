import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { secureAccount } from '../api/authApi'
import { Shield, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'

export default function SecureAccount() {
  const { uidb64, token } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let active = true
    const performSecuring = async () => {
      try {
        setLoading(true)
        setError(null)
        await secureAccount(uidb64, token)
        if (active) {
          setSuccess(true)
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.detail || 'Le lien de sécurisation est invalide ou a expiré')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }
    performSecuring()
    return () => {
      active = false
    }
  }, [uidb64, token])

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🏥 e-RCP Algerie</h1>
        <p className="login-subtitle">Sécurisation du compte</p>

        {loading ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            <Shield size={64} color="var(--primary, #007bff)" style={{ animation: 'pulse 1.5s infinite' }} />
            <h2 style={{ fontSize: '1.25rem', border: 'none', padding: 0, margin: 0, color: 'var(--gray-900)' }}>Sécurisation en cours...</h2>
            <p style={{ color: 'var(--gray-600)', fontSize: '0.95rem' }}>
              Nous sécurisons votre compte et désactivons le mot de passe compromis.
            </p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            <XCircle size={64} color="var(--danger, #dc3545)" />
            <h2 style={{ fontSize: '1.25rem', border: 'none', padding: 0, margin: 0, color: 'var(--gray-900)' }}>Échec de la sécurisation</h2>
            <p style={{ color: 'var(--gray-600)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              {error}
            </p>
            <Link to="/login" className="login-button" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              Retour à la page de connexion <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            <CheckCircle2 size={64} color="var(--success, #10b981)" />
            <h2 style={{ fontSize: '1.25rem', border: 'none', padding: 0, margin: 0, color: 'var(--gray-900)' }}>Compte sécurisé</h2>
            <p style={{ color: 'var(--gray-600)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Votre compte a été sécurisé avec succès et le mot de passe compromis a été désactivé.
            </p>
            <p style={{ color: 'var(--gray-600)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Un e-mail de réinitialisation vous a été envoyé. Veuillez vérifier votre boîte de réception et cliquer sur le lien pour définir un nouveau mot de passe sécurisé.
            </p>
            <Link to="/login" className="login-button" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              Retour à la page de connexion <ArrowRight size={18} />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
