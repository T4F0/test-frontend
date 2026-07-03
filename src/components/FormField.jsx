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
      <label htmlFor={baseProps.id} style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: 'var(--gray-900)' }}>
        {field.name}
        {field.required && <span className="required">*</span>}
        {field.show_rdv && (
          <span 
            title="Champ Report"
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
            📅 Champ Report
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
        <select {...baseProps} style={{ padding: '0.75rem', fontSize: '1rem', border: '1px solid var(--gray-300)', borderRadius: 'var(--border-radius)' }}>
          <option value="">-- Sélectionner --</option>
          {field.options?.map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {field.field_type === 'checkbox' && (
        <div className="checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
          {(!field.options || field.options.length === 0) ? (
            <label className="checkbox-item single" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--gray-50)', borderRadius: 'var(--border-radius)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => onChange(e.target.checked)}
                required={field.required}
              />
              <span className="checkbox-label">{field.name}</span>
            </label>
          ) : (
            <div className="checkbox-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {field.options.map((opt, i) => {
                const currentValues = Array.isArray(value) ? value : []
                const isChecked = currentValues.includes(opt)
                
                return (
                  <label key={i} className="checkbox-item" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--gray-50)', borderRadius: 'var(--border-radius)', cursor: 'pointer', transition: 'background-color 0.2s' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const newValues = e.target.checked
                          ? [...currentValues, opt]
                          : currentValues.filter(v => v !== opt)
                        onChange(newValues)
                      }}
                      style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary)' }}
                    />
                    <span className="checkbox-label" style={{ fontSize: '1rem' }}>{opt}</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}

      {field.field_type === 'file' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            id={`field-${field.id}`}
            name={`field-${field.id}`}
            type="file"
            accept={field.accepted_file_types && field.accepted_file_types !== '*' ? field.accepted_file_types : ".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png,.webp,.tiff,.bmp,.mp4,.avi,.mov,.webm,.mpeg,.dcm,.dicom,.ima"}
            required={field.required}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                const allowedExtensions = [
                  '.pdf', '.docx', '.doc', '.txt',
                  '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.bmp',
                  '.mp4', '.avi', '.mov', '.webm', '.mpeg',
                  '.dcm', '.dicom', '.ima'
                ]
                const ext = '.' + file.name.split('.').pop().toLowerCase()
                if (!allowedExtensions.includes(ext)) {
                  alert(`Le format de fichier "${ext}" n'est pas autorisé. Formats acceptés : PDF, Word, Texte, Images, Vidéos et DICOM.`)
                  e.target.value = ''
                  onChange(null)
                  return
                }
              }
              onChange(file || null)
            }}
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
