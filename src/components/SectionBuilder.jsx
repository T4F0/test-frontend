import { useState } from 'react'
import { updateSection, deleteSection } from '../api/sectionsApi'
import { createField } from '../api/fieldsApi'
import FieldBuilder from './FieldBuilder'

export default function SectionBuilder({ section, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(section.name)
  const [fields, setFields] = useState(section.fields || [])
  const [saving, setSaving] = useState(false)

  const handleSaveSection = async () => {
    try {
      setSaving(true)
      const updated = await updateSection(section.id, { 
        name,
        form: section.form,
        parent: section.parent,
        order: section.order
      })
      onUpdate(updated)
      setIsEditing(false)
    } catch (err) {
      console.error('Section update error:', err.response?.data || err)
      alert('Failed to save section: ' + (err.response?.data?.name?.[0] || err.message))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (confirm('Delete this section and all its fields?')) {
      try {
        await deleteSection(section.id)
        onDelete(section.id)
      } catch (err) {
        alert('Failed to delete section')
      }
    }
  }

  const handleAddField = async () => {
    try {
      const newField = await createField({
        section: section.id,
        name: 'New Field',
        field_type: 'text',
        order: fields.length
      })
      setFields([...fields, newField])
    } catch (err) {
      alert('Failed to create field')
    }
  }

  return (
    <div className="section-builder">
      <div className="section-header">
        {isEditing ? (
          <div className="edit-section">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <button onClick={handleSaveSection} disabled={saving}>Save</button>
            <button onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        ) : (
          <>
            <h4>{name}</h4>
            <div className="section-actions">
              <button onClick={() => setIsEditing(true)} className="btn-small">Edit</button>
              <button onClick={handleDelete} className="btn-small btn-danger">Delete</button>
              <button onClick={handleAddField} className="btn-small btn-secondary">+ Field</button>
            </div>
          </>
        )}
      </div>

      {fields.length === 0 ? (
        <p className="empty">No fields. Add one above.</p>
      ) : (
        <div className="fields-list">
          {fields.map(field => (
            <FieldBuilder
              key={field.id}
              field={field}
              onDelete={(fieldId) => setFields(fields.filter(f => f.id !== fieldId))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
