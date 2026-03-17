import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getForm } from '../api/formsApi'
import { submitForm } from '../api/submissionsApi'
import { getPatients } from '../api/patientsApi'
import FormField from '../components/FormField'

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
  const [selectedPatient, setSelectedPatient] = useState('')
  const [loading, setLoading] = useState(true)
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadForm()
    loadPatients()
  }, [id])

  const loadPatients = async () => {
    try {
      const data = await getPatients()
      setPatients(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load patients:', err)
      setPatients([])
    } finally {
      setPatientsLoading(false)
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
      setError('Failed to load form')
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
      await submitForm(id, formData, selectedPatient || null)
      alert('Form submitted successfully!')
      navigate('/')
    } catch (err) {
      setError('Failed to submit form')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="loading">Loading form...</div>
  if (error) return <div className="error">{error}</div>
  if (!form) return <div className="error">Form not found</div>

  return (
    <div className="form-submission">
      <h2>{form.name}</h2>
      {form.description && <p className="description">{form.description}</p>}

      <form onSubmit={handleSubmit} className="submission-form">
        <div className="patient-selector">
          <label htmlFor="patient-select">Select Patient (Optional)</label>
          <select
            id="patient-select"
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
            disabled={patientsLoading}
          >
            <option value="">-- No Patient --</option>
            {patients.map(patient => (
              <option key={patient.id} value={patient.id}>
                {patient.first_name} {patient.last_name} (DOB: {new Date(patient.birth_date).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

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
            {submitting ? 'Filling...' : 'Fill Form'}
          </button>
          <button type="button" onClick={() => navigate('/')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
