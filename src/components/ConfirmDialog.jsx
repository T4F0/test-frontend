import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

const ConfirmContext = createContext(null)

/**
 * Styled replacement for window.confirm.
 *   const confirm = useConfirm()
 *   if (!(await confirm({ title: 'Supprimer ?', message: '...', confirmLabel: 'Supprimer', danger: true }))) return
 */
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null)
  const confirmRef = useRef(null)

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        const opts = typeof options === 'string' ? { message: options } : options
        setRequest({ ...opts, resolve })
      }),
    [],
  )

  const close = (answer) => {
    request?.resolve(answer)
    setRequest(null)
  }

  useEffect(() => {
    if (!request) return undefined
    const opener = document.activeElement
    confirmRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        request.resolve(false)
        setRequest(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [request])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <div className="ui-dialog-backdrop" onMouseDown={() => close(false)}>
          <div
            className="ui-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="ui-confirm-title"
            aria-describedby="ui-confirm-message"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="ui-dialog-head">
              <span className={`ui-dialog-icon ${request.danger ? 'is-danger' : ''}`}>
                <AlertTriangle size={22} aria-hidden="true" />
              </span>
              <div>
                <h2 id="ui-confirm-title">{request.title || 'Confirmer'}</h2>
                {request.message && <p id="ui-confirm-message">{request.message}</p>}
              </div>
            </div>
            <div className="ui-dialog-actions">
              <button type="button" className="ui-btn ui-btn-ghost" onClick={() => close(false)}>
                {request.cancelLabel || 'Annuler'}
              </button>
              <button
                type="button"
                ref={confirmRef}
                className={`ui-btn ${request.danger ? 'ui-btn-danger' : 'ui-btn-primary'}`}
                onClick={() => close(true)}
              >
                {request.confirmLabel || 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

// Without a provider (tests, isolated renders) fall back to the browser dialog
const fallback = (options) =>
  Promise.resolve(window.confirm(typeof options === 'string' ? options : options?.message || options?.title || 'Confirmer ?'))

export function useConfirm() {
  return useContext(ConfirmContext) || fallback
}
