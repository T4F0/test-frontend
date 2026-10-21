import { getAuthAxios } from './authApi'
import { API_BASE } from './config'

export const getDecisionActions = async (params = {}) => {
  const sp = new URLSearchParams(params).toString()
  const { data } = await getAuthAxios().get(`${API_BASE}/decision-actions/${sp ? `?${sp}` : ''}`)
  return data.results ?? data
}

export const createDecisionAction = async (payload) => {
  const { data } = await getAuthAxios().post(`${API_BASE}/decision-actions/`, payload)
  return data
}

export const updateDecisionAction = async (id, payload) => {
  const { data } = await getAuthAxios().patch(`${API_BASE}/decision-actions/${id}/`, payload)
  return data
}

export const deleteDecisionAction = async (id) => {
  await getAuthAxios().delete(`${API_BASE}/decision-actions/${id}/`)
}
