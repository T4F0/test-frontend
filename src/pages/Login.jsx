import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login, getCurrentUser } from '../api/authApi'
import { useAuth } from '../context/AuthContext'

export default function Login() {

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setUser } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      await login(username, password)
      // Reload user data
      const userData = await getCurrentUser()
      setUser(userData)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🏥 Medical Forms</h1>
        <p className="login-subtitle">Patient Information System</p>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="login-footer">
          Demo credentials: Use your hospital account
        </p>
        <p className="login-footer" style={{ marginTop: '0.5rem' }}>
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  )
}
