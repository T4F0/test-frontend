import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMedicalCase, updateMedicalCase, deleteMedicalCase } from '../api/medicalCasesApi'
import { getAttachments } from '../api/attachmentsApi'
import { getSubmissionsByCase } from '../api/submissionsApi'

const CASE_STATUS_LABELS = { DRAFT: 'Brouillon', SUBMITTED: 'Soumis', VALIDATED: 'Validé', DISCUSSED: 'Discuté', CLOSED: 'Clôturé' }

export default function MedicalCaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [medicalCase, setMedicalCase] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadCaseData()
  }, [id])

  const loadCaseData = async () => {
    try {
      setLoading(true)
      const [caseData, attachmentsData, submissionsData] = await Promise.all([
        getMedicalCase(id),
        getAttachments({ medical_case: id }),
        getSubmissionsByCase(id),
      ])
      setMedicalCase(caseData)
      setNewName(caseData.name || '')
      setAttachments(Array.isArray(attachmentsData) ? attachmentsData : [])
      setSubmissions(Array.isArray(submissionsData) ? submissionsData : [])
    } catch (err) {
      setError('Échec du chargement des détails du dossier médical')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateName = async () => {
    try {
      setUpdating(true)
      const patientName = medicalCase.patient_name
      let finalName = newName.trim()
      
      // If the user's input doesn't already start with the patient's name, prepend it.
      if (!finalName.startsWith(patientName)) {
        finalName = finalName ? `${patientName} - ${finalName}` : patientName
      }

      const updated = await updateMedicalCase(id, { name: finalName })
      setMedicalCase(updated)
      setNewName(updated.name)
      setEditingName(false)
    } catch (err) {
      alert('Échec de la mise à jour du nom du dossier')
    } finally {
      setUpdating(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdating(true)
      const updated = await updateMedicalCase(id, { status: newStatus })
      setMedicalCase(updated)
    } catch (err) {
      alert('Échec de la mise à jour du statut')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce dossier médical ? Toutes les pièces jointes et formulaires associés seront affectés.')) {
      try {
        await deleteMedicalCase(id)
        navigate(`/patients/${medicalCase.patient}`)
      } catch (err) {
        alert('Échec de la suppression du dossier médical')
      }
    }
  }

  if (loading) return <div className="loading">Chargement des détails du dossier...</div>
  if (error) return <div className="error">{error}</div>
  if (!medicalCase) return <div className="error">Dossier médical introuvable</div>

  return (
    <div className="patient-detail-container">
      <div className="detail-header">
        <div className="title-with-edit">
          {editingName ? (
            <div className="edit-name-form">
              <input 
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                className="edit-name-input"
              />
              <button disabled={updating} onClick={handleUpdateName} className="btn-small btn-primary">Enregistrer</button>
              <button onClick={() => { setEditingName(false); setNewName(medicalCase.name || ''); }} className="btn-small btn-secondary">Annuler</button>
            </div>
          ) : (
            <>
              <h1>📁 {medicalCase.name || `Dossier ${id.slice(0, 8)}`}</h1>
              <button onClick={() => setEditingName(true)} className="btn-icon-only" title="Modifier le nom">✏️</button>
            </>
          )}
        </div>
        <div className="detail-actions">
          <button className="btn-danger" onClick={handleDelete}>Supprimer le dossier</button>
          <button className="btn-secondary" onClick={() => navigate(`/patients/${medicalCase.patient}`)}>Retour au patient</button>
        </div>
      </div>

      <div className="case-meta-card">
        <div className="meta-item">
          <label>Statut</label>
          <select 
            value={medicalCase.status} 
            onChange={(e) => handleStatusChange(e.target.value)}
            className="status-select-large"
            disabled={updating}
          >
            {Object.entries(CASE_STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div className="meta-item">
          <label>Créé le</label>
          <p>{new Date(medicalCase.created_at).toLocaleString()}</p>
        </div>
        <div className="meta-item">
          <label>Patient</label>
          <p>{medicalCase.patient_name}</p>
        </div>
      </div>

      <div className="detail-section">
        <div className="section-header">
          <h2>📄 Soumissions de formulaires</h2>
          <button className="btn-primary btn-small" onClick={() => navigate(`/forms`)}>+ Nouvelle soumission</button>
        </div>
        {submissions.length === 0 ? (
          <p className="empty-inline">Aucune soumission de formulaire pour ce dossier.</p>
        ) : (
          <div className="submissions-grid">
            {submissions.map((sub) => (
              <div key={sub.id} className="submission-card-mini" onClick={() => navigate(`/forms/${sub.form}/submissions/${sub.id}`)}>
                <div className="sub-icon">📝</div>
                <div className="sub-info">
                  <span className="sub-form-name">{sub.form_name || 'Soumission de formulaire'}</span>
                  <span className="sub-date">
                    {new Date(sub.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="sub-arrow">→</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="detail-section">
        <div className="section-header">
          <h2>📎 Pièces jointes</h2>
          <button className="btn-primary btn-small" onClick={() => navigate(`/attachments?medical_case=${id}`)}>Gérer les pièces jointes</button>
        </div>
        {attachments.length === 0 ? (
          <p className="empty-inline">Aucune pièce jointe pour ce dossier.</p>
        ) : (
          <table className="forms-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Nom du fichier</th>
                <th>Téléchargé le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {attachments.map((a) => (
                <tr key={a.id}>
                  <td>{a.file_type}</td>
                  <td>{a.file?.split('/').pop()}</td>
                  <td>{new Date(a.uploaded_at).toLocaleDateString()}</td>
                  <td className="actions">
                    <a href={a.file} target="_blank" rel="noopener noreferrer" className="btn-small btn-secondary">Voir</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
