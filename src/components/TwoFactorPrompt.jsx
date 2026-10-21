import { useEffect, useRef, useState } from 'react'
import { ShieldCheck, KeyRound, X } from 'lucide-react'

const LENGTH = 6

/**
 * Popup shown after a correct password when the account has 2FA.
 * Six digit boxes (auto-advance, paste, auto-submit) or, on request, a single field for a recovery code.
 */
export default function TwoFactorPrompt({ error, loading, onSubmit, onCancel }) {
  const [digits, setDigits] = useState(Array(LENGTH).fill(''))
  const [useRecovery, setUseRecovery] = useState(false)
  const [recovery, setRecovery] = useState('')
  const refs = useRef([])
  const submittedRef = useRef('')

  useEffect(() => {
    if (useRecovery) return
    refs.current[0]?.focus()
  }, [useRecovery])

  // A rejected code empties the boxes so the user can retype straight away
  useEffect(() => {
    if (!error) return
    submittedRef.current = ''
    setDigits(Array(LENGTH).fill(''))
    setRecovery('')
    if (!useRecovery) refs.current[0]?.focus()
  }, [error]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !loading) onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [loading, onCancel])

  const send = (code) => {
    if (loading || submittedRef.current === code) return
    submittedRef.current = code
    onSubmit(code)
  }

  const setAt = (index, value) => {
    const next = [...digits]
    next[index] = value
    setDigits(next)
    if (next.every(Boolean)) send(next.join(''))
  }

  const onChange = (index, raw) => {
    const clean = raw.replace(/\D/g, '')
    if (!clean) return setAt(index, '')
    if (clean.length > 1) return fill(clean, index)
    setAt(index, clean)
    refs.current[index + 1]?.focus()
  }

  const fill = (text, from = 0) => {
    const chars = text.replace(/\D/g, '').slice(0, LENGTH - from).split('')
    if (!chars.length) return
    const next = [...digits]
    chars.forEach((c, i) => { next[from + i] = c })
    setDigits(next)
    refs.current[Math.min(from + chars.length, LENGTH - 1)]?.focus()
    if (next.every(Boolean)) send(next.join(''))
  }

  const onKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < LENGTH - 1) {
      refs.current[index + 1]?.focus()
    }
  }

  const submitRecovery = (e) => {
    e.preventDefault()
    const code = recovery.trim()
    if (code) { submittedRef.current = ''; send(code) }
  }

  return (
    <div className="tfp-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !loading) onCancel() }}>
      <div className="tfp-card" role="dialog" aria-modal="true" aria-labelledby="tfp-title">
        <button type="button" className="tfp-close" onClick={onCancel} disabled={loading} aria-label="Annuler">
          <X size={18} />
        </button>
        <div className="tfp-icon">{useRecovery ? <KeyRound size={28} /> : <ShieldCheck size={28} />}</div>
        <h2 id="tfp-title">Vérification en deux étapes</h2>
        <p className="tfp-lead">
          {useRecovery
            ? 'Saisissez l’un de vos codes de secours. Chaque code ne sert qu’une fois.'
            : 'Ouvrez votre application d’authentification et saisissez le code à 6 chiffres.'}
        </p>

        {error && <div className="tfp-error" role="alert">{error}</div>}

        {useRecovery ? (
          <form onSubmit={submitRecovery} className="tfp-recovery">
            <input
              type="text"
              value={recovery}
              onChange={(e) => setRecovery(e.target.value)}
              placeholder="Code de secours"
              autoFocus
              autoComplete="off"
              aria-label="Code de secours"
            />
            <button type="submit" className="login-button" disabled={loading || !recovery.trim()}>
              {loading ? 'Vérification…' : 'Valider'}
            </button>
          </form>
        ) : (
          <div className="tfp-digits" role="group" aria-label="Code à 6 chiffres" onPaste={(e) => { e.preventDefault(); fill(e.clipboardData.getData('text')) }}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el }}
                value={d}
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={LENGTH}
                aria-label={`Chiffre ${i + 1}`}
                disabled={loading}
                className={d ? 'is-filled' : ''}
                onChange={(e) => onChange(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
              />
            ))}
          </div>
        )}

        {loading && !useRecovery && <p className="tfp-status">Vérification…</p>}

        <button
          type="button"
          className="tfp-link"
          disabled={loading}
          onClick={() => { setUseRecovery((v) => !v); submittedRef.current = '' }}
        >
          {useRecovery ? 'Utiliser l’application d’authentification' : 'Utiliser un code de secours'}
        </button>
      </div>
    </div>
  )
}
