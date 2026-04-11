import { getAuthAxios } from './authApi'

import { API_BASE } from './config'

export const getMedicalCases = async (params = {}) => {
  const authAxios = getAuthAxios()
  const sp = new URLSearchParams(params).toString()
  const url = sp ? `${API_BASE}/medical-cases/?${sp}` : `${API_BASE}/medical-cases/`
  const { data } = await authAxios.get(url)
  return data.results ?? data
}

export const getMedicalCase = async (id) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/medical-cases/${id}/`)
  return data
}

export const createMedicalCase = async (payload) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.post(`${API_BASE}/medical-cases/`, payload)
  return data
}

export const updateMedicalCase = async (id, payload) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.patch(`${API_BASE}/medical-cases/${id}/`, payload)
  return data
}

export const deleteMedicalCase = async (id) => {
  const authAxios = getAuthAxios()
  await authAxios.delete(`${API_BASE}/medical-cases/${id}/`)
}
