import { getAuthAxios } from './authApi'

const API_BASE = '/api'

export const getSubmissions = async (formId) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/submissions/?form=${formId}`)
  return data.results ?? data
}

export const getSubmission = async (id) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/submissions/${id}/`)
  return data
}

export const submitForm = async (formId, submissionData, patientId = null) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.post(`${API_BASE}/submissions/`, {
    form: formId,
    patient: patientId,
    data: submissionData
  })
  return data
}
