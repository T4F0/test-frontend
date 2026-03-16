import axios from 'axios'

const API_BASE = '/api'

const axiosInstance = axios.create({
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
})

export const createField = async (fieldData) => {
  const { data } = await axiosInstance.post(`${API_BASE}/fields/`, fieldData)
  return data
}

export const updateField = async (id, fieldData) => {
  const { data } = await axiosInstance.put(`${API_BASE}/fields/${id}/`, fieldData)
  return data
}

export const deleteField = async (id) => {
  await axiosInstance.delete(`${API_BASE}/fields/${id}/`)
}
