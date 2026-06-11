import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { removeUnauthorizedAccount } from '../api/authApi'
import { Trash2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'

export default function RemoveAccount() {
  const { uidb64, token } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let active = true
    const performRemoval = async () => {
      try {
        setLoading(true)
        setError(null)
        await removeUnauthorizedAccount(uidb64, token)
        if (active) {
          setSuccess(true)
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.detail || 'Le lien de suppression de compte est invalide ou a expiré')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }
    performRemoval()
    return () => {
      active = false
    }
  }, [uidb64, token])

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🏥 e-RCP Algerie</h1>
        <p className="login-subtitle">Suppression du compte</p>

        {loading ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            <Trash2 size={64} color="var(--danger, #dc3545)" style={{ animation: 'pulse 1.5s infinite' }} />
            <h2 style={{ fontSize: '1.25rem', border: 'none', padding: 0, margin: 0, color: 'var(--gray-900)' }}>Suppression en cours...</h2>
            <p style={{ color: 'var(--gray-600)', fontSize: '0.95rem' }}>
              Nous supprimons le compte créé avec votre adresse e-mail.
            </p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            <XCircle size={64} color="var(--danger, #dc3545)" />
            <h2 style={{ fontSize: '1.25rem', border: 'none', padding: 0, margin: 0, color: 'var(--gray-900)' }}>Échec de la suppression</h2>
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
            <h2 style={{ fontSize: '1.25rem', border: 'none', padding: 0, margin: 0, color: 'var(--gray-900)' }}>Compte supprimé</h2>
            <p style={{ color: 'var(--gray-600)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Le compte non autorisé a été supprimé avec succès.
            </p>
            <p style={{ color: 'var(--gray-600)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Aucune action supplémentaire n'est requise. Vos informations ont été effacées de notre base de données.
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
