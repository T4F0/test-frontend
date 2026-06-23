import React from 'react'
import { X, FileText } from 'lucide-react'

function formatFieldValue(value) {
  if (value === true) return 'Oui'
  if (value === false) return 'Non'
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—'
  return value == null || value === '' ? '—' : String(value)
}

function shouldShowField(field, submissionData) {
  const value = submissionData[field.id]
  const hasValue = value !== undefined && value !== '' && value !== '—'
  return hasValue || field.required || field.show_rdv
}

function hasDataInChildren(section, submissionData) {
  if (section.fields?.some(f => shouldShowField(f, submissionData))) return true
  return section.children?.some(child => hasDataInChildren(child, submissionData)) || false
}

function SectionDataRenderer({ section, submissionData }) {
  const hasFields = section.fields?.some(f => shouldShowField(f, submissionData))
  const hasChildData = section.children?.some(child => hasDataInChildren(child, submissionData))
  if (!hasFields && !hasChildData) return null

  return (
    <div key={section.id} className={`submission-section ${section.parent ? 'nested' : ''}`}>
      <h3 className="submission-section-title">{section.name}</h3>
      {section.fields
        ?.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(field => {
          if (!shouldShowField(field, submissionData)) return null
          const value = submissionData[field.id]
          const isFile = field.field_type === 'file'
          return (
            <div key={field.id} className="submission-detail-field">
              <span className="submission-detail-field-label">{field.name}</span>
              <span className={`submission-detail-field-value ${isFile ? 'is-file' : ''}`}>
                {isFile ? (
                  <span className="file-field-preview">
                    <FileText size={14} style={{ marginRight: '6px' }} />
                    {formatFieldValue(value)}
                  </span>
                ) : (
                  formatFieldValue(value)
                )}
              </span>
            </div>
          )
        })}
      {section.children
        ?.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(child => (
          <SectionDataRenderer key={child.id} section={child} submissionData={submissionData} />
        ))}
    </div>
  )
}

export default function MainStageFormDetails({ form, submission, attachments, onClose, downloadAttachment }) {
  if (!form || !submission) return null

  return (
    <div className="main-stage-form-details">
      <div className="main-stage-form-header">
        <div>
          <h3 className="form-title">{form.name}</h3>
          <p className="form-subtitle">
            Patient: {submission.patient_name ?? '—'}
            {submission.patient_age != null && ` (${submission.patient_age} ans)`}
          </p>
        </div>
        <button className="btn-close-viewer" onClick={onClose} title="Fermer les détails">
          <X size={24} />
        </button>
      </div>

      <div className="main-stage-form-body">
        {/* Meta stats */}
        <div className="submission-detail-meta" style={{ marginBottom: '0.5rem' }}>
          <div className="submission-detail-meta-item">
            <span className="submission-detail-meta-label">Soumis le</span>
            <span className="submission-detail-meta-value">
              {new Date(submission.created_at).toLocaleString()}
            </span>
          </div>
          <div className="submission-detail-meta-item">
            <span className="submission-detail-meta-label">Statut</span>
            <span className="badge">{submission.status}</span>
          </div>
        </div>

        {/* Form fields & sections — multi-column grid layout */}
        <div className="submission-detail-data">
          <h2 className="submission-detail-data-title">Valeurs extraites</h2>
          {Object.keys(submission.data || {}).length === 0 ? (
            <div className="submission-detail-empty">Aucune donnée trouvée dans cette soumission.</div>
          ) : (
            <div className="submission-detail-sections-grid">
              {form.sections
                ?.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map(section => (
                  <SectionDataRenderer
                    key={section.id}
                    section={section}
                    submissionData={submission.data || {}}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Attachments are shown in the persistent AttachmentsStrip above the controls bar */}
      </div>
    </div>
  )
}
