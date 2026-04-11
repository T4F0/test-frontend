import { getAuthAxios } from './authApi'

import { API_BASE } from './config'

export const getSubmissions = async (formId) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/submissions/?form=${formId}`)
  return data.results ?? data
}

export const getSubmissionsByPatient = async (patientId) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/submissions/?patient=${patientId}`)
  return data.results ?? data
}

export const getSubmissionsByCase = async (caseId) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/submissions/?medical_case=${caseId}`)
  return data.results ?? data
}

export const getSubmission = async (id) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/submissions/${id}/`)
  return data
}

export const submitForm = async (formId, submissionData, patientId = null, medicalCaseId = null) => {
  const authAxios = getAuthAxios()
  const payload = {
    form: formId,
    patient: patientId,
    medical_case: medicalCaseId,
    data: submissionData
  }
  const { data } = await authAxios.post(`${API_BASE}/submissions/`, payload)
  return data
}
