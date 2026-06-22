import { useState } from 'react'
import FieldBuilder from './FieldBuilder'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { SortableItem } from './SortableItem'

export default function SectionBuilder({ 
  section, 
  allSections, 
  allFields,
  onUpdate, 
  onReorderSections, 
  onDelete, 
  onAddSection, 
  onAddField,
  onUpdateField,
  onDeleteField,
  newlyCreatedSectionId = null,
  newlyCreatedFieldId = null,
  generateTempId
}) {
  const [isEditing, setIsEditing] = useState(section.id === newlyCreatedSectionId)
  const [name, setName] = useState(section.name)
  const [saving, setSaving] = useState(false)

  const childSections = allSections ? allSections.filter(s => s.parent === section.id).map(s => ({ ...s, itemType: 'section' })) : []
  const fields = allFields ? allFields.filter(f => (f.section === section.id || f.section_id === section.id)).map(f => ({ ...f, itemType: 'field' })) : []

  // Combine and sort all items (fields and sub-sections) by their order
  const combinedItems = [...childSections, ...fields].sort((a, b) => a.order - b.order)

  const handleSaveSection = () => {
    const updated = { 
      ...section,
      name,
      form: section.form,
      parent: section.parent,
      order: section.order
    }
    onUpdate(updated)
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (confirm('Supprimer cette section et tout son contenu ?')) {
      onDelete(section.id)
    }
  }

  const handleAddSubSection = () => {
    const order = combinedItems.length
    const newSection = {
      id: generateTempId(),
      form: section.form,
      parent: section.id,
      name: '',
      order: order
    }
    onAddSection(newSection)
  }

  return (
    <div className={`section-builder ${section.parent ? 'nested' : ''}`} id={`section-container-${section.id}`}>
      <div className="section-header">
        {isEditing ? (
          <div className="edit-section">
            <input
              type="text"
              placeholder="Nom de la section"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveSection();
                }
              }}
              onFocus={(e) => e.target.select()}
              autoFocus
            />
            <button onClick={handleSaveSection} disabled={saving}>Enregistrer</button>
            <button onClick={() => setIsEditing(false)}>Annuler</button>
          </div>
        ) : (
          <>
            <h4
              onClick={() => setIsEditing(true)}
              style={{ cursor: 'pointer' }}
              title="Cliquer pour modifier"
            >
              {name || 'Sans titre'}
            </h4>
            <div className="section-actions">
              <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="btn-small">Modifier</button>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="btn-small btn-danger">Supprimer</button>
              <button onClick={(e) => { e.stopPropagation(); onAddField(section.id); }} className="btn-small btn-secondary">+ Champ</button>
              <button onClick={(e) => { e.stopPropagation(); handleAddSubSection(); }} className="btn-small btn-primary">+ Sous-section</button>
            </div>
          </>
        )}
      </div>

      <div className="section-contents">
        <SortableContext 
          items={combinedItems.map(item => item.itemType === 'field' ? `field-${item.id}` : `section-${item.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {combinedItems.map(item => (
            <SortableItem key={item.itemType === 'field' ? `field-${item.id}` : `section-${item.id}`} id={item.itemType === 'field' ? `field-${item.id}` : `section-${item.id}`}>
              {item.itemType === 'field' ? (
                <FieldBuilder
                  field={item}
                  initialEditing={item.id === newlyCreatedFieldId}
                  onUpdate={onUpdateField}
                  onDelete={onDeleteField}
                />
              ) : (
                <SectionBuilder
                  section={item}
                  allSections={allSections}
                  allFields={allFields}
                  onUpdate={onUpdate}
                  onReorderSections={onReorderSections}
                  onDelete={onDelete}
                  onAddSection={onAddSection}
                  onAddField={onAddField}
                  onUpdateField={onUpdateField}
                  onDeleteField={onDeleteField}
                  newlyCreatedSectionId={newlyCreatedSectionId}
                  newlyCreatedFieldId={newlyCreatedFieldId}
                  generateTempId={generateTempId}
                />
              )}
            </SortableItem>
          ))}

          <div 
            id={`empty-${section.id}`} 
            className="empty-drop-zone" 
            style={{ 
              height: combinedItems.length === 0 ? '40px' : '10px', 
              border: '1px dashed #ccc', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#999', 
              fontSize: '0.8rem',
              marginTop: '5px',
              opacity: combinedItems.length === 0 ? 1 : 0.3
            }}
          >
            {combinedItems.length === 0 ? "Déposez un élément ici" : ""}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}
