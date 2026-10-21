import axios from 'axios'
import { getAuthAxios } from './authApi'
import { API_BASE } from './config'

export const getFindings = async (submission) => {
  const { data } = await getAuthAxios().get(`${API_BASE}/case-findings/?submission=${submission}`)
  return data.results ?? data
}
export const createFinding = async (payload) => (await getAuthAxios().post(`${API_BASE}/case-findings/`, payload)).data
export const deleteFinding = async (id) => { await getAuthAxios().delete(`${API_BASE}/case-findings/${id}/`) }

export const searchSubmissions = async (q) => (await getAuthAxios().get(`${API_BASE}/submission-search/`, { params: { q } })).data

export const representSubmission = async (id, meeting) =>
  (await getAuthAxios().post(`${API_BASE}/submissions/${id}/represent/`, meeting ? { meeting } : {})).data

export const getSecondOpinions = async (submission) => (await getAuthAxios().get(`${API_BASE}/submissions/${submission}/second-opinion/`)).data
export const createSecondOpinion = async (submission, payload) =>
  (await getAuthAxios().post(`${API_BASE}/submissions/${submission}/second-opinion/`, payload)).data
export const revokeSecondOpinion = async (id) => (await getAuthAxios().post(`${API_BASE}/second-opinions/${id}/revoke/`)).data

// Public (token-based, no auth header)
export const getPublicSecondOpinion = async (token) => (await axios.get(`${API_BASE}/public/second-opinion/${token}/`)).data
export const replyPublicSecondOpinion = async (token, payload) =>
  (await axios.post(`${API_BASE}/public/second-opinion/${token}/`, payload)).data
