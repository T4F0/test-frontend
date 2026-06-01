import { getAuthAxios } from './authApi'

import { API_BASE } from './config'

export const getForms = async () => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/forms/`)
  return data.results || data
}

export const getForm = async (id) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/forms/${id}/`)
  return data
}

export const createForm = async (formData) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.post(`${API_BASE}/forms/`, formData)
  return data
}

export const updateForm = async (id, formData) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.put(`${API_BASE}/forms/${id}/`, formData)
  return data
}

export const deleteForm = async (id) => {
  const authAxios = getAuthAxios()
  await authAxios.delete(`${API_BASE}/forms/${id}/`)
}
