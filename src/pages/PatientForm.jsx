import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createPatient, updatePatient, getPatient } from '../api/patientsApi'
import { useAuth } from '../context/AuthContext'
import { validatePhoneNumber } from '../lib/validators'

const GENDER_CHOICES = [
  { value: 'M', label: 'Homme' },
  { value: 'F', label: 'Femme' },
  { value: 'O', label: 'Autre' }
]

export default function PatientForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEdit = !!id
  const isMaskedMode = user?.patient_name_display_mode === 'MASKED_NAME'

  const [patient, setPatient] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    gender: 'O',
    anonymized_code: '',
    phone_number: '+213'
  })
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [noPhone, setNoPhone] = useState(false)

  useEffect(() => {
    if (user?.role === 'COORDINATEUR') {
      navigate('/patients', { replace: true })
      return
    }
    if (isEdit) {
      loadPatient()
    }
  }, [id, user, navigate])

  const handlePhoneChange = (e) => {
    const val = e.target.value
    // Always enforce +213 prefix — cannot be deleted
    const safe = !val.startsWith('+213')
      ? ('+213'.startsWith(val) ? '+213' : '+213' + val.replace(/^\+?2?1?3?/, ''))
      : val
    setPatient(prev => ({ ...prev, phone_number: safe }))
  }

  const loadPatient = async () => {
    try {
      const data = await getPatient(id)
      // Ensure loaded phone_number keeps the prefix
      if (!data.phone_number || data.phone_number.trim() === '') {
        setNoPhone(true)
        setPatient({ ...data, phone_number: '+213' })
      } else {
        setNoPhone(false)
        setPatient({ ...data, phone_number: data.phone_number })
      }
    } catch (err) {
      setError('Échec du chargement du patient')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const payload = { ...patient }
    if (noPhone) {
      payload.phone_number = null
    } else {
      if (!payload.phone_number || payload.phone_number === '+213' || !validatePhoneNumber(payload.phone_number)) {
        setError('Le numéro de téléphone doit commencer par +213 suivi de 9 chiffres.')
        return
      }
    }

    try {
      setSaving(true)
      setError(null)
      
      if (isEdit) {
        await updatePatient(id, payload)
      } else {
        await createPatient(payload)
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
              onChange={(e) => {
                let val = e.target.value
                if (isMaskedMode) {
                  val = val.slice(0, 3).toUpperCase()
                }
                setPatient({ ...patient, first_name: val })
              }}
              maxLength={isMaskedMode ? "3" : "100"}
              style={isMaskedMode ? { textTransform: 'uppercase' } : {}}
              placeholder={isMaskedMode ? "EX: JON" : "Ex: Jonathan"}
              required
            />
          </div>
          <div className="form-group">
            <label>Nom *</label>
            <input
              type="text"
              value={patient.last_name}
              onChange={(e) => {
                let val = e.target.value
                if (isMaskedMode) {
                  val = val.slice(0, 3).toUpperCase()
                }
                setPatient({ ...patient, last_name: val })
              }}
              maxLength={isMaskedMode ? "3" : "100"}
              style={isMaskedMode ? { textTransform: 'uppercase' } : {}}
              placeholder={isMaskedMode ? "EX: DEO" : "Ex: Smith"}
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
            placeholder="Identifiant anonymisé"
            required
          />
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Numéro de téléphone</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'normal', fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}>
              <input 
                type="checkbox" 
                checked={noPhone} 
                onChange={(e) => setNoPhone(e.target.checked)} 
                style={{ width: 'auto', margin: 0 }}
              />
              Le patient n'a pas de numéro
            </label>
          </label>
          <input
            type="tel"
            value={patient.phone_number || '+213'}
            onChange={handlePhoneChange}
            placeholder="+213612345678"
            disabled={noPhone}
            style={noPhone ? { opacity: 0.5, backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
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
