import { useEffect, useState, useRef, useCallback } from 'react'
import { ClipboardList, Upload, FileText, Image, Download, Eye, X, Save, Video, ChevronDown, ChevronUp, Gavel, CheckCircle, Loader } from 'lucide-react'
import { downloadAttachment, getAttachmentBlobUrl } from '../../api/attachmentsApi'
import { resolveApiUrl } from '../../api/config'
import { getReportsBySubmission, upsertReport } from '../../api/reportsApi'

export default function MedicalCasesSidebar({
  submissions,
  attachments,
  submissionAttachments,
  onUpload,
  onCancelUpload,
  onPromote,
  isOpen,
  onToggle,
  isUploading,
  activeSubmissionId,
  setActiveSubmissionId,
  onPreviewFile,
  onShowFormDetails,
  activeFormDetailId,
  isCoordinator,
}) {
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  // Per-submission report state: { [submissionId]: { text, saved, saving, error } }
  const [reportState, setReportState] = useState({})

  const normalizeAttachment = (attachment, source) => {
    let fileUrl = attachment.file || ''
    if (fileUrl.includes('/api/media/')) {
      fileUrl = fileUrl.substring(fileUrl.indexOf('/api/media/'))
    } else if (fileUrl.includes('/media/')) {
      fileUrl = fileUrl.substring(fileUrl.indexOf('/media/'))
    }

    return {
      id: `${source}-${attachment.id}`,
      name: attachment.original_filename || attachment.display_name || 'Attachment',
      url: resolveApiUrl(fileUrl),
      fileType: attachment.file_type || '',
      size: attachment.file_size || null,
      uploadedByName: attachment.uploaded_by_name || 'Unknown',
      source,
      originalId: attachment.id,
      submissionId: attachment.submission_id || attachment.submission || attachment.submissionId || null
    }
  }

  const conferenceFiles = (attachments || []).map((attachment) => normalizeAttachment(attachment, 'meeting'))
  const subFiles = (submissionAttachments || []).map((attachment) => normalizeAttachment(attachment, 'submission'))

  // Load existing report when a submission is expanded
  const loadReport = useCallback(async (submissionId) => {
    if (!submissionId) return
    if (reportState[submissionId]) return // already loaded

    setReportState(prev => ({
      ...prev,
      [submissionId]: { text: '', saved: false, saving: false, error: null, loaded: false }
    }))

    try {
      const reports = await getReportsBySubmission(submissionId)
      const report = Array.isArray(reports) && reports.length > 0 ? reports[0] : null
      setReportState(prev => ({
        ...prev,
        [submissionId]: {
          text: report?.content || '',
          reportId: report?.id || null,
          saved: !!report,
          saving: false,
          error: null,
          loaded: true,
        }
      }))
    } catch (e) {
      setReportState(prev => ({
        ...prev,
        [submissionId]: { text: '', saved: false, saving: false, error: 'Échec du chargement', loaded: true }
      }))
    }
  }, [reportState])

  const handleSaveReport = async (submissionId) => {
    const state = reportState[submissionId]
    if (!state) return

    setReportState(prev => ({ ...prev, [submissionId]: { ...prev[submissionId], saving: true, error: null } }))
    try {
      await upsertReport(submissionId, state.text)
      setReportState(prev => ({ ...prev, [submissionId]: { ...prev[submissionId], saving: false, saved: true } }))
    } catch (e) {
      setReportState(prev => ({
        ...prev,
        [submissionId]: { ...prev[submissionId], saving: false, error: 'Échec de la sauvegarde' }
      }))
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file) => {
        onUpload(file)
      })
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => {
        onUpload(file)
      })
    }
    e.target.value = ''
  }

  const getFileIcon = (type) => {
    const t = type?.toUpperCase() || ''
    if (t.startsWith('IMAGE/') || t === 'IMAGE') return <Image size={16} />
    if (t.startsWith('VIDEO/') || t === 'VIDEO') return <Video size={16} />
    return <FileText size={16} />
  }

  const formatFileSize = (bytes) => {
    if (bytes == null) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const isPreviewable = (file) => {
    const t = file.fileType?.toUpperCase() || ''
    return t.startsWith('IMAGE/') || t === 'IMAGE' || 
           t.startsWith('VIDEO/') || t === 'VIDEO' || 
           t === 'PDF' || t === 'APPLICATION/PDF'
  }
    
  const previewType = (file) => {
    const t = file.fileType?.toUpperCase() || ''
    if (t.startsWith('IMAGE/') || t === 'IMAGE') return 'image'
    if (t.startsWith('VIDEO/') || t === 'VIDEO') return 'video'
    return 'pdf'
  }

  useEffect(() => {
    if (isOpen && activeSubmissionId && isCoordinator) {
      loadReport(activeSubmissionId)
    }
  }, [isOpen, activeSubmissionId, isCoordinator, loadReport])

  const handleAccordionClick = (submissionId) => {
    if (activeSubmissionId === submissionId) {
      setActiveSubmissionId(null)
    } else {
      setActiveSubmissionId(submissionId)
      if (isCoordinator) {
        loadReport(submissionId)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="sidebar cases-sidebar">
      <div className="sidebar-header">
        <h3>
          <ClipboardList size={18} />
          Dossiers Médicaux
        </h3>
        <button className="sidebar-close" onClick={onToggle}><X size={18} /></button>
      </div>
      
      <div className="sidebar-content">
        <div className="case-accordion-container">
        {(!submissions || submissions.length === 0) && (
          <p className="no-files">Aucun dossier médical associé à cette réunion.</p>
        )}
        
        {submissions?.map((submission) => {
          const isActive = activeSubmissionId === submission.id
          
          // Filter files for this specific submission
          const caseSubFiles = subFiles.filter(f => f.submissionId === submission.id)
          const caseConfFiles = conferenceFiles.filter(f => f.submissionId === submission.id)
          const rs = reportState[submission.id]

          return (
            <div key={submission.id} className={`case-accordion ${isActive ? 'expanded' : ''}`}>
              <div 
                className="case-accordion-header" 
                onClick={() => handleAccordionClick(submission.id)}
              >
                <div className="case-title">
                  <strong>{submission.patient_name}</strong>
                  <span className="case-subtitle">{submission.name || submission.form_name}</span>
                </div>
                {isActive ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
              
              {isActive && (
                <div className="case-accordion-body">
                  <button
                    className={`btn-small btn-primary form-details-accordion-btn ${activeFormDetailId === submission.id ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onShowFormDetails && onShowFormDetails(submission)
                    }}
                    style={{
                      width: '100%',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      backgroundColor: activeFormDetailId === submission.id ? 'var(--secondary)' : ''
                    }}
                  >
                    <ClipboardList size={14} />
                    {activeFormDetailId === submission.id ? 'Masquer les détails' : 'Détails du formulaire'}
                  </button>

                  {/* ── RCP Decision Panel (coordinators only) ── */}
                  {isCoordinator && (
                    <div className="rcp-decision-panel">
                      <div className="rcp-decision-header">
                        <Gavel size={15} />
                        <span>Décision RCP</span>
                        {rs?.saved && !rs?.saving && (
                          <span className="rcp-decision-saved-badge">
                            <CheckCircle size={12} /> Enregistrée
                          </span>
                        )}
                      </div>

                      {!rs?.loaded ? (
                        <div className="rcp-decision-loading">
                          <Loader size={14} className="rcp-spin" /> Chargement...
                        </div>
                      ) : (
                        <>
                          <textarea
                            className="rcp-decision-textarea"
                            placeholder="Saisissez ici la décision prise lors de la réunion RCP pour ce dossier..."
                            value={rs?.text || ''}
                            onChange={(e) => setReportState(prev => ({
                              ...prev,
                              [submission.id]: { ...prev[submission.id], text: e.target.value, saved: false }
                            }))}
                            rows={5}
                          />
                          {rs?.error && (
                            <div className="rcp-decision-error">{rs.error}</div>
                          )}
                          <button
                            className="btn-small btn-primary rcp-decision-save-btn"
                            onClick={(e) => { e.stopPropagation(); handleSaveReport(submission.id) }}
                            disabled={rs?.saving || !rs?.text?.trim()}
                          >
                            {rs?.saving ? (
                              <><Loader size={13} className="rcp-spin" /> Sauvegarde...</>
                            ) : (
                              <><Save size={13} /> Enregistrer la décision</>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <div className="file-section">
                    <div className="file-section-title">Pièces jointes initiales</div>
                    <div className="file-list">
                      {caseSubFiles.length === 0 && <p className="no-files">Aucune pièce jointe</p>}
                      {caseSubFiles.map((file) => (
                        <div 
                          key={file.id} 
                          className={`file-item ${isPreviewable(file) ? 'clickable' : ''}`}
                          onClick={() => isPreviewable(file) && onPreviewFile(file)}
                        >
                          <div className="file-icon">{getFileIcon(file.fileType)}</div>
                          <div className="file-info">
                            <span className="file-name" title={file.name}>{file.name}</span>
                            <span className="file-meta">{file.uploadedByName}</span>
                          </div>
                          <div className="file-actions-inline">
                            {isPreviewable(file) && (
                              <button className="file-action-btn" onClick={(e) => { e.stopPropagation(); onPreviewFile(file); }} title="Aperçu"><Eye size={16} /></button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); downloadAttachment(file.url, file.name) }} className="file-download file-action-btn" title="Télécharger">
                              <Download size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="file-section">
                    <div className="file-section-title">Fichiers partagés en réunion</div>
                    <div className="file-list">
                      {caseConfFiles.length === 0 && <p className="no-files">Aucun fichier partagé</p>}
                      {caseConfFiles.map((file) => (
                        <div 
                          key={file.id} 
                          className={`file-item ${isPreviewable(file) ? 'clickable' : ''}`}
                          onClick={() => isPreviewable(file) && onPreviewFile(file)}
                        >
                          <div className="file-icon">{getFileIcon(file.fileType)}</div>
                          <div className="file-info">
                            <span className="file-name" title={file.name}>{file.name}</span>
                            <span className="file-meta">{formatFileSize(file.size)}</span>
                          </div>
                          <div className="file-actions-inline">
                            {isPreviewable(file) && (
                              <button className="file-action-btn" onClick={(e) => { e.stopPropagation(); onPreviewFile(file); }} title="Aperçu"><Eye size={16} /></button>
                            )}
                            <button className="file-action-btn" onClick={(e) => { e.stopPropagation(); onPromote(file.originalId); }} title="Ajouter au dossier permanent">
                              <Save size={16} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); downloadAttachment(file.url, file.name) }} className="file-download file-action-btn" title="Télécharger">
                              <Download size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={16} />
                    <p>{isUploading ? 'Téléchargement...' : 'Glisser ou cliquer pour ajouter au dossier'}</p>
                    {isUploading && (
                      <button 
                        className="btn-small btn-secondary" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancelUpload();
                        }}
                        style={{ marginTop: '0.5rem', zIndex: 10 }}
                      >
                        <X size={14} /> Annuler
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png,.webp,.tiff,.bmp,.mp4,.avi,.mov,.webm,.mpeg,.dcm,.dicom,.ima"
                      multiple
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}
