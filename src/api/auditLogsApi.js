import { getAuthAxios } from './authApi'

import { API_BASE } from './config'

export const getAuditLogs = async (params = {}) => {
  const authAxios = getAuthAxios()
  const sp = new URLSearchParams(params).toString()
  const url = sp ? `${API_BASE}/audit-logs/?${sp}` : `${API_BASE}/audit-logs/`
  const { data } = await authAxios.get(url)
  return { 
    logs: data.results ?? data,
    hasNext: !!data.next,
    hasPrev: !!data.previous,
    count: data.count || 0
  }
}

export const getAuditLog = async (id) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/audit-logs/${id}/`)
  return data
}

/** Downloads the CSV for the current filters (the file is built by the server, capped at 5000 rows). */
export const exportAuditLogsCsv = async (params = {}) => {
  const authAxios = getAuthAxios()
  const sp = new URLSearchParams(params).toString()
  const { data } = await authAxios.get(`${API_BASE}/audit-logs/export/${sp ? `?${sp}` : ''}`, { responseType: 'blob' })
  const url = window.URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = 'historique-activites.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
