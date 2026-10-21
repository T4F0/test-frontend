import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { subscribeToasts } from '../lib/toast'

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info }
const MAX_VISIBLE = 4

export default function Toaster() {
  const [items, setItems] = useState([])

  useEffect(() => subscribeToasts((t) => {
    setItems((prev) => [...prev, t].slice(-MAX_VISIBLE))
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), t.duration)
  }), [])

  const dismiss = (id) => setItems((prev) => prev.filter((x) => x.id !== id))

  return (
    <div className="toaster" aria-live="polite" aria-atomic="false">
      {items.map((t) => {
        const Icon = ICONS[t.kind]
        return (
          <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
            <Icon size={18} aria-hidden="true" className="toast-icon" />
            <span className="toast-msg">{t.message}</span>
            <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label="Fermer la notification">
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
