export default function FormField({ field, value, onChange }) {
  const baseProps = {
    id: `field-${field.id}`,
    name: `field-${field.id}`,
    value: value || '',
    onChange: (e) => onChange(e.target.value),
    required: field.required,
  }

  return (
    <div className="form-field">
      <label htmlFor={baseProps.id}>
        {field.name}
        {field.required && <span className="required">*</span>}
        {field.show_rdv && (
          <span 
            title="Champ RDV"
            style={{ 
              marginLeft: '8px', 
              fontSize: '0.75em', 
              backgroundColor: '#e0f2fe', 
              color: '#0284c7', 
              padding: '2px 6px', 
              borderRadius: '12px',
              fontWeight: '500',
              border: '1px solid #bae6fd'
            }}>
            📅 Champ RDV
          </span>
        )}
      </label>

      {field.field_type === 'text' && (
        <input type="text" {...baseProps} placeholder={field.placeholder} />
      )}

      {field.field_type === 'number' && (
        <input type="number" {...baseProps} placeholder={field.placeholder} />
      )}

      {field.field_type === 'date' && (
        <input type="date" {...baseProps} />
      )}

      {field.field_type === 'select' && (
        <select {...baseProps}>
          <option value="">-- Sélectionner --</option>
          {field.options?.map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {field.field_type === 'checkbox' && (
        <input
          type="checkbox"
          {...baseProps}
          checked={value || false}
          onChange={(e) => onChange(e.target.checked)}
        />
      )}

      {field.field_type === 'file' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            id={`field-${field.id}`}
            name={`field-${field.id}`}
            type="file"
            accept={field.accepted_file_types || "*"}
            required={field.required}
            onChange={(e) => onChange(e.target.files[0])}
            style={{ flex: 1 }}
          />
          {value && (
            <button 
              type="button"
              className="btn-small btn-secondary" 
              onClick={() => onChange(null)}
              title="Effacer le fichier"
              style={{ padding: '0.4rem' }}
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  )
}
