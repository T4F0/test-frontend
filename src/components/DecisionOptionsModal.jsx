import { useState, useEffect } from 'react'
import {
  getAllDecisionOptions,
  createDecisionOption,
  updateDecisionOption,
  deleteDecisionOption,
  reorderDecisionOptions,
} from '../api/decisionOptionsApi'
import { Gavel, Plus, X, Check, Pencil, ToggleLeft, ToggleRight, Trash2, ArrowUp, ArrowDown } from 'lucide-react'

export default function DecisionOptionsModal({ isOpen, onClose, form }) {
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (isOpen && form?.id) {
      loadOptions()
    } else {
      setOptions([])
      setNewLabel('')
      setEditingId(null)
      setError(null)
    }
  }, [isOpen, form?.id])

  const loadOptions = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllDecisionOptions(form.id)
      setOptions(Array.isArray(data) ? data : [])
    } catch (err) {
      setError('Impossible de charger les propositions.')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e) => {
    e?.preventDefault()
    if (!newLabel.trim() || saving || !form?.id) return
    setSaving(true)
    setError(null)
    try {
      const created = await createDecisionOption(form.id, newLabel.trim(), options.length)
      setOptions(prev => [...prev, created])
      setNewLabel('')
      setSuccessMsg('Proposition ajoutée !')
      setTimeout(() => setSuccessMsg(''), 2500)
    } catch (err) {
      setError("Échec de l'ajout de la proposition.")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id) => {
    if (!editingLabel.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const updated = await updateDecisionOption(id, { label: editingLabel.trim() })
      setOptions(prev => prev.map(o => o.id === id ? updated : o))
      setEditingId(null)
      setEditingLabel('')
    } catch (err) {
      setError('Échec de la modification.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (opt) => {
    try {
      const updated = await updateDecisionOption(opt.id, { is_active: !opt.is_active })
      setOptions(prev => prev.map(o => o.id === opt.id ? updated : o))
    } catch (err) {
      setError('Échec du changement de statut.')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer définitivement cette proposition ?')) return
    try {
      await deleteDecisionOption(id)
      setOptions(prev => prev.filter(o => o.id !== id))
    } catch (err) {
      setError('Échec de la suppression.')
    }
  }

  const handleMove = async (index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= options.length) return
    const reordered = [...options]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)
    setOptions(reordered)
    try {
      await reorderDecisionOptions(reordered.map(o => o.id))
    } catch (err) {
      console.error('Failed to reorder:', err)
    }
  }

  if (!isOpen || !form) return null

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: '#fff',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '620px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.2rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Gavel size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>
                Propositions de Décision RCP
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Formulaire : <strong>{form.name}</strong>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
            Ces propositions apparaîtront dans la liste déroulante lors des réunions RCP pour les dossiers associés à ce formulaire. Les coordinateurs pourront choisir parmi ces options ou utiliser la saisie personnalisée.
          </p>

          {error && (
            <div style={{ padding: '0.65rem 1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {successMsg && (
            <div style={{ padding: '0.65rem 1rem', background: '#dcfce7', color: '#15803d', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={16} /> {successMsg}
            </div>
          )}

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
              Chargement des propositions...
            </div>
          ) : options.length === 0 ? (
            <div
              style={{
                padding: '2rem 1.5rem',
                textAlign: 'center',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '10px',
                color: '#64748b',
                fontSize: '0.875rem',
                marginBottom: '1.25rem',
                background: '#f8fafc',
              }}
            >
              <Gavel size={28} style={{ color: '#cbd5e1', marginBottom: '0.5rem' }} />
              <div>Aucune proposition configurée pour ce formulaire.</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                Ajoutez une première proposition ci-dessous (ex : « Chimiothérapie adjuvante », « Chirurgie d'exérèse »...)
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {options.map((opt, idx) => (
                <div
                  key={opt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: opt.is_active ? '#ffffff' : '#f8fafc',
                    opacity: opt.is_active ? 1 : 0.65,
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
                  }}
                >
                  {/* Reorder controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, -1)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '1px',
                        cursor: idx === 0 ? 'default' : 'pointer',
                        color: idx === 0 ? '#e2e8f0' : '#64748b',
                        lineHeight: 1,
                      }}
                      title="Monter"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === options.length - 1}
                      onClick={() => handleMove(idx, 1)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '1px',
                        cursor: idx === options.length - 1 ? 'default' : 'pointer',
                        color: idx === options.length - 1 ? '#e2e8f0' : '#64748b',
                        lineHeight: 1,
                      }}
                      title="Descendre"
                    >
                      <ArrowDown size={13} />
                    </button>
                  </div>

                  {editingId === opt.id ? (
                    <div style={{ display: 'flex', flex: 1, gap: '0.4rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={editingLabel}
                        onChange={e => setEditingLabel(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleUpdate(opt.id)
                          if (e.key === 'Escape') { setEditingId(null); setEditingLabel('') }
                        }}
                        style={{
                          flex: 1,
                          padding: '0.35rem 0.5rem',
                          border: '1.5px solid #2563eb',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdate(opt.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', padding: '4px' }}
                        title="Enregistrer"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingId(null); setEditingLabel('') }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                        title="Annuler"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span
                        style={{
                          flex: 1,
                          fontSize: '0.875rem',
                          color: opt.is_active ? '#0f172a' : '#64748b',
                          textDecoration: opt.is_active ? 'none' : 'line-through',
                        }}
                      >
                        {opt.label}
                      </span>
                      {!opt.is_active && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            background: '#fee2e2',
                            color: '#b91c1c',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontWeight: '600',
                          }}
                        >
                          Désactivée
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => { setEditingId(opt.id); setEditingLabel(opt.label) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: '4px' }}
                        title="Modifier"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggle(opt)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: opt.is_active ? '#16a34a' : '#9ca3af', padding: '4px' }}
                        title={opt.is_active ? 'Désactiver (masquer)' : 'Réactiver'}
                      >
                        {opt.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(opt.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                        title="Supprimer définitivement"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Form to add a new option */}
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Ajouter une proposition (ex : Surveillance active)..."
              style={{
                flex: 1,
                padding: '0.6rem 0.75rem',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: '#0f172a',
                background: '#fff',
              }}
            />
            <button
              type="submit"
              disabled={!newLabel.trim() || saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.6rem 1rem',
                background: newLabel.trim() ? '#2563eb' : '#94a3b8',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: newLabel.trim() ? 'pointer' : 'default',
                fontSize: '0.85rem',
                fontWeight: '600',
              }}
            >
              <Plus size={15} /> Ajouter
            </button>
          </form>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
            {options.length} proposition{options.length > 1 ? 's' : ''} configurée{options.length > 1 ? 's' : ''}
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#334151',
              fontSize: '0.85rem',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
