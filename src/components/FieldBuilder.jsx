import { useState } from 'react'
import { updateField, deleteField } from '../api/fieldsApi'

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'file', label: 'File' },
]

export default function FieldBuilder({ field, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)
  const [data, setData] = useState(field)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    try {
      setSaving(true)
      await updateField(field.id, data)
      setIsEditing(false)
    } catch (err) {
      alert('Failed to save field')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (confirm(`Delete field "${field.name}"?`)) {
      try {
        await deleteField(field.id)
        onDelete(field.id)
      } catch (err) {
        alert('Failed to delete field')
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
              placeholder="Field name"
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
              placeholder="Placeholder"
              value={data.placeholder || ''}
              onChange={(e) => setData({ ...data, placeholder: e.target.value })}
            />
          </div>

          {data.field_type === 'select' && (
            <div className="form-row">
              <textarea
                placeholder='Options (one per line)'
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
            Required
          </label>

          <label>
            <input
              type="checkbox"
              checked={data.show_rdv || false}
              onChange={(e) => setData({ ...data, show_rdv: e.target.checked })}
            />
            Show RDV
          </label>

          <div className="form-actions-inline">
            <button onClick={handleSave} disabled={saving}>Save</button>
            <button onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="field-display">
          <div className="field-info">
            <span className="field-name">{field.name}</span>
            <span className="field-type">{field.field_type}</span>
            {field.required && <span className="badge">Required</span>}
            {field.show_rdv && <span className="badge badge-info">Show RDV</span>}
          </div>
          <div className="field-controls">
            <button onClick={() => setIsEditing(true)} className="btn-small">Edit</button>
            <button onClick={handleDelete} className="btn-small btn-danger">Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
