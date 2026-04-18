import { getAuthAxios } from './authApi'

import { API_BASE } from './config'

export const getMeetings = async (params = {}) => {
  const authAxios = getAuthAxios()
  const sp = new URLSearchParams(params).toString()
  const url = sp ? `${API_BASE}/meetings/?${sp}` : `${API_BASE}/meetings/`
  const { data } = await authAxios.get(url)
  return data.results ?? data
}

export const getMeeting = async (id) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.get(`${API_BASE}/meetings/${id}/`)
  return data
}

export const createMeeting = async (payload) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.post(`${API_BASE}/meetings/`, payload)
  return data
}

export const updateMeeting = async (id, payload) => {
  const authAxios = getAuthAxios()
  const { data } = await authAxios.patch(`${API_BASE}/meetings/${id}/`, payload)
  return data
}

export const deleteMeeting = async (id) => {
  const authAxios = getAuthAxios()
  await authAxios.delete(`${API_BASE}/meetings/${id}/`)
}

export const getSubmissionResume = async (meetingId, submissionId = null) => {
  const authAxios = getAuthAxios()
  const url = submissionId 
    ? `${API_BASE}/meetings/${meetingId}/submission_resume/?submission_id=${submissionId}`
    : `${API_BASE}/meetings/${meetingId}/submission_resume/`
  const { data } = await authAxios.get(url)
  return data
}
