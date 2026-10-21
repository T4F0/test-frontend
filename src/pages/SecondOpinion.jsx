import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Stethoscope, ShieldCheck, Send } from 'lucide-react'
import { getPublicSecondOpinion, replyPublicSecondOpinion } from '../api/caseToolsApi'

const fmt = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

export default function SecondOpinion() {
  const { token } = useParams()
  const [state, setState] = useState({ loading: true })
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getPublicSecondOpinion(token)
      .then((data) => setState({ data }))
      .catch(() => setState({ invalid: true }))
  }, [token])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await replyPublicSecondOpinion(token, { author_name: name, message })
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.detail || "Échec de l'envoi")
    }
  }

  if (state.loading) return <div className="loading">Chargement…</div>
  if (state.invalid) {
    return (
      <main className="so-page"><div className="so-card"><h1>Lien invalide ou expiré</h1><p>Demandez un nouveau lien à votre confrère.</p></div></main>
    )
  }
  const { case: c, question, expires_at: expires } = state.data

  return (
    <main className="so-page">
      <div className="so-card">
        <header className="so-head">
          <Stethoscope size={22} aria-hidden="true" />
          <div>
            <h1>Demande d’avis · {c.form_name}</h1>
            <p className="so-sub">Lien valable jusqu’au {fmt(expires)}</p>
          </div>
        </header>
        <p className="so-privacy"><ShieldCheck size={16} aria-hidden="true" /> Dossier sans nom, sans référence et sans fichiers. Merci de ne pas le diffuser.</p>
        {question && <blockquote className="so-question"><strong>Question posée :</strong> {question}</blockquote>}
        <p><strong>Patient :</strong> {c.patient.age != null ? `${c.patient.age} ans` : 'âge non renseigné'}{c.patient.gender ? ` · ${c.patient.gender}` : ''}</p>
        {c.sections.map((s) => (
          <section key={s.name} className="so-section">
            <h2>{s.name}</h2>
            <dl>
              {s.fields.map((f) => (
                <div key={f.label}><dt>{f.label}</dt><dd>{Array.isArray(f.value) ? f.value.join(', ') : String(f.value)}</dd></div>
              ))}
            </dl>
          </section>
        ))}
        {c.findings.length > 0 && (
          <section className="so-section">
            <h2>Images clés et mesures</h2>
            <div className="ct-findings">
              {c.findings.map((f, i) => (
                <figure key={i} className="ct-finding">
                  {f.image && <img src={f.image} alt={f.title || 'Image clé'} />}
                  <figcaption>
                    <strong>{f.title || 'Image clé'}</strong>
                    {f.measurements.length > 0 && <table><tbody>{f.measurements.map((m, j) => <tr key={j}><td>{m.label || m.tool}</td><td>{m.value} {m.unit}</td></tr>)}</tbody></table>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
        <section className="so-section">
          <h2>Votre avis</h2>
          {state.data.replies.map((r, i) => <blockquote key={i} className="so-reply"><strong>{r.author_name}</strong> · {fmt(r.created_at)}<br />{r.message}</blockquote>)}
          {sent ? (
            <p className="so-thanks" role="status">Merci, votre avis a été transmis.</p>
          ) : (
            <form onSubmit={submit} className="so-form">
              <label>Votre nom et fonction<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} /></label>
              <label>Avis<textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} maxLength={5000} /></label>
              {error && <p className="error" role="alert">{error}</p>}
              <button type="submit" className="btn-primary btn-with-icon"><Send size={15} /> Envoyer mon avis</button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
