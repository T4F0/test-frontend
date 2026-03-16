import { getAuthAxios } from './authApi'

const API_BASE = '/api'

export const getAttachments = async (params = {}) => {
  const authAxios = getAuthAxios()
  const sp = new URLSearchParams(params).toString()
  const url = sp ? `${API_BASE}/attachments/?${sp}` : `${API_BASE}/attachments/`
  const { data } = await authAxios.get(url)
  return data.results ?? data
}

export const getAttachment = async (id) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/attachments/${id}/`)
  return data
}

export const uploadAttachment = async (formData) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.post(`${API_BASE}/attachments/`, formData) // Axios sets multipart automatically
  return data
}

export const deleteAttachment = async (id) => {
  const authAxios = getAuthAxios()
  await authAxios.delete(`${API_BASE}/attachments/${id}/`)
}
