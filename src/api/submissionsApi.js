import { getAuthAxios } from './authApi'
import { API_BASE } from './config'

export const getSubmissions = async (filters = {}) => {
  const authAxios = getAuthAxios()
  const params = new URLSearchParams()
  if (filters.formId) params.append('form', filters.formId)
  if (filters.patientId) params.append('patient', filters.patientId)
  if (filters.status) params.append('status', filters.status)
  
  const { data } = await authAxios.get(`${API_BASE}/submissions/?${params.toString()}`)
  return data.results ?? data
}

export const getSubmissionsByPatient = async (patientId) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/submissions/?patient=${patientId}`)
  return data.results ?? data
}

/**
 * Fetch only dossiers eligible for a new meeting (status = NOUVEAU or A_REDISCUTER).
 * Used in MeetingForm to avoid showing already-closed cases.
 */
export const getSubmissionsByPatientForMeeting = async (patientId) => {
  const authAxios = getAuthAxios()
  const params = new URLSearchParams({ patient: patientId })
  params.append('status', 'NOUVEAU')
  params.append('status', 'A_REDISCUTER')
  const { data } = await authAxios.get(`${API_BASE}/submissions/?${params.toString()}`)
  return data.results ?? data
}

/**
 * Manually change the status of a submission.
 * Allowed values: 'NOUVEAU', 'A_REDISCUTER', 'CLOTURE'
 */
export const markSubmissionStatus = async (submissionId, newStatus) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.patch(`${API_BASE}/submissions/${submissionId}/`, { status: newStatus })
  return data
}

/**
 * Fetch status change history for a submission.
 */
export const getSubmissionHistory = async (submissionId) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/submissions/${submissionId}/history/`)
  return data
}

export const getSubmission = async (id) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/submissions/${id}/`)
  return data
}

export const submitForm = async (formId, submissionData, patientId = null, name = "", referenceCode = "") => {
  const authAxios = getAuthAxios()
  const payload = {
    form: formId,
    patient: patientId,
    data: submissionData,
    name: name,
    ...(referenceCode ? { reference_code: referenceCode } : {})
  }
  const { data } = await authAxios.post(`${API_BASE}/submissions/`, payload)
  return data
}

export const checkReferenceCode = async (code) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/submissions/check-reference/?code=${encodeURIComponent(code)}`)
  return data
}

export const updateSubmission = async (id, patchData) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.patch(`${API_BASE}/submissions/${id}/`, patchData)
  return data
}

export const deleteSubmission = async (id) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.delete(`${API_BASE}/submissions/${id}/`)
  return data
}
