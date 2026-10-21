import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getForm } from '../api/formsApi'
import { submitForm, getSubmission, updateSubmission, getSubmissionsByPatient } from '../api/submissionsApi'
import { getPatients, getPatient } from '../api/patientsApi'
import { uploadAttachment } from '../api/attachmentsApi'
import { formatDate } from '../lib/dateUtils'
import FormField from '../components/FormField'
import SearchableSelect from '../components/SearchableSelect'
import Breadcrumbs from '../components/Breadcrumbs'
import StatusBadge from '../components/StatusBadge'
import { useConfirm } from '../components/ConfirmDialog'
import { validateSubmission, requiredProgress } from '../lib/formValidation'
import { clearDraft, draftKey, hasContent, loadDraft, saveDraft } from '../lib/formDraft'
import { CheckCircle2, CircleAlert, RotateCcw, UserRound } from 'lucide-react'
import { toast } from '../lib/toast'

const AUTOSAVE_DELAY_MS = 800
const ageFrom = (birth) => {
  if (!birth) return null
  const d = new Date(birth)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age -= 1
  return age
}

function SectionRenderer({ section, formData, onFieldChange, errors }) {
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
              error={errors[item.id]}
              onChange={(value) => onFieldChange(item.id, value)}
            />
          ) : (
            <SectionRenderer 
              key={`section-${item.id}`} 
              section={item} 
              formData={formData} 
              onFieldChange={onFieldChange} 
              errors={errors}
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
  const [searchParams] = useSearchParams()
  const copyFromId = searchParams.get('copy')
  const [copiedFrom, setCopiedFrom] = useState(false)
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
  const [errors, setErrors] = useState({})
  const [dirty, setDirty] = useState(false)
  const [pendingDraft, setPendingDraft] = useState(null)
  const [savedAt, setSavedAt] = useState(null)
  const [patientCases, setPatientCases] = useState([])
  const confirm = useConfirm()
  const submittedRef = useRef(false)
  const key = draftKey(user?.id, id, submissionId)

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
        if (copyFromId) {
          // Template: reuse the clinical answers of an earlier case, minus files, for a new patient
          try {
            const source = await getSubmission(copyFromId)
            const fileIds = new Set()
            const collect = (sections) => sections?.forEach((sec) => {
              sec.fields?.forEach((f) => f.field_type === 'file' && fileIds.add(String(f.id)))
              collect(sec.children)
            })
            collect(formDataResponse.sections)
            const kept = Object.fromEntries(Object.entries(source.data || {}).filter(([k]) => !fileIds.has(String(k)) && k in initialValues))
            setFormData({ ...initialValues, ...kept })
            setCopiedFrom(true)
          } catch (e) {
            console.error('Failed to copy case', e)
          }
        }
        const draft = loadDraft(window.sessionStorage, draftKey(user?.id, id, null))
        if (draft && hasContent(draft.data)) setPendingDraft(draft)
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
    setFormData((prev) => ({ ...prev, [fieldId]: value }))
    setDirty(true)
    setErrors((prev) => {
      if (!prev[fieldId]) return prev
      const next = { ...prev }
      delete next[fieldId]
      return next
    })
  }

  const restoreDraft = () => {
    if (!pendingDraft) return
    setFormData((prev) => ({ ...prev, ...pendingDraft.data }))
    if (pendingDraft.patient) setSelectedPatient(pendingDraft.patient)
    if (pendingDraft.referenceCode) setReferenceCode(pendingDraft.referenceCode)
    setSavedAt(pendingDraft.savedAt)
    setPendingDraft(null)
    setDirty(true)
  }

  const discardDraft = () => {
    clearDraft(window.sessionStorage, key)
    setPendingDraft(null)
  }

  // Autosave a moment after the last change (never while a restore decision is pending)
  useEffect(() => {
    if (!dirty || pendingDraft || submittedRef.current) return undefined
    const timer = setTimeout(() => {
      const saved = saveDraft(window.sessionStorage, key, { data: formData, patient: selectedPatient, referenceCode })
      if (saved) setSavedAt(saved.savedAt)
    }, AUTOSAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [dirty, pendingDraft, formData, selectedPatient, referenceCode, key])

  // Warn before the tab is closed or reloaded with unsaved work
  useEffect(() => {
    if (!dirty) return undefined
    const warn = (e) => {
      if (submittedRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // Previous cases of the selected patient, for the side panel
  useEffect(() => {
    if (!selectedPatient) {
      setPatientCases([])
      return undefined
    }
    let cancelled = false
    getSubmissionsByPatient(selectedPatient)
      .then((rows) => !cancelled && setPatientCases(Array.isArray(rows) ? rows.filter((r) => String(r.id) !== String(submissionId)) : []))
      .catch(() => !cancelled && setPatientCases([]))
    return () => {
      cancelled = true
    }
  }, [selectedPatient, submissionId])

  const scrollToError = useCallback((errorKey) => {
    const el = document.getElementById(errorKey === 'patient' ? 'patient-selection' : `field-wrap-${errorKey}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => el.querySelector('input, select, textarea, button')?.focus({ preventScroll: true }), 350)
  }, [])

  const handleCancel = async () => {
    if (dirty && hasContent(formData)) {
      const ok = await confirm({
        title: 'Quitter sans soumettre ?',
        message: 'Un brouillon est conservé pour cette session : vous pourrez le reprendre en rouvrant ce formulaire.',
        confirmLabel: 'Quitter',
      })
      if (!ok) return
    }
    navigate(-1)
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

    const { errors: found, firstErrorId } = validateSubmission(form.sections, formData, selectedPatient)
    setErrors(found)
    if (firstErrorId) {
      if (found.patient) setPatientError(found.patient)
      scrollToError(firstErrorId)
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

      submittedRef.current = true
      clearDraft(window.sessionStorage, key)
      toast.success(isEditing ? 'Soumission mise à jour avec succès !' : 'Formulaire et fichiers soumis avec succès !')
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

  const patient = patients.find((p) => String(p.id) === String(selectedPatient))
  const age = ageFrom(patient?.birth_date)
  const progress = requiredProgress(form.sections, formData, selectedPatient)
  const errorCount = Object.keys(errors).length

  return (
    <div className="form-submission fs-page">
      <Breadcrumbs items={[{ label: 'Formulaires', to: '/forms' }, { label: form.name }]} />
      <div className="fs-header">
        <div>
          <h1 className="fs-title">{isEditing ? `Modifier : ${form.name}` : form.name}</h1>
          {form.description && <p className="description">{form.description}</p>}
        </div>
        <div className="fs-status" aria-live="polite">
          {savedAt ? (
            <span className="fs-saved"><CheckCircle2 size={16} aria-hidden="true" /> Brouillon enregistré à {new Date(savedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          ) : dirty ? (
            <span className="fs-saving">Enregistrement du brouillon…</span>
          ) : null}
        </div>
      </div>

      {copiedFrom && (
        <div className="fs-draft-banner" role="status">
          <RotateCcw size={18} aria-hidden="true" />
          <span>Modèle repris d’un dossier précédent (sans fichiers). Choisissez le patient et adaptez les réponses.</span>
        </div>
      )}

      {pendingDraft && (
        <div className="fs-draft-banner" role="alert">
          <RotateCcw size={18} aria-hidden="true" />
          <span>
            Un brouillon de ce formulaire a été enregistré le {new Date(pendingDraft.savedAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.
          </span>
          <button type="button" className="ui-btn ui-btn-primary" onClick={restoreDraft}>Reprendre</button>
          <button type="button" className="ui-btn ui-btn-ghost" onClick={discardDraft}>Ignorer</button>
        </div>
      )}

      {errorCount > 0 && (
        <div className="fs-error-summary" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          {errorCount === 1 ? '1 champ à corriger' : `${errorCount} champs à corriger`} avant de soumettre.
        </div>
      )}

      <div className="fs-layout">
        <form onSubmit={handleSubmit} className="submission-form fs-form" noValidate>
          <div className="patient-selection-container" id="patient-selection">
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
                setSelectedPatient(val)
                setPatientError(null)
                setDirty(true)
                setErrors((prev) => {
                  const next = { ...prev }
                  delete next.patient
                  return next
                })
              }}
              onSearch={setPatientSearch}
              loading={patientsLoading}
              required
              error={patientError}
              disabled={isEditing}
            />
          </div>

          {form.sections?.map(section => (
            <SectionRenderer
              key={section.id}
              section={section}
              formData={formData}
              onFieldChange={handleFieldChange}
              errors={errors}
            />
          ))}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Envoi en cours...' : (isEditing ? 'Mettre à jour' : 'Soumettre le formulaire')}
            </button>
            <button type="button" className="btn-secondary" onClick={handleCancel}>
              Annuler
            </button>
          </div>
        </form>

        <aside className="fs-aside" aria-label="Résumé du dossier">
          <section className="fs-panel">
            <h2>Progression</h2>
            <div className="fs-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-label="Champs obligatoires renseignés">
              <div style={{ width: `${progress.percent}%` }} />
            </div>
            <p className="fs-progress-text">{progress.done} / {progress.total} champs obligatoires</p>
          </section>

          <section className="fs-panel">
            <h2><UserRound size={16} aria-hidden="true" /> Patient</h2>
            {patient ? (
              <>
                <p className="fs-patient-name">{`${patient.first_name || ''} ${patient.last_name || ''}`.trim()}</p>
                <dl className="fs-facts">
                  {age !== null && (<><dt>Âge</dt><dd>{age} ans</dd></>)}
                  <dt>Sexe</dt><dd>{patient.gender === 'M' ? 'Homme' : patient.gender === 'F' ? 'Femme' : 'Autre'}</dd>
                  <dt>Naissance</dt><dd>{formatDate(patient.birth_date)}</dd>
                  {patient.anonymized_code && (<><dt>Identifiant</dt><dd>{patient.anonymized_code}</dd></>)}
                </dl>
              </>
            ) : (
              <p className="fs-muted">Sélectionnez un patient pour voir son résumé.</p>
            )}
          </section>

          {selectedPatient && (
            <section className="fs-panel">
              <h2>Dossiers précédents</h2>
              {patientCases.length === 0 ? (
                <p className="fs-muted">Aucun dossier précédent pour ce patient.</p>
              ) : (
                <ul className="fs-cases">
                  {patientCases.slice(0, 4).map((c) => (
                    <li key={c.id}>
                      <a href={`/forms/${c.form}/submissions/${c.id}`} target="_blank" rel="noreferrer">
                        <span>{c.form_name || 'Dossier'}<small>{formatDate(c.created_at)}</small></span>
                        <StatusBadge status={c.status} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
