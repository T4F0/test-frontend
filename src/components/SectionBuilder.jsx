import { useState } from 'react'
import { updateSection, deleteSection, createSection, reorderSections } from '../api/sectionsApi'
import { createField, reorderFields } from '../api/fieldsApi'
import FieldBuilder from './FieldBuilder'
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { SortableItem } from './SortableItem'

export default function SectionBuilder({ section, allSections, onUpdate, onReorderSections = () => {}, onDelete, onAddSection, newlyCreatedSectionId = null }) {
  const [isEditing, setIsEditing] = useState(section.id === newlyCreatedSectionId)
  const [name, setName] = useState(section.name)
  const [fields, setFields] = useState(section.fields || [])
  const [newlyCreatedFieldId, setNewlyCreatedFieldId] = useState(null)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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
        name: '',
        field_type: 'text',
        order: fields.length
      })
      setFields([...fields, newField])
      setNewlyCreatedFieldId(newField.id)
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
        name: '',
        order: order
      })
      onAddSection(newSection)
    } catch (err) {
      alert('Échec de la création de la sous-section')
    }
  }

  const handleFieldDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = fields.findIndex(f => f.id === active.id)
    const newIndex = fields.findIndex(f => f.id === over.id)
    
    const reorderedFieldsList = arrayMove(fields, oldIndex, newIndex)
    const updatedFields = reorderedFieldsList.map((f, index) => ({ ...f, order: index }))
    setFields(updatedFields)

    try {
      await reorderFields(updatedFields.map((f, index) => ({ id: f.id, order: index })))
    } catch (err) {
      console.error('Failed to reorder fields:', err)
    }
  }

  const handleChildSectionDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = childSections.findIndex(s => s.id === active.id)
    const newIndex = childSections.findIndex(s => s.id === over.id)
    
    const reorderedChildSections = arrayMove(childSections, oldIndex, newIndex)
    const updatedChildren = reorderedChildSections.map((s, index) => ({ ...s, order: index }))
    
    // Update local state first
    onReorderSections(updatedChildren)

    try {
      await reorderSections(updatedChildren.map((s, index) => ({ id: s.id, order: index })))
    } catch (err) {
      console.error('Failed to reorder sub-sections:', err)
    }
  }

  return (
    <div className={`section-builder ${section.parent ? 'nested' : ''}`}>
      <div className="section-header">
        {isEditing ? (
          <div className="edit-section">
            <input
              type="text"
              placeholder="Nom de la section"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => e.target.select()}
              autoFocus
            />
            <button onClick={handleSaveSection} disabled={saving}>Enregistrer</button>
            <button onClick={() => setIsEditing(false)}>Annuler</button>
          </div>
        ) : (
          <>
            <h4>{name || 'Sans titre'}</h4>
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
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleFieldDragEnd}
            >
              <SortableContext 
                items={fields.map(f => f.id)}
                strategy={verticalListSortingStrategy}
              >
                {fields.map(field => (
                  <SortableItem key={field.id} id={field.id}>
                    <FieldBuilder
                      field={field}
                      initialEditing={field.id === newlyCreatedFieldId}
                      onUpdate={(updatedField) => {
                        setFields(fields.map(f => f.id === updatedField.id ? updatedField : f))
                        setNewlyCreatedFieldId(null)
                      }}
                      onDelete={(fieldId) => setFields(fields.filter(f => f.id !== fieldId))}
                    />
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        {childSections.length > 0 && (
          <div className="child-sections-list">
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleChildSectionDragEnd}
            >
              <SortableContext 
                items={childSections.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {childSections.map(child => (
                  <SortableItem key={child.id} id={child.id}>
                    <SectionBuilder
                      section={child}
                      allSections={allSections}
                      onUpdate={onUpdate}
                      onReorderSections={onReorderSections}
                      onDelete={onDelete}
                      onAddSection={onAddSection}
                      newlyCreatedSectionId={newlyCreatedSectionId}
                    />
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        {fields.length === 0 && childSections.length === 0 && (
          <p className="empty-small">Aucun champ ou sous-section.</p>
        )}
      </div>
    </div>
  )
}
