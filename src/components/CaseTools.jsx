import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Repeat2, Copy, MessageSquareShare, Images, Trash2, Link2, X, Ban } from 'lucide-react'
import {
  getFindings, deleteFinding, representSubmission,
  getSecondOpinions, createSecondOpinion, revokeSecondOpinion,
} from '../api/caseToolsApi'
import { toast } from '../lib/toast'
import { useConfirm } from './ConfirmDialog'

const fmt = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

function SecondOpinionModal({ submissionId, onClose }) {
  const [links, setLinks] = useState([])
  const [question, setQuestion] = useState('')
  const [days, setDays] = useState(7)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getSecondOpinions(submissionId).then(setLinks).catch(() => toast.error('Impossible de charger les liens'))
  }, [submissionId])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const urlFor = (l) => `${window.location.origin}/second-opinion/${l.token}`

  const create = async () => {
    setBusy(true)
    try {
      const link = await createSecondOpinion(submissionId, { question, days })
      setLinks((prev) => [link, ...prev])
      setQuestion('')
      try { await navigator.clipboard.writeText(urlFor(link)); toast.success('Lien créé et copié') } catch { toast.success('Lien créé') }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Échec de la création du lien')
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (l) => {
    try {
      const updated = await revokeSecondOpinion(l.id)
      setLinks((prev) => prev.map((x) => (x.id === l.id ? { ...x, ...updated } : x)))
    } catch {
      toast.error('Échec de la révocation')
    }
  }

  return (
    <div className="ct-backdrop" onClick={onClose}>
      <div className="ct-modal" role="dialog" aria-modal="true" aria-label="Avis externe" onClick={(e) => e.stopPropagation()}>
        <header className="ct-modal-head">
          <h3><MessageSquareShare size={18} aria-hidden="true" /> Demander un avis externe</h3>
          <button type="button" className="ct-x" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </header>
        <p className="ct-warn">
          Le lien donne accès, sans compte, au dossier <strong>sans nom, sans référence et sans fichiers</strong> (âge, sexe, champs
          cliniques, images clés). Les champs de texte libre ne sont pas filtrés : vérifiez qu’ils ne contiennent pas d’identité.
        </p>
        <label className="ct-label">Question posée au confrère
          <textarea value={question} maxLength={1000} rows={3} onChange={(e) => setQuestion(e.target.value)} placeholder="Ex. : Résécabilité après chimiothérapie néoadjuvante ?" />
        </label>
        <div className="ct-row">
          <label className="ct-label">Validité
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} jour{d > 1 ? 's' : ''}</option>)}
            </select>
          </label>
          <button type="button" className="btn-primary btn-with-icon" onClick={create} disabled={busy}><Link2 size={15} /> Créer le lien</button>
        </div>
        {links.length > 0 && (
          <ul className="ct-links">
            {links.map((l) => (
              <li key={l.id} className={l.active ? '' : 'is-off'}>
                <div className="ct-link-top">
                  <input readOnly value={urlFor(l)} onFocus={(e) => e.target.select()} aria-label="Lien de partage" />
                  {l.active ? (
                    <button type="button" className="btn-small btn-danger btn-with-icon" onClick={() => revoke(l)}><Ban size={13} /> Révoquer</button>
                  ) : (
                    <span className="ct-badge">{l.revoked ? 'Révoqué' : 'Expiré'}</span>
                  )}
                </div>
                <small>Expire le {fmt(l.expires_at)}{l.question ? ` · ${l.question}` : ''}</small>
                {l.replies.map((r, i) => (
                  <blockquote key={i}><strong>{r.author_name}</strong> · {fmt(r.created_at)}<br />{r.message}</blockquote>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function CaseTools({ submission, canWrite }) {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [showFindings, setShowFindings] = useState(false)
  const [findings, setFindings] = useState(null)
  const [showOpinion, setShowOpinion] = useState(false)

  useEffect(() => {
    if (showFindings && findings === null) {
      getFindings(submission.id).then(setFindings).catch(() => { setFindings([]); toast.error('Impossible de charger les images clés') })
    }
  }, [showFindings, findings, submission.id])

  const represent = async () => {
    const ok = await confirm({
      title: 'Représenter ce dossier en RCP ?',
      message: 'Le dossier passera en « À rediscuter » et sera ajouté à la prochaine réunion planifiée.',
      confirmLabel: 'Représenter',
    })
    if (!ok) return
    try {
      const { meeting } = await representSubmission(submission.id)
      toast.success('Dossier ajouté à la prochaine réunion')
      navigate(`/meetings/${meeting}`)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Échec de la représentation')
    }
  }

  const remove = async (f) => {
    const ok = await confirm({ title: 'Supprimer cette image clé ?', message: 'Elle disparaîtra aussi des futurs rapports.', confirmLabel: 'Supprimer', danger: true })
    if (!ok) return
    try {
      await deleteFinding(f.id)
      setFindings((prev) => prev.filter((x) => x.id !== f.id))
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Échec de la suppression')
    }
  }

  if (!canWrite) return null

  return (
    <div className="ct">
      <div className="ct-bar">
        <button type="button" className="btn-small btn-outline btn-with-icon" onClick={represent}><Repeat2 size={15} aria-hidden="true" /> Représenter en RCP</button>
        <button type="button" className="btn-small btn-outline btn-with-icon" onClick={() => navigate(`/forms/${submission.form}/submit?copy=${submission.id}`)}><Copy size={15} aria-hidden="true" /> Copier comme modèle</button>
        <button type="button" className="btn-small btn-outline btn-with-icon" onClick={() => setShowOpinion(true)}><MessageSquareShare size={15} aria-hidden="true" /> Avis externe</button>
        <button type="button" className={`btn-small btn-outline btn-with-icon${showFindings ? ' is-on' : ''}`} onClick={() => setShowFindings((v) => !v)} aria-expanded={showFindings}><Images size={15} aria-hidden="true" /> Images clés{findings ? ` (${findings.length})` : ''}</button>
      </div>
      {showFindings && (
        findings === null ? <p className="dash-muted">Chargement…</p> :
        findings.length === 0 ? <p className="dash-muted">Aucune image clé. Ouvrez une imagerie puis utilisez « Image clé » dans la visionneuse.</p> : (
          <div className="ct-findings">
            {findings.map((f) => (
              <figure key={f.id} className="ct-finding">
                {f.image && <img src={f.image} alt={f.title || 'Image clé'} />}
                <figcaption>
                  <strong>{f.title || 'Image clé'}</strong>
                  <small>{f.created_by_name} · {fmt(f.created_at)}</small>
                  {f.measurements.length > 0 && (
                    <table><tbody>{f.measurements.map((m, i) => <tr key={i}><td>{m.label || m.tool}</td><td>{m.value} {m.unit}</td></tr>)}</tbody></table>
                  )}
                  <button type="button" className="dact-del" onClick={() => remove(f)} aria-label="Supprimer l’image clé"><Trash2 size={13} /></button>
                </figcaption>
              </figure>
            ))}
          </div>
        )
      )}
      {showOpinion && <SecondOpinionModal submissionId={submission.id} onClose={() => setShowOpinion(false)} />}
    </div>
  )
}
