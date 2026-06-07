import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getForm, createForm, updateForm } from '../api/formsApi'
import { getSections, createSection, reorderSections, updateSection } from '../api/sectionsApi'
import { createField, reorderFields, updateField } from '../api/fieldsApi'
import SectionBuilder from '../components/SectionBuilder'
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { SortableItem } from '../components/SortableItem'

export default function FormBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [form, setForm] = useState({
    name: '',
    description: ''
  })
  const [sections, setSections] = useState([])
  const [fields, setFields] = useState([])
  const [newlyCreatedSectionId, setNewlyCreatedSectionId] = useState(null)
  const [newlyCreatedFieldId, setNewlyCreatedFieldId] = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (isEdit) {
      loadForm()
    }
  }, [id])

  const loadForm = async () => {
    try {
      const formData = await getForm(id)
      setForm(formData)
      const sectionsData = await getSections({ form: id })
      
      // Extract fields and keep sections flat. Use 'section' to match API.
      const allFields = sectionsData.flatMap(s => (s.fields || []).map(f => ({ ...f, section: s.id })))
      setSections(sectionsData.map(({ fields, ...s }) => s))
      setFields(allFields)
    } catch (err) {
      setError('Échec du chargement du formulaire')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveForm = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      let savedForm
      if (isEdit) {
        savedForm = await updateForm(id, form)
      } else {
        savedForm = await createForm(form)
      }
      setForm(savedForm)
      if (!isEdit) {
        navigate(`/forms/${savedForm.id}/edit`)
      } else {
        alert('Formulaire mis à jour avec succès')
        navigate('/forms')
      }
    } catch (err) {
      setError('Échec de l\'enregistrement du formulaire')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleAddSection = async (parentId = null) => {
    if (!form.id) {
      alert('Veuillez d\'abord enregistrer le formulaire')
      return
    }
    try {
      const order = sections.filter(s => s.parent === parentId).length
      const newSection = await createSection({
        form: form.id,
        parent: parentId,
        name: '',
        order: order
      })
      setSections(prev => [...prev, newSection])
      setNewlyCreatedSectionId(newSection.id)
    } catch (err) {
      setError('Échec de la création de la section')
    }
  }

  const handleAddField = async (sectionId) => {
    try {
      // Correctly filter existing fields to determine order
      const sectionFields = fields.filter(f => (f.section === sectionId || f.section_id === sectionId))
      const response = await createField({
        section: sectionId,
        name: '',
        field_type: 'text',
        order: sectionFields.length
      })
      
      // Ensure we use 'section' consistently
      const newField = { ...response, section: sectionId };
      setFields(prev => [...prev, newField])
      setNewlyCreatedFieldId(newField.id)
    } catch (err) {
      console.error('Field creation error:', err)
      alert('Échec de la création du champ')
    }
  }

  const isDescendant = (parentId, childId) => {
    let current = sections.find(s => s.id === childId);
    while (current && current.parent) {
      if (current.parent === parentId) return true;
      current = sections.find(s => s.id === current.parent);
    }
    return false;
  }

  const cleanFieldPayload = (field) => {
    const { section_id, sortId, itemType, ...rest } = field;
    return rest;
  }

  const cleanSectionPayload = (section) => {
    const { fields, children, sortId, itemType, ...rest } = section;
    return rest;
  }

  const handleDragStart = (event) => {
    setActiveId(event.active.id)
  }

  const handleDragOver = (event) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    const isActiveField = String(activeId).startsWith('field-')
    const isActiveSection = String(activeId).startsWith('section-')
    
    let overSectionId = null
    if (String(overId).startsWith('field-')) {
      const overFieldId = parseInt(overId.split('-')[1])
      const overField = fields.find(f => f.id === overFieldId)
      overSectionId = overField.section || overField.section_id
    } else if (String(overId).startsWith('section-')) {
      const overSectId = parseInt(overId.split('-')[1])
      const overSection = sections.find(s => s.id === overSectId)
      overSectionId = overSection.parent
    } else if (String(overId).startsWith('empty-')) {
      overSectionId = parseInt(overId.split('-')[1])
    }

    if (isActiveField) {
      const activeFieldId = parseInt(activeId.split('-')[1])
      if (overSectionId !== null) {
        setFields(prev => {
          const newFields = [...prev]
          const fieldIndex = newFields.findIndex(f => f.id === activeFieldId)
          if (fieldIndex !== -1 && newFields[fieldIndex].section !== overSectionId) {
            newFields[fieldIndex] = { ...newFields[fieldIndex], section: overSectionId }
          }
          return newFields
        })
      }
    } else if (isActiveSection) {
      const activeSectionId = parseInt(activeId.split('-')[1])
      if (overSectionId !== undefined) { // parent can be null
        if (isDescendant(activeSectionId, overSectionId)) return;

        setSections(prev => {
          const newSections = [...prev]
          const sectionIndex = newSections.findIndex(s => s.id === activeSectionId)
          if (sectionIndex !== -1 && newSections[sectionIndex].parent !== overSectionId) {
            newSections[sectionIndex] = { ...newSections[sectionIndex], parent: overSectionId }
          }
          return newSections
        })
      }
    }
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) {
        loadForm();
        return;
    }

    const activeId = active.id
    const overId = over.id

    const isActiveSection = String(activeId).startsWith('section-')
    const isActiveField = String(activeId).startsWith('field-')

    let targetSectionId = null
    if (String(overId).startsWith('section-')) {
      targetSectionId = sections.find(s => s.id === parseInt(overId.split('-')[1])).parent
    } else if (String(overId).startsWith('field-')) {
      const field = fields.find(f => f.id === parseInt(overId.split('-')[1]))
      targetSectionId = field.section || field.section_id
    } else if (String(overId).startsWith('empty-')) {
      targetSectionId = parseInt(overId.split('-')[1])
    }

    if (isActiveField && targetSectionId === null) {
        loadForm();
        return;
    }

    const activeItem = isActiveSection 
        ? sections.find(s => s.id === parseInt(activeId.split('-')[1]))
        : fields.find(f => f.id === parseInt(activeId.split('-')[1]));

    if (!activeItem) {
        loadForm();
        return;
    }

    const containerItems = [
      ...sections.filter(s => s.parent === targetSectionId).map(s => ({ ...s, itemType: 'section', sortId: `section-${s.id}` })),
      ...fields.filter(f => (f.section === targetSectionId || f.section_id === targetSectionId)).map(f => ({ ...f, itemType: 'field', sortId: `field-${f.id}` }))
    ].sort((a,b) => a.order - b.order)

    const oldIndex = containerItems.findIndex(i => i.sortId === activeId)
    let newIndex = containerItems.findIndex(i => i.sortId === overId)
    if (newIndex === -1) newIndex = containerItems.length

    if (oldIndex !== -1 || !isActiveSection) { // isActiveSection reordering is handled by SortableContext but cross-container needs careful handling
      const reordered = arrayMove(containerItems, oldIndex !== -1 ? oldIndex : containerItems.length, newIndex)
      const updated = reordered.map((item, index) => ({ ...item, order: index }))
      
      const updatedSections = updated.filter(i => i.itemType === 'section')
      const updatedFields = updated.filter(i => i.itemType === 'field')

      setSections(prev => {
        const others = prev.filter(s => !updatedSections.find(u => u.id === s.id))
        return [...others, ...updatedSections].sort((a,b) => a.order - b.order)
      })
      setFields(prev => {
        const others = prev.filter(f => !updatedFields.find(u => u.id === f.id))
        return [...others, ...updatedFields].sort((a,b) => a.order - b.order)
      })

      try {
        if (isActiveSection) {
          await updateSection(activeItem.id, { ...cleanSectionPayload(activeItem), parent: targetSectionId, order: newIndex })
        } else {
          await updateField(activeItem.id, { ...cleanFieldPayload(activeItem), section: targetSectionId, order: newIndex })
        }
        
        await Promise.all([
          reorderSections(updatedSections.map(s => ({ id: s.id, order: s.order }))),
          reorderFields(updatedFields.map(f => ({ id: f.id, order: f.order })))
        ])
      } catch (err) {
        console.error('Failed to persist:', err)
        loadForm()
      }
    } else {
      loadForm();
    }
  }

  if (loading) return <div className="loading">Chargement du formulaire...</div>
  if (error) return <div className="error">{error}</div>

  const rootSections = sections.filter(s => s.parent === null || s.parent === undefined).sort((a,b) => a.order - b.order)

  return (
    <div className="form-builder">
      <h2>{isEdit ? 'Modifier le formulaire' : 'Créer un nouveau formulaire'}</h2>

      <form onSubmit={handleSaveForm} className="form-details">
        <div className="form-group">
          <label>Nom du formulaire *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows="3"
          />
        </div>

        <button type="submit" disabled={saving}>
          {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer le formulaire'}
        </button>
      </form>

      {form.id && (
        <div className="sections-container">
          <div className="sections-header">
            <h3>Sections</h3>
            <button onClick={() => handleAddSection()} className="btn-secondary">+ Ajouter une section</button>
          </div>

          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {sections.length === 0 ? (
              <p className="empty">Aucune section. Ajoutez-en une pour commencer.</p>
            ) : (
              <div className="sections-list">
                <SortableContext 
                  items={rootSections.map(s => `section-${s.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {rootSections.map(section => (
                    <SortableItem key={section.id} id={`section-${section.id}`}>
                      <SectionBuilder
                        section={section}
                        allSections={sections}
                        allFields={fields}
                        newlyCreatedSectionId={newlyCreatedSectionId}
                        newlyCreatedFieldId={newlyCreatedFieldId}
                        onUpdate={(updated) => {
                          setSections(prev => prev.map(s => s.id === updated.id ? updated : s))
                          setNewlyCreatedSectionId(null)
                        }}
                        onReorderSections={(updatedSections) => {
                          const updatedIds = new Set(updatedSections.map(s => s.id))
                          setSections(prev => [
                            ...prev.filter(s => !updatedIds.has(s.id)),
                            ...updatedSections
                          ])
                        }}
                        onDelete={() => loadForm()}
                        onAddSection={(newSection) => {
                          setSections(prev => [...prev, newSection])
                          setNewlyCreatedSectionId(newSection.id)
                        }}
                        onAddField={handleAddField}
                        onUpdateField={(updatedField) => {
                          setFields(prev => prev.map(f => f.id === updatedField.id ? updatedField : f))
                          setNewlyCreatedFieldId(null)
                        }}
                        onDeleteField={(fieldId) => setFields(prev => prev.filter(f => f.id !== fieldId))}
                      />
                    </SortableItem>
                  ))}
                </SortableContext>
              </div>
            )}
            
            <DragOverlay dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: {
                  active: {
                    opacity: '0.5',
                  },
                },
              }),
            }}>
              {activeId ? (
                <div className="drag-overlay-content" style={{
                  padding: '10px',
                  background: 'white',
                  border: '1px solid var(--primary)',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-lg)',
                  opacity: 0.9
                }}>
                  {String(activeId).startsWith('section-') ? (
                    <strong>Section: {sections.find(s => s.id === parseInt(activeId.split('-')[1]))?.name || 'Sans titre'}</strong>
                  ) : (
                    <span>Champ: {fields.find(f => f.id === parseInt(activeId.split('-')[1]))?.name || 'Sans titre'}</span>
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          <div className="form-actions-bottom" style={{marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '10px'}}>
            <button onClick={handleSaveForm} disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : 'Mettre à jour le formulaire'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
