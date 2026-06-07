import { getAuthAxios } from './authApi'

import { API_BASE } from './config'

export const createField = async (fieldData) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.post(`${API_BASE}/fields/`, fieldData)
  return data
}

export const updateField = async (id, fieldData) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.put(`${API_BASE}/fields/${id}/`, fieldData)
  return data
}

export const deleteField = async (id) => {
  const authAxios = getAuthAxios()
  await authAxios.delete(`${API_BASE}/fields/${id}/`)
}

export const reorderFields = async (orders) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.post(`${API_BASE}/fields/reorder/`, { orders })
  return data
}
