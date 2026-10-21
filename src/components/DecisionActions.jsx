import { useEffect, useState } from 'react'
import { Plus, Trash2, ListChecks } from 'lucide-react'
import { getDecisionActions, createDecisionAction, updateDecisionAction, deleteDecisionAction } from '../api/decisionActionsApi'
import { getUsers } from '../api/authApi'
import { dueState, formatDue } from '../lib/actionDue'
import { toast } from '../lib/toast'

const userLabel = (u) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username

export default function DecisionActions({ reportId, canManage, currentUserId }) {
  const [actions, setActions] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ description: '', owner: '', due_date: '' })

  useEffect(() => {
    let cancelled = false
    getDecisionActions({ report: reportId })
      .then((rows) => !cancelled && setActions(rows))
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true))
    return () => { cancelled = true }
  }, [reportId])

  const openForm = async () => {
    setAdding(true)
    if (users.length === 0) {
      try { setUsers(await getUsers()) } catch { /* owner stays optional */ }
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.description.trim()) return
    try {
      const created = await createDecisionAction({
        report: reportId,
        description: form.description.trim(),
        owner: form.owner || null,
        due_date: form.due_date || null,
      })
      setActions((prev) => [...prev, created])
      setForm({ description: '', owner: '', due_date: '' })
      setAdding(false)
    } catch (err) {
      toast.error(err.response?.data?.detail || "Échec de l'ajout de l'action")
    }
  }

  const toggle = async (action) => {
    try {
      const updated = await updateDecisionAction(action.id, { is_done: !action.is_done })
      setActions((prev) => prev.map((a) => (a.id === action.id ? updated : a)))
    } catch {
      toast.error("Échec de la mise à jour de l'action")
    }
  }

  const remove = async (action) => {
    try {
      await deleteDecisionAction(action.id)
      setActions((prev) => prev.filter((a) => a.id !== action.id))
    } catch {
      toast.error("Échec de la suppression de l'action")
    }
  }

  if (!loaded || (actions.length === 0 && !canManage)) return null

  return (
    <div className="dact">
      <div className="dact-head"><ListChecks size={14} aria-hidden="true" /> Suivi de la décision</div>
      {actions.length > 0 && (
        <ul className="dact-list">
          {actions.map((a) => {
            const state = dueState(a)
            const canTick = canManage || a.owner === currentUserId
            return (
              <li key={a.id} className={`dact-item${a.is_done ? ' is-done' : ''}`}>
                <input
                  type="checkbox"
                  checked={a.is_done}
                  disabled={!canTick}
                  onChange={() => toggle(a)}
                  aria-label={`Marquer « ${a.description} » comme ${a.is_done ? 'à faire' : 'faite'}`}
                />
                <span className="dact-text">{a.description}</span>
                {a.owner_name && <span className="dact-owner">{a.owner_name}</span>}
                {a.due_date && <span className={`dact-due is-${state}`}>{state === 'overdue' ? 'En retard · ' : ''}{formatDue(a.due_date)}</span>}
                {canManage && (
                  <button type="button" className="dact-del" onClick={() => remove(a)} aria-label={`Supprimer l'action « ${a.description} »`}>
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {canManage && (adding ? (
        <form className="dact-form" onSubmit={submit}>
          <input
            type="text" placeholder="Ex. : programmer une IRM" value={form.description} maxLength={500} autoFocus
            onChange={(e) => setForm({ ...form, description: e.target.value })} aria-label="Description de l'action"
          />
          <select value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} aria-label="Responsable">
            <option value="">Sans responsable</option>
            {users.map((u) => <option key={u.id} value={u.id}>{userLabel(u)}</option>)}
          </select>
          <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} aria-label="Échéance" />
          <button type="submit" className="btn-small btn-primary">Ajouter</button>
          <button type="button" className="btn-small btn-secondary" onClick={() => setAdding(false)}>Annuler</button>
        </form>
      ) : (
        <button type="button" className="dact-add" onClick={openForm}><Plus size={14} aria-hidden="true" /> Ajouter une action</button>
      ))}
    </div>
  )
}
