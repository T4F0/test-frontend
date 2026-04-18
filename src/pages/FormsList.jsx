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
    if (confirm('Êtes-vous sûr ? Cette action est irréversible.')) {
      try {
        await deleteForm(id)
        setForms(forms.filter(f => f.id !== id))
      } catch (err) {
        setError('Échec de la suppression du formulaire')
      }
    }
  }

  if (loading) return <div className="loading">Chargement des formulaires...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="forms-list">
      <div className="list-header">
        <h1>Formulaires</h1>
        <div className="list-header-actions">
          <button className="btn-create-form" onClick={() => navigate('/forms/new')}>
            <span className="btn-icon">+</span> Créer un formulaire
          </button>
        </div>
      </div>
      
      {forms.length === 0 ? (
        <p className="empty">Aucun formulaire. <a href="/forms/new">Créez-en un</a></p>
      ) : (
        <table className="forms-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Description</th>
              <th>Créé</th>
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
                  <button onClick={() => navigate(`/forms/${form.id}/submit`)}>Remplir</button>
                  <button onClick={() => navigate(`/forms/${form.id}/submissions`)}>Voir les soumissions</button>
                  <button onClick={() => navigate(`/forms/${form.id}/edit`)}>Modifier</button>
                  <button onClick={() => handleDelete(form.id)} className="btn-danger">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
