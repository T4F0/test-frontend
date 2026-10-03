import { getAuthAxios } from './authApi'
import { API_BASE } from './config'

export const getDecisionOptions = async (formId) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/decision-options/?form=${formId}`)
  return data.results ?? data
}

export const getAllDecisionOptions = async (formId) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/decision-options/?form=${formId}&include_inactive=true`)
  return data.results ?? data
}

export const createDecisionOption = async (formId, label, order = 0) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.post(`${API_BASE}/decision-options/`, {
    form: formId,
    label,
    order,
  })
  return data
}

export const updateDecisionOption = async (optionId, updates) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.patch(`${API_BASE}/decision-options/${optionId}/`, updates)
  return data
}

export const deleteDecisionOption = async (optionId) => {
  const authAxios = getAuthAxios()
  await authAxios.delete(`${API_BASE}/decision-options/${optionId}/`)
}

export const reorderDecisionOptions = async (orderedIds) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.post(`${API_BASE}/decision-options/reorder/`, {
    ordered_ids: orderedIds,
  })
  return data
}
