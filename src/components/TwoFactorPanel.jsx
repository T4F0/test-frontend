import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ShieldCheck, ShieldOff, KeyRound } from 'lucide-react'
import { setupTwoFactor, enableTwoFactor, disableTwoFactor } from '../api/authApi'
import { toast } from '../lib/toast'

export default function TwoFactorPanel({ enabled, onChange }) {
  const [step, setStep] = useState('idle') // idle | scan | codes | disable
  const [setup, setSetup] = useState(null)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [recovery, setRecovery] = useState([])
  const [busy, setBusy] = useState(false)

  const run = async (fn) => {
    setBusy(true)
    try { await fn() } catch (e) { toast.error(e.response?.data?.detail || 'Une erreur est survenue') } finally { setBusy(false) }
  }

  const start = () => run(async () => { setSetup(await setupTwoFactor()); setCode(''); setStep('scan') })
  const confirm = (e) => { e.preventDefault(); run(async () => {
    const r = await enableTwoFactor(code)
    setRecovery(r.recovery_codes); setStep('codes'); onChange?.(true)
  }) }
  const disable = (e) => { e.preventDefault(); run(async () => {
    await disableTwoFactor(password, code)
    setStep('idle'); setPassword(''); setCode(''); onChange?.(false); toast.success('Double authentification désactivée')
  }) }

  return (
    <section className="tf" aria-label="Double authentification">
      <h3 className="tf-title">{enabled ? <ShieldCheck size={18} aria-hidden="true" /> : <ShieldOff size={18} aria-hidden="true" />} Double authentification (2FA)</h3>

      {step === 'idle' && (enabled ? (
        <>
          <p className="tf-text">Active : un code de votre application d’authentification est demandé à chaque connexion.</p>
          <button type="button" className="btn-small btn-danger" onClick={() => setStep('disable')}>Désactiver</button>
        </>
      ) : (
        <>
          <p className="tf-text">Protégez votre compte avec un code à usage unique (Google Authenticator, Aegis, 1Password…).</p>
          <button type="button" className="btn-primary" onClick={start} disabled={busy}><KeyRound size={15} /> Activer</button>
        </>
      ))}

      {step === 'scan' && setup && (
        <form onSubmit={confirm} className="tf-form">
          <p className="tf-text">1. Scannez ce QR code avec votre application, ou saisissez la clé manuellement.</p>
          <div className="tf-qr"><QRCodeSVG value={setup.otpauth_uri} size={168} marginSize={2} /></div>
          <code className="tf-secret">{setup.secret}</code>
          <label>2. Entrez le code à 6 chiffres affiché
            <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required autoFocus />
          </label>
          <div className="tf-actions">
            <button type="submit" className="btn-primary" disabled={busy}>Vérifier et activer</button>
            <button type="button" className="btn-secondary" onClick={() => setStep('idle')}>Annuler</button>
          </div>
        </form>
      )}

      {step === 'codes' && (
        <div className="tf-form">
          <p className="tf-text"><strong>Conservez ces codes de secours</strong> en lieu sûr. Chacun ne sert qu’une fois et ne sera plus affiché.</p>
          <ul className="tf-codes">{recovery.map((c) => <li key={c}><code>{c}</code></li>)}</ul>
          <div className="tf-actions">
            <button type="button" className="btn-secondary" onClick={() => navigator.clipboard?.writeText(recovery.join('\n')).then(() => toast.success('Codes copiés'))}>Copier</button>
            <button type="button" className="btn-primary" onClick={() => { setStep('idle'); setRecovery([]) }}>J’ai enregistré mes codes</button>
          </div>
        </div>
      )}

      {step === 'disable' && (
        <form onSubmit={disable} className="tf-form">
          <label>Mot de passe<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
          <label>Code de vérification ou code de secours<input value={code} onChange={(e) => setCode(e.target.value)} required autoComplete="one-time-code" /></label>
          <div className="tf-actions">
            <button type="submit" className="btn-danger" disabled={busy}>Désactiver la 2FA</button>
            <button type="button" className="btn-secondary" onClick={() => setStep('idle')}>Annuler</button>
          </div>
        </form>
      )}
    </section>
  )
}
