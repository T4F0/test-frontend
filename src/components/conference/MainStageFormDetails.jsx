import React from 'react'
import { X, FileText, Download, ExternalLink, Image as ImageIcon, Video as VideoIcon } from 'lucide-react'

function formatFieldValue(value) {
  if (value === true) return 'Oui'
  if (value === false) return 'Non'
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—'
  return value == null || value === '' ? '—' : String(value)
}

function hasDataInChildren(section, submissionData) {
  if (section.fields?.some(f => submissionData[f.id] !== undefined)) return true
  return section.children?.some(child => hasDataInChildren(child, submissionData)) || false
}

function SectionDataRenderer({ section, submissionData }) {
  const hasFields = section.fields?.some(f => submissionData[f.id] !== undefined)
  const hasChildData = section.children?.some(child => hasDataInChildren(child, submissionData))
  if (!hasFields && !hasChildData) return null

  return (
    <div key={section.id} className={`submission-section ${section.parent ? 'nested' : ''}`}>
      <h3 className="submission-section-title">{section.name}</h3>
      {section.fields
        ?.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(field => {
          const value = submissionData[field.id]
          if (value === undefined) return null
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
          <p className="form-subtitle">Patient: {submission.patient_name ?? '—'}</p>
        </div>
        <button className="btn-close-viewer" onClick={onClose} title="Fermer les détails">
          <X size={24} />
        </button>
      </div>

      <div className="main-stage-form-body">
        {/* Meta stats */}
        <div className="submission-detail-meta" style={{ marginBottom: '1.5rem' }}>
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

        {/* Form fields & sections */}
        <div className="submission-detail-data">
          <h2 className="submission-detail-data-title">Valeurs extraites</h2>
          {Object.keys(submission.data || {}).length === 0 ? (
            <div className="submission-detail-empty">Aucune donnée trouvée dans cette soumission.</div>
          ) : (
            <div className="submission-detail-sections">
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

        {/* Attachments */}
        {attachments && attachments.length > 0 && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(99, 102, 241, 0.2)', paddingTop: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem', color: '#a5b4fc', fontWeight: 600 }}>Pièces jointes</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
              {attachments.map(file => (
                <div key={file.id} className="attachment-card" style={{ padding: '0.75rem 1rem', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(30, 41, 59, 0.6)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99, 102, 241, 0.15)', flexShrink: 0 }}>
                      {file.file_type?.startsWith('image/') ? <ImageIcon size={16} /> :
                       file.file_type?.startsWith('video/') ? <VideoIcon size={16} /> :
                       <FileText size={16} />}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.file_name}>
                        {file.file_name}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      onClick={(e) => { e.preventDefault(); downloadAttachment(file.file, null) }}
                      style={{ color: '#a5b4fc', padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
                      title="Ouvrir"
                    >
                      <ExternalLink size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); downloadAttachment(file.file, file.file_name) }}
                      style={{ color: '#a5b4fc', padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
                      title="Télécharger"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
