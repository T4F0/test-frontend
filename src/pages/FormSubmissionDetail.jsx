import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getForm } from '../api/formsApi'
import { getSubmission } from '../api/submissionsApi'

function formatValue(value) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return value == null || value === '' ? '—' : String(value)
}

function SectionDataRenderer({ section, submissionData }) {
  const hasFields = section.fields?.some(f => submissionData[f.id] !== undefined)
  const hasChildData = section.children?.some(child => hasDataInChildren(child, submissionData))

  if (!hasFields && !hasChildData) return null

  return (
    <div key={section.id} className={`submission-section ${section.parent ? 'nested' : ''}`}>
      <h3 className="submission-section-title">{section.name}</h3>
      
      {section.fields?.map(field => {
        const value = submissionData[field.id]
        if (value === undefined) return null
        return (
          <div key={field.id} className="submission-detail-field">
            <span className="submission-detail-field-label">{field.name}</span>
            <span className="submission-detail-field-value">{formatValue(value)}</span>
          </div>
        )
      })}

      {section.children?.map(child => (
        <SectionDataRenderer 
          key={child.id} 
          section={child} 
          submissionData={submissionData} 
        />
      ))}
    </div>
  )
}

function hasDataInChildren(section, submissionData) {
  if (section.fields?.some(f => submissionData[f.id] !== undefined)) return true
  return section.children?.some(child => hasDataInChildren(child, submissionData)) || false
}

export default function FormSubmissionDetail() {
  const { formId, submissionId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [formId, submissionId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [formData, subData] = await Promise.all([
        getForm(formId),
        getSubmission(submissionId),
      ])
      setForm(formData)
      setSubmission(subData)
      setError(null)
    } catch (err) {
      setError('Failed to load submission: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading">Loading submission...</div>
  if (error) return <div className="error">{error}</div>
  if (!form || !submission) return <div className="error">Submission not found</div>

  const submissionData = submission.data || {}

  return (
    <div className="submission-detail-fullscreen">
      <div className="submission-detail-inner">
        <header className="submission-detail-header">
          <h1 className="submission-detail-title">{form.name}</h1>
          <p className="submission-detail-subtitle">Form submission details</p>
          <button
            className="btn-secondary submission-detail-back"
            onClick={() => navigate(`/forms/${formId}/submissions`)}
          >
            ← Back to Submissions
          </button>
        </header>

        <section className="submission-detail-meta">
          <div className="submission-detail-meta-item">
            <span className="submission-detail-meta-label">Submitted</span>
            <span className="submission-detail-meta-value">
              {new Date(submission.created_at).toLocaleString()}
            </span>
          </div>
          <div className="submission-detail-meta-item">
            <span className="submission-detail-meta-label">Patient</span>
            <span className="submission-detail-meta-value">
              {submission.patient_name ?? '—'}
            </span>
          </div>
        </section>

        <section className="submission-detail-data">
          <h2 className="submission-detail-data-title">Submitted Values</h2>
          {Object.keys(submissionData).length === 0 ? (
            <p className="submission-detail-empty">No values were submitted.</p>
          ) : (
            <div className="submission-detail-sections">
              {form.sections?.sort((a,b) => a.order - b.order).map(section => (
                <SectionDataRenderer 
                  key={section.id} 
                  section={section} 
                  submissionData={submissionData} 
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
