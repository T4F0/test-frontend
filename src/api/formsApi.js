import axios from 'axios'

const API_BASE = '/api'

const axiosInstance = axios.create({
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
})

export const getForms = async () => {
  const { data } = await axiosInstance.get(`${API_BASE}/forms/`)
  return data.results || data
}

export const getForm = async (id) => {
  const { data } = await axiosInstance.get(`${API_BASE}/forms/${id}/`)
  return data
}

export const createForm = async (formData) => {
  const { data } = await axiosInstance.post(`${API_BASE}/forms/`, formData)
  return data
}

export const updateForm = async (id, formData) => {
  const { data } = await axiosInstance.put(`${API_BASE}/forms/${id}/`, formData)
  return data
}

export const deleteForm = async (id) => {
  await axiosInstance.delete(`${API_BASE}/forms/${id}/`)
}
