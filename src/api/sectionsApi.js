import { getAuthAxios } from './authApi'

import { API_BASE } from './config'

export const getSections = async (filters = {}) => {
  const authAxios = getAuthAxios()
  const params = new URLSearchParams(filters).toString()
  const url = params ? `${API_BASE}/sections/?${params}` : `${API_BASE}/sections/`
  const { data } = await authAxios.get(url)
  return data.results || data
}

export const createSection = async (sectionData) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.post(`${API_BASE}/sections/`, sectionData)
  return data
}

export const updateSection = async (id, sectionData) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.put(`${API_BASE}/sections/${id}/`, sectionData)
  return data
}

export const deleteSection = async (id) => {
  const authAxios = getAuthAxios()
  await authAxios.delete(`${API_BASE}/sections/${id}/`)
}

export const reorderSections = async (orders) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.post(`${API_BASE}/sections/reorder/`, { orders })
  return data
}
