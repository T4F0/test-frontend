import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getForms, deleteForm } from '../api/formsApi'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../lib/dateUtils'
import { Search } from 'lucide-react'

export default function FormsList() {
  const [forms, setForms] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

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

  const filteredForms = forms.filter(form => {
    const searchLower = search.toLowerCase()
    return (
      (form.name || '').toLowerCase().includes(searchLower) ||
      (form.description || '').toLowerCase().includes(searchLower)
    )
  })

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
      
      {forms.length > 0 && (
        <div style={{ position: 'relative', maxWidth: '500px', marginBottom: '1.5rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input
            type="text"
            placeholder="Rechercher un formulaire..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="modern-search-input"
            style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem' }}
          />
        </div>
      )}
      
      {forms.length === 0 ? (
        <p className="empty">Aucun formulaire. <Link to="/forms/new">Créez-en un</Link></p>
      ) : filteredForms.length === 0 ? (
        <p className="empty">Aucun formulaire ne correspond à votre recherche "{search}"</p>
      ) : (
        <div className="table-responsive-wrapper">
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
              {filteredForms.map(form => (
                <tr key={form.id}>
                  <td>{form.name}</td>
                  <td>{form.description}</td>
                  <td>{formatDate(form.created_at)}</td>
                  <td className="actions">
                    {user?.role !== 'COORDINATEUR' && (
                      <>
                        <button onClick={() => navigate(`/forms/${form.id}/submit`)}>Remplir</button>
                        <button onClick={() => navigate(`/forms/${form.id}/submissions`)}>Voir les soumissions</button>
                      </>
                    )}
                    <button onClick={() => navigate(`/forms/${form.id}/edit`)}>Modifier</button>
                    {isAdmin && (
                      <button onClick={() => handleDelete(form.id)} className="btn-danger">Supprimer</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
