import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '../api/authApi'

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    hospital: '',
    specialty: ''
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      await register(formData)
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.username?.[0] || 'Registration failed')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <h1>🏥 Registration Submitted</h1>
          <p style={{ marginTop: '1rem', color: '#666' }}>
            Your registration request has been submitted successfully to the administrator. 
            You will be notified once your account is approved.
          </p>
          <button 
            className="login-button" 
            style={{ marginTop: '2rem' }}
            onClick={() => navigate('/login')}
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: '500px' }}>
        <h1>🏥 Doctor Registration</h1>
        <p className="login-subtitle">Join the Medical Forms platform</p>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error">{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Hospital</label>
            <input
              type="text"
              name="hospital"
              value={formData.hospital}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Specialty</label>
            <input
              type="text"
              name="specialty"
              value={formData.specialty}
              onChange={handleChange}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="login-button"
            style={{ marginTop: '1rem' }}
          >
            {loading ? 'Submitting...' : 'Register'}
          </button>
        </form>

        <p className="login-footer">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  )
}
