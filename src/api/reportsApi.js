import { getAuthAxios } from './authApi'

const API_BASE = '/api'

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
