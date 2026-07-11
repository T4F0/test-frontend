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
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
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
    let sectionIdsToRemove = [sectionId];
    let fieldIdsToRemove = [];

    const getChildren = (parentId) => {
      const children = sections.filter(s => s.parent === parentId);
      children.forEach(c => {
        sectionIdsToRemove.push(c.id);
        getChildren(c.id);
      });
      const relatedFields = fields.filter(f => f.section === parentId || f.section_id === parentId);
      relatedFields.forEach(f => fieldIdsToRemove.push(f.id));
    };

    getChildren(sectionId);

    const sectionIdsForBackend = sectionIdsToRemove.filter(id => typeof id === 'number');
    const fieldIdsForBackend = fieldIdsToRemove.filter(id => typeof id === 'number');

    if (sectionIdsForBackend.length > 0) {
      setDeletedSections(prev => [...prev, ...sectionIdsForBackend]);
    }
    if (fieldIdsForBackend.length > 0) {
      setDeletedFields(prev => [...prev, ...fieldIdsForBackend]);
    }

    setSections(prev => prev.filter(s => !sectionIdsToRemove.includes(s.id)));
    setFields(prev => prev.filter(f => !fieldIdsToRemove.includes(f.id)));
  }

  const handleDeleteField = (fieldId) => {
    if (typeof fieldId === 'number') {
      setDeletedFields(prev => [...prev, fieldId])
    }
    setFields(prev => prev.filter(f => f.id !== fieldId))
  }

  const isDescendant = (parentId, childId) => {
    if (parentId === childId) return true;
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

  const extractId = (strId) => {
    if (typeof strId !== 'string') return strId;
    const parts = strId.split('-');
    const rawId = parts.slice(1).join('-');
    const numId = parseInt(rawId, 10);
    return isNaN(numId) || rawId.startsWith('temp-') ? rawId : numId;
  };

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
      const overFieldId = extractId(overId)
      const overField = fields.find(f => f.id === overFieldId)
      overSectionId = overField ? (overField.section || overField.section_id) : null
    } else if (String(overId).startsWith('section-')) {
      const overSectId = extractId(overId)
      if (isActiveField) {
        overSectionId = overSectId
      } else {
        const overSection = sections.find(s => s.id === overSectId)
        overSectionId = overSection ? overSection.parent : null
      }
    } else if (String(overId).startsWith('empty-')) {
      overSectionId = extractId(overId)
    }

    if (isActiveField) {
      const activeFieldId = extractId(activeId)
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
      const activeSectionId = extractId(activeId)
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
        return;
    }

    const activeId = active.id
    const overId = over.id

    const isActiveSection = String(activeId).startsWith('section-')
    const isActiveField = String(activeId).startsWith('field-')

    let targetSectionId = null
    if (String(overId).startsWith('section-')) {
      const overSectId = extractId(overId)
      if (isActiveField) {
        targetSectionId = overSectId
      } else {
        targetSectionId = sections.find(s => s.id === overSectId)?.parent
      }
    } else if (String(overId).startsWith('field-')) {
      const field = fields.find(f => f.id === extractId(overId))
      targetSectionId = field ? (field.section || field.section_id) : null
    } else if (String(overId).startsWith('empty-')) {
      targetSectionId = extractId(overId)
    }

    if (isActiveField && targetSectionId == null) {
        return;
    }

    const activeItem = isActiveSection 
        ? sections.find(s => s.id === extractId(activeId))
        : fields.find(f => f.id === extractId(activeId));

    if (!activeItem) {
        return;
    }

    const containerItems = [
      ...sections.filter(s => s.parent === targetSectionId || (s.parent == null && targetSectionId == null)).map(s => ({ ...s, itemType: 'section', sortId: `section-${s.id}` })),
      ...fields.filter(f => (f.section === targetSectionId || f.section_id === targetSectionId)).map(f => ({ ...f, itemType: 'field', sortId: `field-${f.id}` }))
    ].sort((a,b) => a.order - b.order)

    const oldIndex = containerItems.findIndex(i => i.sortId === activeId)
    let newIndex = containerItems.findIndex(i => i.sortId === overId)
    if (newIndex === -1) newIndex = containerItems.length

    if (oldIndex !== -1 || !isActiveSection) { 
      const itemsToMove = oldIndex !== -1 
        ? containerItems 
        : [...containerItems, { ...activeItem, itemType: isActiveSection ? 'section' : 'field', sortId: activeId }]
      
      const effectiveOldIndex = oldIndex !== -1 ? oldIndex : itemsToMove.length - 1
      const reordered = arrayMove(itemsToMove, effectiveOldIndex, newIndex)
      const updated = reordered.map((item, index) => ({ ...item, order: index }))

      setSections(prev => {
        const next = [...prev]
        updated.forEach(u => {
          if (u.itemType === 'section') {
            const idx = next.findIndex(s => s.id === u.id)
            if (idx !== -1) next[idx] = { ...next[idx], order: u.order, parent: targetSectionId }
          }
        })
        return next.sort((a, b) => a.order - b.order)
      })

      setFields(prev => {
        const next = [...prev]
        updated.forEach(u => {
          if (u.itemType === 'field') {
            const idx = next.findIndex(f => f.id === u.id)
            if (idx !== -1) next[idx] = { ...next[idx], order: u.order, section: targetSectionId }
          }
        })
        return next.sort((a, b) => a.order - b.order)
      })
    }
  }

  if (loading) return <div className="loading">Chargement du formulaire...</div>
  if (error) return <div className="error">{error}</div>

  const rootSections = sections.filter(s => s.parent === null || s.parent === undefined).sort((a,b) => a.order - b.order)

  return (
    <div className="form-builder">
      <div className="desktop-only-banner">
        <span className="desktop-only-icon">🖥️</span>
        <div>
          <strong>Éditeur de formulaire</strong>
          <p>La construction de formulaires avec glisser-déposer nécessite un ordinateur. Veuillez utiliser un appareil de bureau ou une tablette en mode paysage.</p>
        </div>
      </div>
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
