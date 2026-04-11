import { getAuthAxios } from './authApi'

import { API_BASE } from './config'

export const getPatients = async (page = 1, search = '') => {
  const params = new URLSearchParams()
  if (search) params.append('search', search)
  if (page) params.append('page', page)
  
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/patients/?${params}`)
  return data.results || data
}

export const getPatient = async (id) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/patients/${id}/`)
  return data
}

export const createPatient = async (patientData) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.post(`${API_BASE}/patients/`, patientData)
  return data
}

export const updatePatient = async (id, patientData) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.put(`${API_BASE}/patients/${id}/`, patientData)
  return data
}

export const deletePatient = async (id) => {
  const authAxios = getAuthAxios()
  await authAxios.delete(`${API_BASE}/patients/${id}/`)
}

export const searchPatients = async (query) => {
  return getPatients(1, query)
}
