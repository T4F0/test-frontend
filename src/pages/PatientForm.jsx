import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createPatient, updatePatient, getPatient } from '../api/patientsApi'

const GENDER_CHOICES = [
  { value: 'M', label: 'Homme' },
  { value: 'F', label: 'Femme' },
  { value: 'O', label: 'Autre' }
]

export default function PatientForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [patient, setPatient] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    gender: 'O',
    anonymized_code: ''
  })
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isEdit) {
      loadPatient()
    }
  }, [id])

  const loadPatient = async () => {
    try {
      const data = await getPatient(id)
      setPatient(data)
    } catch (err) {
      setError('Échec du chargement du patient')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)
      
      if (isEdit) {
        await updatePatient(id, patient)
      } else {
        await createPatient(patient)
      }
      
      navigate('/patients')
    } catch (err) {
      const errorData = err.response?.data
      if (typeof errorData === 'object' && !Array.isArray(errorData)) {
        const fieldErrors = Object.entries(errorData)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n')
        setError(fieldErrors || 'Échec de l\'enregistrement du patient')
      } else {
        setError(err.response?.data?.detail || 'Échec de l\'enregistrement du patient')
      }
      console.error('Error details:', err.response?.data)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading">Chargement du patient...</div>

  return (
    <div className="patient-form-container">
      <h2>{isEdit ? 'Modifier le patient' : 'Créer un nouveau patient'}</h2>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit} className="patient-form">
        <div className="form-row">
          <div className="form-group">
            <label>Prénom *</label>
            <input
              type="text"
              value={patient.first_name}
              onChange={(e) => setPatient({ ...patient, first_name: e.target.value.slice(0, 3).toUpperCase() })}
              maxLength="3"
              style={{ textTransform: 'uppercase' }}
              placeholder="EX: JOH"
              required
            />
          </div>
          <div className="form-group">
            <label>Nom *</label>
            <input
              type="text"
              value={patient.last_name}
              onChange={(e) => setPatient({ ...patient, last_name: e.target.value.slice(0, 3).toUpperCase() })}
              maxLength="3"
              style={{ textTransform: 'uppercase' }}
              placeholder="EX: DOE"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Date de naissance *</label>
            <input
              type="date"
              value={patient.birth_date}
              onChange={(e) => setPatient({ ...patient, birth_date: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Sexe *</label>
            <select
              value={patient.gender}
              onChange={(e) => setPatient({ ...patient, gender: e.target.value })}
            >
              {GENDER_CHOICES.map(choice => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Code anonymisé</label>
          <input
            type="text"
            value={patient.anonymized_code}
            onChange={(e) => setPatient({ ...patient, anonymized_code: e.target.value })}
            placeholder="Identifiant anonymisé optionnel"
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer le patient'}
          </button>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={() => navigate('/patients')}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
