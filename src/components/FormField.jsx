import { toast } from '../lib/toast'
const ALLOWED_EXTENSIONS = [
  '.pdf', '.docx', '.doc', '.txt',
  '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.bmp',
  '.mp4', '.avi', '.mov', '.webm', '.mpeg',
  '.dcm', '.dicom', '.ima',
]

/**
 * One field of a case form. Validation is done by the page (not the browser), which passes `error`;
 * the wrapper id lets the page scroll to the first problem.
 */
export default function FormField({ field, value, onChange, error }) {
  const inputId = `field-${field.id}`
  const describedBy = error ? `${inputId}-error` : undefined
  const common = {
    id: inputId,
    name: inputId,
    'aria-required': field.required || undefined,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  }
  const textProps = { ...common, value: value ?? '', onChange: (e) => onChange(e.target.value) }

  const hasOptions = field.options && field.options.length > 0
  const isSingleCheckbox = field.field_type === 'checkbox' && !hasOptions

  return (
    <div className={`form-field ff ${error ? 'has-error' : ''}`} id={`field-wrap-${field.id}`}>
      {!isSingleCheckbox && (
        <label htmlFor={inputId} className="ff-label">
          {field.name}
          {field.required && <span className="required" aria-hidden="true"> *</span>}
          {field.show_rdv && <span className="ff-badge" title="Ce champ apparaît dans le rapport">Champ report</span>}
        </label>
      )}

      {field.field_type === 'text' && <input type="text" className="ff-input" {...textProps} placeholder={field.placeholder} />}
      {field.field_type === 'number' && <input type="number" className="ff-input" {...textProps} placeholder={field.placeholder} />}
      {field.field_type === 'date' && <input type="date" className="ff-input" {...textProps} />}

      {field.field_type === 'select' && (
        <select className="ff-input" {...textProps}>
          <option value="">-- Sélectionner --</option>
          {field.options?.map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {field.field_type === 'checkbox' && (
        <div className="ff-checks" role={hasOptions ? 'group' : undefined} aria-labelledby={hasOptions ? undefined : undefined}>
          {!hasOptions ? (
            <label className="ff-check">
              <input type="checkbox" {...common} checked={!!value} onChange={(e) => onChange(e.target.checked)} />
              <span>
                {field.name}
                {field.required && <span className="required" aria-hidden="true"> *</span>}
              </span>
            </label>
          ) : (
            field.options.map((opt, i) => {
              const current = Array.isArray(value) ? value : []
              return (
                <label key={i} className="ff-check">
                  <input
                    type="checkbox"
                    checked={current.includes(opt)}
                    aria-invalid={error ? true : undefined}
                    onChange={(e) => onChange(e.target.checked ? [...current, opt] : current.filter((v) => v !== opt))}
                  />
                  <span>{opt}</span>
                </label>
              )
            })
          )}
        </div>
      )}

      {field.field_type === 'file' && (
        <div className="ff-file">
          <input
            {...common}
            type="file"
            className="ff-input"
            accept={field.accepted_file_types && field.accepted_file_types !== '*' ? field.accepted_file_types : ALLOWED_EXTENSIONS.join(',')}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                const ext = '.' + file.name.split('.').pop().toLowerCase()
                if (!ALLOWED_EXTENSIONS.includes(ext)) {
                  toast.error(`Le format de fichier "${ext}" n'est pas autorisé. Formats acceptés : PDF, Word, Texte, Images, Vidéos et DICOM.`)
                  e.target.value = ''
                  onChange(null)
                  return
                }
              }
              onChange(file || null)
            }}
          />
          {value && (
            <button type="button" className="ff-clear" onClick={() => onChange(null)} title="Effacer le fichier" aria-label="Effacer le fichier">
              ×
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="ff-error" id={`${inputId}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
