export const DICOM_ENDPOINT = '/api/conferences/dicom/'

const PREFIXES = ['submission-', 'meeting-']

// Attachment ids may carry a "submission-" / "meeting-" prefix depending on where they came from
export function cleanDicomId(id) {
  let out = String(id ?? '')
  PREFIXES.forEach((prefix) => {
    out = out.replace(prefix, '')
  })
  return out.replace(/\/+$/, '')
}

export function dicomEndpointFor(id) {
  return `${DICOM_ENDPOINT}${cleanDicomId(id)}/`
}

// Normalise legacy "/dicom/submission-<id>/" urls
export function normalizeDicomUrl(url) {
  if (!url || typeof url !== 'string') return url
  return url.replace(`${DICOM_ENDPOINT}submission-`, DICOM_ENDPOINT)
}

// Does a sync message about `syncId` concern the file we are showing?
export function isSameDicomFile(syncId, ...candidates) {
  const sync = String(syncId ?? '')
  if (!sync) return false
  const cleanSync = cleanDicomId(sync)
  return candidates.some((candidate) => {
    const value = String(candidate ?? '')
    return value !== '' && (value === sync || cleanDicomId(value) === cleanSync)
  })
}

// Request the server-side de-identified copy when anonymisation is on
export function withAnonymize(url, anonymize) {
  if (!anonymize || !url.includes(DICOM_ENDPOINT)) return url
  return `${url}${url.includes('?') ? '&' : '?'}anonymize=1`
}

const AUTHOR_COLORS = ['#f97316', '#22d3ee', '#a3e635', '#f472b6', '#c084fc', '#facc15']

// Stable colour per annotation author
export function authorColor(userId) {
  const key = String(userId ?? '')
  let hash = 0
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return AUTHOR_COLORS[hash % AUTHOR_COLORS.length]
}
