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
          <option value="">-- Select --</option>
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
        <input
          type="file"
          {...baseProps}
          accept={field.accepted_file_types}
          onChange={(e) => onChange(e.target.files[0])}
        />
      )}
    </div>
  )
}
