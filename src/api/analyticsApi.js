import { getAuthAxios } from './authApi'
import { API_BASE } from './config'

export const getAnalytics = async () => (await getAuthAxios().get(`${API_BASE}/analytics/`)).data
