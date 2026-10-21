// Draft of a case form, kept in sessionStorage: it survives a reload or an accidental navigation,
// but is gone when the tab closes (drafts contain patient data and must not linger on shared computers).
// The key includes the user, so two people on one tab never see each other's draft.

const PREFIX = 'rcp.draft'
const MAX_AGE_MS = 24 * 3600 * 1000

export const draftKey = (userId, formId, submissionId) => `${PREFIX}:${userId}:${formId}:${submissionId || 'new'}`

/** Drops File objects (not serialisable) so only plain values are stored. */
function plain(data) {
  const out = {}
  Object.entries(data || {}).forEach(([k, v]) => {
    if (typeof File !== 'undefined' && v instanceof File) return
    out[k] = v
  })
  return out
}

export function hasContent(data) {
  return Object.values(plain(data)).some((v) => {
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === 'boolean') return v
    return v !== '' && v !== null && v !== undefined
  })
}

export function saveDraft(storage, key, { data, patient, referenceCode }, now = Date.now()) {
  try {
    if (!hasContent(data) && !patient && !referenceCode) {
      storage.removeItem(key)
      return null
    }
    const draft = { data: plain(data), patient: patient || '', referenceCode: referenceCode || '', savedAt: now }
    storage.setItem(key, JSON.stringify(draft))
    return draft
  } catch (e) {
    return null // storage full or blocked: autosave is a convenience, never a failure
  }
}

export function loadDraft(storage, key, now = Date.now()) {
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    const draft = JSON.parse(raw)
    if (!draft || typeof draft.savedAt !== 'number' || now - draft.savedAt > MAX_AGE_MS) {
      storage.removeItem(key)
      return null
    }
    return draft
  } catch (e) {
    return null
  }
}

export function clearDraft(storage, key) {
  try {
    storage.removeItem(key)
  } catch (e) {
    /* nothing to clear */
  }
}
