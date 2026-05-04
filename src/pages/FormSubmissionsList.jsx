import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getForm } from '../api/formsApi'
import { getSubmissions } from '../api/submissionsApi'

export default function FormSubmissionsList() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      setLoading(true)
      const [formData, subsData] = await Promise.all([
        getForm(id),
        getSubmissions({ formId: id }),
      ])
      setForm(formData)
      setSubmissions(Array.isArray(subsData) ? subsData : [])
      setError(null)
    } catch (err) {
      setError('Failed to load form submissions: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading">Chargement des soumissions...</div>
  if (error) return <div className="error">{error}</div>
  if (!form) return <div className="error">Formulaire introuvable</div>

  return (
    <div className="submissions-list">
      <div className="submissions-header">
        <h2>Soumissions : {form.name}</h2>
        <button
          className="btn-secondary"
          onClick={() => navigate('/')}
        >
          ← Retour aux formulaires
        </button>
      </div>

      {submissions.length === 0 ? (
        <p className="empty">Aucune soumission pour ce formulaire.</p>
      ) : (
        <div className="submissions-table-wrapper">
          <table className="forms-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Titre de la soumission</th>
                <th>Statut</th>
                <th>Soumis le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr key={sub.id}>
                  <td>{sub.patient_name ?? '—'}</td>
                  <td>{sub.form_name}</td>
                  <td><span className="badge">{sub.status}</span></td>
                  <td>{new Date(sub.created_at).toLocaleString()}</td>
                  <td>
                    <button
                      className="btn-small btn-secondary"
                      onClick={() => navigate(`/forms/${id}/submissions/${sub.id}`)}
                    >
                      Voir le détail
                    </button>
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
