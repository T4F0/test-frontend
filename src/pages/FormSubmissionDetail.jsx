import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getForm } from '../api/formsApi'
import { getSubmission } from '../api/submissionsApi'

function collectFieldLabels(form) {
  const labels = {}
  function walk(sections) {
    if (!sections) return
    for (const section of sections) {
      section.fields?.forEach(f => { labels[f.id] = f.name })
      walk(section.children)
    }
  }
  walk(form?.sections || [])
  return labels
}

function formatValue(value) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return value == null ? '—' : String(value)
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

  const fieldLabels = collectFieldLabels(form)
  const data = submission.data || {}

  return (
    <div className="submission-detail-fullscreen">
      <div className="submission-detail-inner">
        <header className="submission-detail-header">
          <h1 className="submission-detail-title">{form.name}</h1>
          <p className="submission-detail-subtitle">Form submission</p>
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
          <h2 className="submission-detail-data-title">Submitted values</h2>
          {Object.keys(data).length === 0 ? (
            <p className="submission-detail-empty">No submitted values.</p>
          ) : (
            <div className="submission-detail-fields">
              {Object.entries(data).map(([fieldId, value]) => {
                const label = fieldLabels[fieldId] ?? `Field ${fieldId}`
                return (
                  <div key={fieldId} className="submission-detail-field">
                    <span className="submission-detail-field-label">{label}</span>
                    <span className="submission-detail-field-value">{formatValue(value)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
