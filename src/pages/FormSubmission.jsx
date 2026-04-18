import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getForm } from '../api/formsApi'
import { submitForm } from '../api/submissionsApi'
import { getPatients } from '../api/patientsApi'
import { uploadAttachment } from '../api/attachmentsApi'
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
  const [selectedPatient, setSelectedPatient] = useState('')
  const [submissionName, setSubmissionName] = useState('')
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

  const getFileType = (file) => {
    const mime = file.type
    if (mime.includes('pdf')) return 'PDF'
    if (mime.includes('image')) return 'IMAGE'
    if (mime.includes('video')) return 'VIDEO'
    if (mime.includes('dicom') || file.name.toLowerCase().endsWith('.dcm')) return 'DICOM'
    return 'PDF'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      if (!selectedPatient) {
        throw new Error('Veuillez sélectionner un patient.')
      }

      // 1. Separate files from JSON data
      const jsonFormData = { ...formData }
      const filesToUpload = []

      // Recursive function to find file fields in the form structure
      const findFiles = (sections) => {
        sections?.forEach(section => {
          section.fields?.forEach(field => {
            if (field.field_type === 'file' && formData[field.id] instanceof File) {
              filesToUpload.push({
                fieldId: field.id,
                fieldName: field.name,
                file: formData[field.id]
              })
              // Replace File object with filename in JSON data
              jsonFormData[field.id] = formData[field.id].name
            }
          })
          if (section.children) findFiles(section.children)
        })
      }
      findFiles(form.sections)

      // 2. Submit form JSON
      const submission = await submitForm(id, jsonFormData, selectedPatient, submissionName)
      const submissionId = submission.id

      // 3. Upload files linked to this submission
      if (filesToUpload.length > 0) {
        for (const item of filesToUpload) {
          const uploadData = new FormData()
          uploadData.append('file', item.file)
          uploadData.append('submission', submissionId)
          uploadData.append('file_type', getFileType(item.file))
          
          try {
            await uploadAttachment(uploadData)
          } catch (uploadErr) {
            console.error(`Failed to upload file for field ${item.fieldName}:`, uploadErr)
          }
        }
      }

      alert('Formulaire et fichiers soumis avec succès !')
      navigate('/patients/' + selectedPatient)
    } catch (err) {
      setError('Échec de la soumission du formulaire : ' + err.message)
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
        <div className="patient-selection-container">
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
        </div>

        <div className="submission-meta-fields">
          <div className="form-field">
            <label htmlFor="submission-name">Nom de la soumission / Dossier (Optionnel)</label>
            <input 
              type="text" 
              id="submission-name"
              placeholder="Ex: Consultation initiale, Suivi Post-Op..."
              value={submissionName}
              onChange={(e) => setSubmissionName(e.target.value)}
            />
          </div>
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
