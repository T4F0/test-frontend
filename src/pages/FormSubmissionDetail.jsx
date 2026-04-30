import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getForm } from '../api/formsApi'
import { getSubmission } from '../api/submissionsApi'
import { getAttachments, downloadAttachment } from '../api/attachmentsApi'
import { Download, FileText, ExternalLink, Video, Image } from 'lucide-react'

function formatValue(value) {
  if (value === true) return 'Oui'
  if (value === false) return 'Non'
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
        
        const isFile = field.field_type === 'file'

        return (
          <div key={field.id} className="submission-detail-field">
            <span className="submission-detail-field-label">{field.name}</span>
            <span className={`submission-detail-field-value ${isFile ? 'is-file' : ''}`}>
              {isFile ? (
                <span className="file-field-preview">
                  <FileText size={14} style={{ marginRight: '6px' }} />
                  {formatValue(value)}
                </span>
              ) : (
                formatValue(value)
              )}
            </span>
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
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [formId, submissionId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [formData, subData, attachData] = await Promise.all([
        getForm(formId),
        getSubmission(submissionId),
        getAttachments({ submission: submissionId })
      ])
      setForm(formData)
      setSubmission(subData)
      setAttachments(attachData || [])
      setError(null)
    } catch (err) {
      setError('Failed to load submission: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading">Chargement...</div>
  if (error) return <div className="error">{error}</div>
  if (!form || !submission) return <div className="error">Soumission introuvable</div>

  const submissionData = submission.data || {}

  return (
    <div className="submission-detail-fullscreen">
      <div className="submission-detail-inner">
        <header className="submission-detail-header">
          <h1 className="submission-detail-title">{submission.name || form.name}</h1>
          <p className="submission-detail-subtitle">{form.name} — Dossier RCP</p>
          <button
            className="btn-secondary submission-detail-back"
            onClick={() => navigate(-1)}
          >
            ← Retour
          </button>
        </header>

        <section className="submission-detail-meta">
          <div className="submission-detail-meta-item">
            <span className="submission-detail-meta-label">Soumis le</span>
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
          <div className="submission-detail-meta-item">
            <span className="submission-detail-meta-label">Statut</span>
            <span className={`badge`}>{submission.status}</span>
          </div>
        </section>

        <section className="submission-detail-data">
          <h2 className="submission-detail-data-title">Valeurs extraites</h2>
          {Object.keys(submissionData).length === 0 ? (
            <div className="submission-detail-empty">Aucune donnée trouvée dans cette soumission.</div>
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

        {attachments.length > 0 && (
          <section className="submission-detail-attachments" style={{ marginTop: '3rem', borderTop: '1px solid #e2e8f0', paddingTop: '2rem' }}>
            <h2 className="submission-detail-data-title" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Download size={24} />
              Pièces jointes ({attachments.length})
            </h2>
            <div className="submission-attachments-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {attachments.map(file => (
                <div key={file.id} className="attachment-card" style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                    <div className={`file-type-icon ${file.file_type.toLowerCase()}`} style={{ width: '40px', height: '40px', borderRadius: '6px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                      {file.file_type.startsWith('image/') ? <Image size={20} /> : 
                       file.file_type.startsWith('video/') ? <Video size={20} /> : 
                       <FileText size={20} />}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.file_name}>
                        {file.file_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{file.file_type} · Par {file.uploaded_by_name}</div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.preventDefault()
                      downloadAttachment(file.file, file.file_name)
                    }}
                    className="btn-icon"
                    style={{ color: '#2563eb', padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
                    title="Ouvrir le fichier"
                  >
                    <ExternalLink size={18} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
