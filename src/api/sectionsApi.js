import axios from 'axios'

import { API_BASE } from './config'

const axiosInstance = axios.create({
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
})

export const getSections = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString()
  const { data } = await axiosInstance.get(`${API_BASE}/sections/?${params}`)
  return data.results || data
}

export const createSection = async (sectionData) => {
  const { data } = await axiosInstance.post(`${API_BASE}/sections/`, sectionData)
  return data
}

export const updateSection = async (id, sectionData) => {
  const { data } = await axiosInstance.put(`${API_BASE}/sections/${id}/`, sectionData)
  return data
}

export const deleteSection = async (id) => {
  await axiosInstance.delete(`${API_BASE}/sections/${id}/`)
}
