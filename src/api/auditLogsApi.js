import { getAuthAxios } from './authApi'

const API_BASE = '/api'

export const getAuditLogs = async (params = {}) => {
  const authAxios = getAuthAxios()
  const sp = new URLSearchParams(params).toString()
  const url = sp ? `${API_BASE}/audit-logs/?${sp}` : `${API_BASE}/audit-logs/`
  const { data } = await authAxios.get(url)
  return data.results ?? data
}

export const getAuditLog = async (id) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/audit-logs/${id}/`)
  return data
}
