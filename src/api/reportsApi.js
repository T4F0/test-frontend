import { getAuthAxios } from './authApi'

import { API_BASE } from './config'

export const getReports = async (params = {}) => {
  const authAxios = getAuthAxios()
  const sp = new URLSearchParams(params).toString()
  const url = sp ? `${API_BASE}/reports/?${sp}` : `${API_BASE}/reports/`
  const { data } = await authAxios.get(url)
  return data.results ?? data
}

export const getReport = async (id) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/reports/${id}/`)
  return data
}

export const getReportsBySubmission = async (submissionId) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/reports/?submission=${submissionId}`)
  return data.results ?? data
}

export const getReportsByPatient = async (patientId) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/reports/?patient=${patientId}`)
  return data.results ?? data
}

/**
 * Create or update the RCP decision/report for a given submission.
 * Only coordinators are allowed by the backend.
 */
export const upsertReport = async (submissionId, content) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.post(`${API_BASE}/reports/upsert/`, {
    submission: submissionId,
    content,
  })
  return data
}

export const downloadReportPdf = async (id) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/reports/${id}/download_report/`, {
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `rcp_report_${id}.pdf`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
