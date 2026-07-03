import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getForm } from '../api/formsApi'
import { submitForm, getSubmission, updateSubmission } from '../api/submissionsApi'
import { getPatients, getPatient } from '../api/patientsApi'
import { uploadAttachment } from '../api/attachmentsApi'
import { formatDate } from '../lib/dateUtils'
import FormField from '../components/FormField'
import SearchableSelect from '../components/SearchableSelect'

function SectionRenderer({ section, formData, onFieldChange }) {
  const isNested = !!section.parent;

  const combinedItems = [
    ...(section.fields || []).map(f => ({ ...f, itemType: 'field' })),
    ...(section.children || []).map(s => ({ ...s, itemType: 'section' }))
  ].sort((a, b) => a.order - b.order);

  return (
    <div key={section.id} className={`form-section-container ${isNested ? 'nested' : ''}`}>
      <h3 className="section-title">{section.name}</h3>
      
      <div className="section-contents">
        {combinedItems.map(item => (
          item.itemType === 'field' ? (
            <FormField
              key={`field-${item.id}`}
              field={item}
              value={formData[item.id]}
              onChange={(value) => onFieldChange(item.id, value)}
            />
          ) : (
            <SectionRenderer 
              key={`section-${item.id}`} 
              section={item} 
              formData={formData} 
              onFieldChange={onFieldChange} 
            />
          )
        ))}
      </div>
    </div>
  )
}

export default function FormSubmission() {
  const { id, submissionId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const preselectPatientId = location.state?.preselectPatientId
  const incomingReferenceCode = location.state?.referenceCode || ''
  const { user } = useAuth()
  const [form, setForm] = useState(null)
  const [formData, setFormData] = useState({})
  const [referenceCode, setReferenceCode] = useState(incomingReferenceCode)
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(preselectPatientId || '')
  const [loading, setLoading] = useState(true)
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [patientError, setPatientError] = useState(null)

  useEffect(() => {
    if (user?.role === 'COORDINATEUR') {
      navigate('/forms', { replace: true })
      return
    }
    loadInitialData()
  }, [id, submissionId, user, navigate])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      // Load Form
      const formDataResponse = await getForm(id)
      setForm(formDataResponse)
      
      let initialValues = {}
      const initFields = (sections) => {
        sections?.forEach(section => {
          section.fields?.forEach(field => {
            if (field.field_type === 'checkbox') {
              initialValues[field.id] = (field.options && field.options.length > 0) ? [] : false
            } else {
              initialValues[field.id] = ''
            }
          })
          if (section.children) initFields(section.children)
        })
      }
      initFields(formDataResponse.sections)

      // If editing, load submission data
      if (submissionId) {
        setIsEditing(true)
        const submission = await getSubmission(submissionId)
        setSelectedPatient(submission.patient)
        setFormData({ ...initialValues, ...submission.data })
        
        try {
          const patient = await getPatient(submission.patient)
          setPatients(prev => prev.find(p => p.id === patient.id) ? prev : [patient, ...prev])
        } catch (e) {
          console.error('Failed to load patient details', e)
        }
      } else {
        setIsEditing(false)
        setFormData(initialValues)
        if (preselectPatientId) {
          try {
            const patient = await getPatient(preselectPatientId)
            setPatients(prev => prev.find(p => p.id === patient.id) ? prev : [patient, ...prev])
          } catch (e) {
            console.error('Failed to load preselected patient details', e)
          }
        }
      }
    } catch (err) {
      setError('Échec du chargement des données')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

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
    setPatientError(null)

    if (!selectedPatient) {
      setPatientError('Veuillez sélectionner un patient.')
      return
    }

    try {
      setSubmitting(true)

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
      let submission
      if (isEditing) {
        submission = await updateSubmission(submissionId, {
          data: jsonFormData,
          patient: selectedPatient
        })
      } else {
        submission = await submitForm(id, jsonFormData, selectedPatient, '', referenceCode)
      }
      
      const currentSubmissionId = submission.id

      // 3. Upload files linked to this submission
      if (filesToUpload.length > 0) {
        for (const item of filesToUpload) {
          const uploadData = new FormData()
          uploadData.append('file', item.file)
          uploadData.append('submission', currentSubmissionId)
          uploadData.append('file_type', getFileType(item.file))
          
          try {
            await uploadAttachment(uploadData)
          } catch (uploadErr) {
            console.error(`Failed to upload file for field ${item.fieldName}:`, uploadErr)
          }
        }
      }

      alert(isEditing ? 'Soumission mise à jour avec succès !' : 'Formulaire et fichiers soumis avec succès !')
      navigate('/forms/' + id + '/submissions/' + currentSubmissionId)
    } catch (err) {
      setError('Échec de la soumission du formulaire : ' + err.message)
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="loading">Chargement...</div>
  if (error) return <div className="error">{error}</div>
  if (!form) return <div className="error">Formulaire introuvable</div>

  return (
    <div className="form-submission">
      <h2>{isEditing ? `Modifier : ${form.name}` : form.name}</h2>
      {form.description && <p className="description">{form.description}</p>}

      <form onSubmit={handleSubmit} className="submission-form">
        <div className="patient-selection-container">
          <SearchableSelect
            label="Patient"
            placeholder="Rechercher un patient par nom..."
            options={patients.map(p => ({
              value: p.id,
              label: `${p.first_name} ${p.last_name}`,
              subLabel: `DDN : ${formatDate(p.birth_date)}`
            }))}
            value={selectedPatient}
            onChange={(val) => {
              setSelectedPatient(val);
              setPatientError(null);
            }}
            onSearch={setPatientSearch}
            loading={patientsLoading}
            required
            error={patientError}
            disabled={isEditing} // Often we don't want to change the patient once submitted
          />
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
            {submitting ? 'Envoi en cours...' : (isEditing ? 'Mettre à jour' : 'Soumettre le formulaire')}
          </button>
          <button type="button" onClick={() => navigate(-1)}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
