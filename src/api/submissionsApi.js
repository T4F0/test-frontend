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

export const getSubmission = async (id) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/submissions/${id}/`)
  return data
}

export const submitForm = async (formId, submissionData, patientId = null, name = "") => {
  const authAxios = getAuthAxios()
  const payload = {
    form: formId,
    patient: patientId,
    data: submissionData,
    name: name
  }
  const { data } = await authAxios.post(`${API_BASE}/submissions/`, payload)
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
