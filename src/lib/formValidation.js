// Validation and progress for the case form. Pure functions: easy to test, no React.

/** Flattens sections (and nested children) into one ordered list of fields. */
export function collectFields(sections = []) {
  const out = []
  const walk = (list) => {
    ;[...list]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((section) => {
        const items = [
          ...(section.fields || []).map((f) => ({ kind: 'field', order: f.order ?? 0, f })),
          ...(section.children || []).map((s) => ({ kind: 'section', order: s.order ?? 0, s })),
        ].sort((a, b) => a.order - b.order)
        items.forEach((item) => (item.kind === 'field' ? out.push(item.f) : walk([item.s])))
      })
  }
  walk(sections)
  return out
}

export function isFilled(field, value) {
  if (field.field_type === 'checkbox') {
    const hasOptions = field.options && field.options.length > 0
    return hasOptions ? Array.isArray(value) && value.length > 0 : value === true
  }
  if (field.field_type === 'file') return value instanceof File || (typeof value === 'string' && value.trim() !== '')
  if (value === null || value === undefined) return false
  if (typeof value === 'number') return !Number.isNaN(value)
  return String(value).trim() !== ''
}

/**
 * @returns {{ errors: Record<string,string>, firstErrorId: string|null }}
 * `errors` is keyed by field id; the patient problem uses the key "patient".
 */
export function validateSubmission(sections, data, patientId) {
  const errors = {}
  let firstErrorId = null
  const flag = (key, message) => {
    errors[key] = message
    if (firstErrorId === null) firstErrorId = key
  }
  if (!patientId) flag('patient', 'Veuillez sélectionner un patient.')
  collectFields(sections).forEach((field) => {
    if (field.required && !isFilled(field, data[field.id])) {
      flag(String(field.id), field.field_type === 'checkbox' ? 'Cette case doit être cochée.' : 'Ce champ est obligatoire.')
    }
  })
  return { errors, firstErrorId }
}

/** Completion of the required fields (the patient counts as one), for the progress bar. */
export function requiredProgress(sections, data, patientId) {
  const required = collectFields(sections).filter((f) => f.required)
  const done = required.filter((f) => isFilled(f, data[f.id])).length + (patientId ? 1 : 0)
  const total = required.length + 1
  return { done, total, percent: Math.round((done / total) * 100) }
}
