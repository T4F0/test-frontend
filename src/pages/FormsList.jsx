import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getForms, deleteForm } from '../api/formsApi'

export default function FormsList() {
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadForms()
  }, [])

  const loadForms = async () => {
    try {
      setLoading(true)
      const data = await getForms()
      console.log('API Response:', data)
      console.log('Type:', typeof data)
      console.log('Is Array:', Array.isArray(data))
      const formsArray = Array.isArray(data) ? data : (data?.results || [])
      setForms(formsArray)
      setError(null)
    } catch (err) {
      setError('Failed to load forms: ' + err.message)
      console.error('Full error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure? This cannot be undone.')) {
      try {
        await deleteForm(id)
        setForms(forms.filter(f => f.id !== id))
      } catch (err) {
        setError('Failed to delete form')
      }
    }
  }

  if (loading) return <div className="loading">Loading forms...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="forms-list">
      <div className="list-header">
        <h1>Forms</h1>
        <div className="list-header-actions">
          <button className="btn-create-form" onClick={() => navigate('/forms/new')}>
            <span className="btn-icon">+</span> Create Form
          </button>
        </div>
      </div>
      
      {forms.length === 0 ? (
        <p className="empty">No forms yet. <a href="/forms/new">Create one</a></p>
      ) : (
        <table className="forms-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {forms.map(form => (
              <tr key={form.id}>
                <td>{form.name}</td>
                <td>{form.description}</td>
                <td>{new Date(form.created_at).toLocaleDateString()}</td>
                <td className="actions">
                  <button onClick={() => navigate(`/forms/${form.id}/submit`)}>Fill</button>
                  <button onClick={() => navigate(`/forms/${form.id}/submissions`)}>View Submissions</button>
                  <button onClick={() => navigate(`/forms/${form.id}/edit`)}>Edit</button>
                  <button onClick={() => handleDelete(form.id)} className="btn-danger">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
