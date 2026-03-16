import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { authenticated, loading } = useAuth()

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}
