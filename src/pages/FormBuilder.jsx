import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getForm, createForm, updateForm, syncForm } from '../api/formsApi'
import { getSections } from '../api/sectionsApi'
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
  const [deletedSections, setDeletedSections] = useState([])
  const [deletedFields, setDeletedFields] = useState([])
  const [tempIdCounter, setTempIdCounter] = useState(1)

  const generateTempId = () => {
    const id = `temp-${Date.now()}-${tempIdCounter}`
    setTempIdCounter(c => c + 1)
    return id
  }

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
      const formPayload = {
        name: form.name,
        description: form.description,
        service: form.service
      }

      if (!isEdit) {
        savedForm = await createForm(formPayload)
        // Redirect to edit mode so we can continue with the newly created form ID
        navigate(`/forms/${savedForm.id}/edit`)
        return
      }

      // If in edit mode, sync everything at once
      const payload = {
        form: formPayload,
        sections: sections.map(s => ({
          id: s.id,
          form: id,
          parent: s.parent,
          name: s.name,
          order: s.order
        })),
        fields: fields.map(f => ({
          id: f.id,
          section: f.section || f.section_id,
          name: f.name,
          field_type: f.field_type,
          required: f.required,
          placeholder: f.placeholder,
          options: f.options,
          accepted_file_types: f.accepted_file_types,
          show_rdv: f.show_rdv,
          order: f.order
        })),
        deleted_sections: deletedSections,
        deleted_fields: deletedFields
      }

      await syncForm(id, payload)
      alert('Formulaire mis à jour avec succès')
      navigate('/forms')
    } catch (err) {
      setError('Échec de l\'enregistrement du formulaire')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleAddSection = (parentId = null) => {
    if (!form.id) {
      alert('Veuillez d\'abord enregistrer le formulaire pour créer un brouillon')
      return
    }
    const order = sections.filter(s => s.parent === parentId).length
    const newSection = {
      id: generateTempId(),
      form: form.id,
      parent: parentId,
      name: '',
      order: order
    }
    setSections(prev => [...prev, newSection])
    setNewlyCreatedSectionId(newSection.id)
  }

  const handleAddField = (sectionId) => {
    const sectionFields = fields.filter(f => (f.section === sectionId || f.section_id === sectionId))
    const newField = {
      id: generateTempId(),
      section: sectionId,
      name: '',
      field_type: 'text',
      required: false,
      placeholder: '',
      options: null,
      accepted_file_types: '',
      show_rdv: false,
      order: sectionFields.length
    }
    setFields(prev => [...prev, newField])
    setNewlyCreatedFieldId(newField.id)
  }

  const handleDeleteSection = (sectionId) => {
    if (typeof sectionId === 'number') {
      setDeletedSections(prev => [...prev, sectionId])
    }
    setSections(prev => prev.filter(s => s.id !== sectionId))
    
    // Also remove any child sections or fields visually
    // Note: The backend sync will handle cascading deletes, but we must update the UI state
    const removeChildren = (parentId) => {
      const children = sections.filter(s => s.parent === parentId)
      children.forEach(c => {
        if (typeof c.id === 'number') {
          setDeletedSections(prev => [...prev, c.id])
        }
        removeChildren(c.id)
      })
      setSections(prev => prev.filter(s => s.parent !== parentId))
      
      const relatedFields = fields.filter(f => f.section === parentId || f.section_id === parentId)
      relatedFields.forEach(f => {
        if (typeof f.id === 'number') {
          setDeletedFields(prev => [...prev, f.id])
        }
      })
      setFields(prev => prev.filter(f => f.section !== parentId && f.section_id !== parentId))
    }
    removeChildren(sectionId)
  }

  const handleDeleteField = (fieldId) => {
    if (typeof fieldId === 'number') {
      setDeletedFields(prev => [...prev, fieldId])
    }
    setFields(prev => prev.filter(f => f.id !== fieldId))
  }

  const isDescendant = (parentId, childId) => {
    let current = sections.find(s => s.id === childId);
    while (current && current.parent) {
      if (current.parent === parentId) return true;
      current = sections.find(s => s.id === current.parent);
    }
    return false;
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
      if (isActiveField) {
        overSectionId = overSectId
      } else {
        const overSection = sections.find(s => s.id === overSectId)
        overSectionId = overSection ? overSection.parent : null
      }
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
      const overSectId = parseInt(overId.split('-')[1])
      if (isActiveField) {
        targetSectionId = overSectId
      } else {
        targetSectionId = sections.find(s => s.id === overSectId)?.parent
      }
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

      if (isActiveSection) {
        const activeIndex = prevSections.findIndex(s => s.id === activeItem.id)
        if (activeIndex !== -1) {
          prevSections[activeIndex] = { ...prevSections[activeIndex], parent: targetSectionId, order: newIndex }
        }
      } else {
        const activeIndex = prevFields.findIndex(f => f.id === activeItem.id)
        if (activeIndex !== -1) {
          prevFields[activeIndex] = { ...prevFields[activeIndex], section: targetSectionId, order: newIndex }
        }
      }
      
      setSections(prevSections.sort((a,b) => a.order - b.order))
      setFields(prevFields.sort((a,b) => a.order - b.order))
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
                        onDelete={() => handleDeleteSection(section.id)}
                        onAddSection={(newSection) => {
                          setSections(prev => [...prev, newSection])
                          setNewlyCreatedSectionId(newSection.id)
                        }}
                        onAddField={handleAddField}
                        onUpdateField={(updatedField) => {
                          setFields(prev => prev.map(f => f.id === updatedField.id ? updatedField : f))
                          setNewlyCreatedFieldId(null)
                        }}
                        onDeleteField={handleDeleteField}
                        generateTempId={generateTempId}
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
