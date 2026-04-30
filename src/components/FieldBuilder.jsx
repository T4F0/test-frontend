import { useState, useEffect } from 'react'
import { updateField, deleteField } from '../api/fieldsApi'

const FIELD_TYPES = [
  { value: 'text', label: 'Texte' },
  { value: 'number', label: 'Nombre' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Liste déroulante' },
  { value: 'checkbox', label: 'Case à cocher' },
  { value: 'file', label: 'Fichier' },
]

export default function FieldBuilder({ field, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)
  const [data, setData] = useState(field)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setData(field)
  }, [field])

  const handleSave = async () => {
    try {
      setSaving(true)
      const updated = await updateField(field.id, data)
      onUpdate(updated)
      setIsEditing(false)
    } catch (err) {
      alert('Échec de l\'enregistrement du champ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (confirm(`Supprimer le champ "${field.name}" ?`)) {
      try {
        await deleteField(field.id)
        onDelete(field.id)
      } catch (err) {
        alert('Échec de la suppression du champ')
      }
    }
  }

  return (
    <div className="field-builder">
      {isEditing ? (
        <div className="field-form">
          <div className="form-row">
            <input
              type="text"
              placeholder="Nom du champ"
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
            />
            <select value={data.field_type} onChange={(e) => setData({ ...data, field_type: e.target.value })}>
              {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="form-row">
            <input
              type="text"
              placeholder="Texte d'aide (placeholder)"
              value={data.placeholder || ''}
              onChange={(e) => setData({ ...data, placeholder: e.target.value })}
            />
          </div>

          {data.field_type === 'select' && (
            <div className="form-row">
              <textarea
                placeholder='Options (une par ligne)'
                value={data.options ? data.options.join('\n') : ''}
                onChange={(e) => setData({ ...data, options: e.target.value.split('\n').filter(o => o) })}
              />
            </div>
          )}

          {data.field_type === 'file' && (
            <div className="form-row">
              <input
                type="text"
                placeholder=".pdf,.jpg,.png"
                value={data.accepted_file_types || ''}
                onChange={(e) => setData({ ...data, accepted_file_types: e.target.value })}
              />
            </div>
          )}

          <label>
            <input
              type="checkbox"
              checked={data.required}
              onChange={(e) => setData({ ...data, required: e.target.checked })}
            />
            Obligatoire
          </label>

          <label>
            <input
              type="checkbox"
              checked={data.show_rdv || false}
              onChange={(e) => setData({ ...data, show_rdv: e.target.checked })}
            />
            Afficher RDV
          </label>

          <div className="form-actions-inline">
            <button onClick={handleSave} disabled={saving}>Enregistrer</button>
            <button onClick={() => setIsEditing(false)}>Annuler</button>
          </div>
        </div>
      ) : (
        <div className="field-display">
          <div className="field-info">
            <span className="field-name">{data.name}</span>
            <span className="field-type">{data.field_type}</span>
            {data.required && <span className="badge">Obligatoire</span>}
            {data.show_rdv && <span className="badge badge-info">Afficher RDV</span>}
          </div>
          <div className="field-controls">
            <button onClick={() => setIsEditing(true)} className="btn-small">Modifier</button>
            <button onClick={handleDelete} className="btn-small btn-danger">Supprimer</button>
          </div>
        </div>
      )}
    </div>
  )
}
