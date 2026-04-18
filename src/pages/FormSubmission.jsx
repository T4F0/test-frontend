import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getForm } from '../api/formsApi'
import { submitForm } from '../api/submissionsApi'
import { getPatients } from '../api/patientsApi'
import { getMedicalCases } from '../api/medicalCasesApi'
import FormField from '../components/FormField'
import SearchableSelect from '../components/SearchableSelect'

function SectionRenderer({ section, formData, onFieldChange }) {
  const isNested = !!section.parent;

  return (
    <div key={section.id} className={`form-section-container ${isNested ? 'nested' : ''}`}>
      <h3 className="section-title">{section.name}</h3>
      
      <div className="section-fields">
        {section.fields?.map(field => (
          <FormField
            key={field.id}
            field={field}
            value={formData[field.id]}
            onChange={(value) => onFieldChange(field.id, value)}
          />
        ))}
      </div>

      {section.children?.length > 0 && (
        <div className="nested-sections">
          {section.children.map(child => (
            <SectionRenderer 
              key={child.id} 
              section={child} 
              formData={formData} 
              onFieldChange={onFieldChange} 
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FormSubmission() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [formData, setFormData] = useState({})
  const [patients, setPatients] = useState([])
  const [medicalCases, setMedicalCases] = useState([])
  const [selectedPatient, setSelectedPatient] = useState('')
  const [selectedCase, setSelectedCase] = useState('')
  const [loading, setLoading] = useState(true)
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')

  useEffect(() => {
    loadForm()
  }, [id])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPatients(patientSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [patientSearch])

  useEffect(() => {
    if (selectedPatient) {
      loadMedicalCases(selectedPatient)
    } else {
      setMedicalCases([])
      setSelectedCase('')
    }
  }, [selectedPatient])

  const loadPatients = async (search = '') => {
    try {
      const data = await getPatients(1, search)
      setPatients(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load patients:', err)
      setPatients([])
    } finally {
      setPatientsLoading(false)
    }
  }

  const loadMedicalCases = async (patientId) => {
    try {
      const data = await getMedicalCases({ patient: patientId })
      setMedicalCases(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load medical cases:', err)
      setMedicalCases([])
    }
  }

  const loadForm = async () => {
    try {
      const data = await getForm(id)
      setForm(data)
      const initialData = {}
      const initFields = (sections) => {
        sections?.forEach(section => {
          section.fields?.forEach(field => {
            initialData[field.id] = field.field_type === 'checkbox' ? false : ''
          })
          if (section.children) initFields(section.children)
        })
      }
      initFields(data.sections)
      setFormData(initialData)
    } catch (err) {
      setError('Échec du chargement du formulaire')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (fieldId, value) => {
    setFormData({ ...formData, [fieldId]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      if (!selectedPatient || !selectedCase) {
        throw new Error('Veuillez sélectionner un patient et un dossier médical.')
      }
      await submitForm(id, formData, selectedPatient, selectedCase)
      alert('Formulaire soumis avec succès !')
      navigate('/')
    } catch (err) {
      setError('Échec de la soumission du formulaire')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="loading">Chargement du formulaire...</div>
  if (error) return <div className="error">{error}</div>
  if (!form) return <div className="error">Formulaire introuvable</div>

  return (
    <div className="form-submission">
      <h2>{form.name}</h2>
      {form.description && <p className="description">{form.description}</p>}

      <form onSubmit={handleSubmit} className="submission-form">
        <SearchableSelect
          label="Patient"
          placeholder="Rechercher un patient par nom..."
          options={patients.map(p => ({
            value: p.id,
            label: `${p.first_name} ${p.last_name}`,
            subLabel: `DDN : ${new Date(p.birth_date).toLocaleDateString()}`
          }))}
          value={selectedPatient}
          onChange={setSelectedPatient}
          onSearch={setPatientSearch}
          loading={patientsLoading}
          required
        />

        {selectedPatient && (
          <div className="patient-selector" style={{ borderColor: 'var(--secondary)' }}>
            <label htmlFor="case-select">Sélectionner un dossier médical</label>
            <select
              id="case-select"
              value={selectedCase}
              onChange={(e) => setSelectedCase(e.target.value)}
              required
            >
              <option value="">-- Sélectionner un dossier --</option>
              {medicalCases.map(mc => (
                <option key={mc.id} value={mc.id}>
                  {mc.name || `Dossier ${String(mc.id).slice(0, 8)}...`} — {mc.status}
                </option>
              ))}
            </select>
            {medicalCases.length === 0 && (
              <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '0.5rem' }}>
                Aucun dossier médical trouvé pour ce patient.
              </p>
            )}
          </div>
        )}

        {form.sections?.map(section => (
          <SectionRenderer 
            key={section.id} 
            section={section} 
            formData={formData} 
            onFieldChange={handleFieldChange} 
          />
        ))}

        <div className="form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Envoi en cours...' : 'Soumettre le formulaire'}
          </button>
          <button type="button" onClick={() => navigate('/')}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
