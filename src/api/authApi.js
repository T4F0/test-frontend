import axios from 'axios'

const API_BASE = '/api'

const authAxios = axios.create()

// Add JWT token to requests
authAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['Accept'] = 'application/json'
  
  // Only set Content-Type to JSON if we're not sending FormData
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json'
  }
  
  return config
})

// Handle token refresh on 401
authAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Don't retry token endpoints themselves
    if (originalRequest.url?.includes('/token/')) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
          throw new Error('No refresh token available')
        }
        const { data } = await axios.post(`${API_BASE}/token/refresh/`, {
          refresh: refreshToken
        })
        localStorage.setItem('access_token', data.access)
        authAxios.defaults.headers.Authorization = `Bearer ${data.access}`
        return authAxios(originalRequest)
      } catch (err) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        // Only redirect if not already on login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export const login = async (username, password) => {
  const { data } = await axios.post(`${API_BASE}/token/`, {
    username,
    password
  })
  localStorage.setItem('access_token', data.access)
  localStorage.setItem('refresh_token', data.refresh)
  return data
}

export const logout = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export const getCurrentUser = async () => {
  const { data } = await authAxios.get(`${API_BASE}/users/me/`)
  return data
}

export const getUsers = async () => {
  const { data } = await authAxios.get(`${API_BASE}/users/`)
  return data.results || data
}

export const createUser = async (userData) => {
  const { data } = await authAxios.post(`${API_BASE}/users/`, userData)
  return data
}

export const updateUser = async (id, userData) => {
  const { data } = await authAxios.put(`${API_BASE}/users/${id}/`, userData)
  return data
}

export const deleteUser = async (id) => {
  await authAxios.delete(`${API_BASE}/users/${id}/`)
}

export const register = async (userData) => {
  const { data } = await axios.post(`${API_BASE}/auth/register/`, userData)
  return data
}

export const getPendingRegistrations = async () => {
  const { data } = await authAxios.get(`${API_BASE}/users/pending_registrations/`)
  return data.results || data
}

export const approveRegistration = async (id) => {
  const { data } = await authAxios.post(`${API_BASE}/users/${id}/approve/`)
  return data
}

export const rejectRegistration = async (id) => {
  const { data } = await authAxios.post(`${API_BASE}/users/${id}/reject/`)
  return data
}

export const getNotifications = async () => {
  const { data } = await authAxios.get(`${API_BASE}/notifications/`)
  return data.results || data
}

export const markNotificationRead = async (id) => {
  const { data } = await authAxios.patch(`${API_BASE}/notifications/${id}/read/`)
  return data
}

export const getAuthAxios = () => authAxios
export const getToken = () => localStorage.getItem('access_token')
export const isAuthenticated = () => !!localStorage.getItem('access_token')
