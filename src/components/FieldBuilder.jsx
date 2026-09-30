import { useState, useEffect } from 'react'

const FIELD_TYPES = [
  { value: 'text', label: 'Texte' },
  { value: 'number', label: 'Nombre' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Liste déroulante' },
  { value: 'checkbox', label: 'Case à cocher' },
  { value: 'file', label: 'Fichier' },
]

export default function FieldBuilder({ field, onUpdate, onDelete, initialEditing = false }) {
  const [isEditing, setIsEditing] = useState(initialEditing)
  const [data, setData] = useState(field)
  const [saving, setSaving] = useState(false)
  const [optionsText, setOptionsText] = useState(field.options ? field.options.join('\n') : '')

  useEffect(() => {
    setData(field)
    setOptionsText(field.options ? field.options.join('\n') : '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.id])

  const handleSave = () => {
    const finalData = {
      ...data,
      options: optionsText.split('\n').map(o => o.trim()).filter(o => o !== '')
    }
    onUpdate(finalData)
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (confirm(`Supprimer le champ "${field.name}" ?`)) {
      onDelete(field.id)
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
              }}
              onFocus={(e) => e.target.select()}
              autoFocus
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

          {['select', 'checkbox'].includes(data.field_type) && (
            <div className="form-row">
              <label>Choix possibles:</label>
              <div className="options-list">
                {optionsText.split('\n').map((option, index) => (
                  <div key={index} className="option-item" style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = optionsText.split('\n');
                        newOptions[index] = e.target.value;
                        setOptionsText(newOptions.join('\n'));
                      }}
                    />
                    <button type="button" onClick={() => {
                      const newOptions = optionsText.split('\n');
                      newOptions.splice(index, 1);
                      setOptionsText(newOptions.join('\n'));
                    }}>-</button>
                  </div>
                ))}
                <button type="button" onClick={() => setOptionsText(optionsText + '\n')}>+ Ajouter un choix</button>
              </div>
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

          <div className="field-options-group">
            <label
              className={`field-option-card ${data.required ? 'active' : ''}`}
              title="Le médecin sera obligé de remplir ce champ avant de soumettre le formulaire."
            >
              <input
                type="checkbox"
                checked={data.required}
                onChange={(e) => setData({ ...data, required: e.target.checked })}
              />
              <span>Champ obligatoire</span>
            </label>

            <label
              className={`field-option-card ${data.show_rdv ? 'active' : ''}`}
              title="Ce champ apparaîtra toujours dans le report, même s'il est laissé vide."
            >
              <input
                type="checkbox"
                checked={data.show_rdv || false}
                onChange={(e) => setData({ ...data, show_rdv: e.target.checked })}
              />
              <span>Toujours afficher dans le report</span>
            </label>

            <label
              className={`field-option-card ${data.hide_on_presentation ? 'active' : ''}`}
              title="Ce champ ne sera pas affiché lors de la présentation en réunion RCP, mais restera visible dans le report."
            >
              <input
                type="checkbox"
                checked={data.hide_on_presentation || false}
                onChange={(e) => setData({ ...data, hide_on_presentation: e.target.checked })}
              />
              <span>Masquer pendant la réunion</span>
            </label>

            <label
              className={`field-option-card ${data.hide_on_report ? 'active' : ''}`}
              title="Ce champ sera exclu du report écrit, même s'il a une valeur renseignée."
            >
              <input
                type="checkbox"
                checked={data.hide_on_report || false}
                onChange={(e) => setData({ ...data, hide_on_report: e.target.checked })}
              />
              <span>Exclure du report</span>
            </label>
          </div>

          <div className="form-actions-inline">
            <button onClick={handleSave} disabled={saving}>Enregistrer</button>
            <button onClick={() => setIsEditing(false)}>Annuler</button>
          </div>
        </div>
      ) : (
        <div className="field-display" onClick={() => setIsEditing(true)} style={{ cursor: 'pointer' }}>
          <div className="field-info">
            <span className="field-name">{data.name || 'Sans titre'}</span>
            <span className="field-type">{data.field_type}</span>
            {data.required && <span className="badge">Obligatoire</span>}
            {data.show_rdv && <span className="badge badge-info">Toujours dans le report</span>}
            {data.hide_on_presentation && <span className="badge badge-warning">Masqué en réunion</span>}
            {data.hide_on_report && <span className="badge badge-warning">Exclu du report</span>}
          </div>
          <div className="field-controls">
            <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="btn-small">Modifier</button>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="btn-small btn-danger">Supprimer</button>
          </div>
        </div>
      )}
    </div>
  )
}
