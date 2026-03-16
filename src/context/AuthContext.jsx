import { createContext, useContext, useState, useEffect } from 'react'
import { getCurrentUser, logout as logoutApi, isAuthenticated } from '../api/authApi'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    if (isAuthenticated()) {
      loadUser()
    } else {
      setLoading(false)
    }
  }, [])

  const loadUser = async () => {
    try {
      const userData = await getCurrentUser()
      setUser(userData)
      setAuthenticated(true)
    } catch (err) {
      console.error('Failed to load user:', err)
      setUser(null)
      setAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSetUser = (userData) => {
    setUser(userData)
    setAuthenticated(!!userData)
  }

  const logout = () => {
    logoutApi()
    setUser(null)
    setAuthenticated(false)
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ user, loading, authenticated, setUser: handleSetUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
