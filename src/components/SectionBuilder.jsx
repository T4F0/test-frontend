import { useState } from 'react'
import { updateSection, deleteSection, createSection } from '../api/sectionsApi'
import { createField } from '../api/fieldsApi'
import FieldBuilder from './FieldBuilder'

export default function SectionBuilder({ section, allSections, onUpdate, onDelete, onAddSection }) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(section.name)
  const [fields, setFields] = useState(section.fields || [])
  const [saving, setSaving] = useState(false)

  const childSections = allSections ? allSections.filter(s => s.parent === section.id).sort((a,b) => a.order - b.order) : []

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
      alert('Échec de l\'enregistrement de la section : ' + (err.response?.data?.name?.[0] || err.message))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (confirm('Supprimer cette section et tout son contenu ?')) {
      try {
        await deleteSection(section.id)
        onDelete(section.id)
      } catch (err) {
        alert('Échec de la suppression de la section')
      }
    }
  }

  const handleAddField = async () => {
    try {
      const newField = await createField({
        section: section.id,
        name: 'Nouveau champ',
        field_type: 'text',
        order: fields.length
      })
      setFields([...fields, newField])
    } catch (err) {
      alert('Échec de la création du champ')
    }
  }

  const handleAddSubSection = async () => {
    try {
      const order = childSections.length
      const newSection = await createSection({
        form: section.form,
        parent: section.id,
        name: 'Nouvelle sous-section',
        order: order
      })
      onAddSection(newSection)
    } catch (err) {
      alert('Échec de la création de la sous-section')
    }
  }

  return (
    <div className={`section-builder ${section.parent ? 'nested' : ''}`}>
      <div className="section-header">
        {isEditing ? (
          <div className="edit-section">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <button onClick={handleSaveSection} disabled={saving}>Enregistrer</button>
            <button onClick={() => setIsEditing(false)}>Annuler</button>
          </div>
        ) : (
          <>
            <h4>{name}</h4>
            <div className="section-actions">
              <button onClick={() => setIsEditing(true)} className="btn-small">Modifier</button>
              <button onClick={handleDelete} className="btn-small btn-danger">Supprimer</button>
              <button onClick={handleAddField} className="btn-small btn-secondary">+ Champ</button>
              <button onClick={handleAddSubSection} className="btn-small btn-primary">+ Sous-section</button>
            </div>
          </>
        )}
      </div>

      <div className="section-contents">
        {fields.length > 0 && (
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

        {childSections.length > 0 && (
          <div className="child-sections-list">
            {childSections.map(child => (
              <SectionBuilder
                key={child.id}
                section={child}
                allSections={allSections}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onAddSection={onAddSection}
              />
            ))}
          </div>
        )}

        {fields.length === 0 && childSections.length === 0 && (
          <p className="empty-small">Aucun champ ou sous-section.</p>
        )}
      </div>
    </div>
  )
}
