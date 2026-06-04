import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMeetingRequests, getMeetingRequestSubmissionResume } from '../api/meetingsApi'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../lib/dateUtils'
import { Send, FileText, User, Calendar, ArrowRight, Eye, ChevronDown, ChevronUp } from 'lucide-react'

export default function MeetingRequestsList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedRequestId, setExpandedRequestId] = useState(null)
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [resumeLoading, setResumeLoading] = useState(false)

  useEffect(() => {
    if (user && !['ADMIN', 'COORDINATEUR'].includes(user.role)) {
      navigate('/meetings')
    }
  }, [user, navigate])

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const data = await getMeetingRequests({ status: 'PENDING' })
      setRequests(data)
    } catch (err) {
      setError('Erreur lors du chargement des demandes.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (id) => {
    if (expandedRequestId === id) {
      setExpandedRequestId(null)
      setSelectedSubmission(null)
    } else {
      setExpandedRequestId(id)
      setSelectedSubmission(null)
    }
  }

  const handleViewSubmission = async (requestId, submissionId) => {
    try {
      setResumeLoading(true)
      const data = await getMeetingRequestSubmissionResume(requestId, submissionId)
      setSelectedSubmission(data)
    } catch (err) {
      console.error(err)
      alert('Erreur lors du chargement du dossier.')
    } finally {
      setResumeLoading(false)
    }
  }

  if (loading) return <div className="loading">Chargement des demandes...</div>

  return (
    <div className="meetings-list">
      <div className="list-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
            <Send size={28} className="text-primary" />
            Demandes de réunions RCP
          </h2>
          <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
            Consultez et validez les demandes soumises par les médecins de votre service.
          </p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {requests.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '4rem 2rem', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0' }}>
          <Send size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
          <h3 style={{ color: '#475569' }}>Aucune demande en attente</h3>
          <p style={{ color: '#64748b' }}>Toutes les demandes ont été traitées ou aucune n'a été soumise récemment.</p>
        </div>
      ) : (
        <div className="requests-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {requests.map(req => (
            <div key={req.id} className="request-card" style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div 
                className="request-summary" 
                onClick={() => toggleExpand(req.id)}
                style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', alignItems: 'center', cursor: 'pointer', gap: '1rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>Dr. {req.doctor_details?.first_name} {req.doctor_details?.last_name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{req.doctor_details?.email}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
                  <FileText size={18} style={{ color: '#94a3b8' }} />
                  <span style={{ fontWeight: '500' }}>{req.submissions.length} dossier(s) joint(s)</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
                  <Calendar size={18} style={{ color: '#94a3b8' }} />
                  <span>Soumis le {formatDate(req.created_at)}</span>
                </div>

                <div style={{ color: '#94a3b8' }}>
                  {expandedRequestId === req.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </div>
              </div>

              {expandedRequestId === req.id && (
                <div className="request-details" style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#475569', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Note du médecin</h4>
                      <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '80px', color: '#1e293b', fontSize: '0.95rem', lineHeight: '1.5' }}>
                        {req.note || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Aucune note fournie.</span>}
                      </div>

                      <div style={{ marginTop: '2rem' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#475569', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dossiers à examiner</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {req.submission_details?.map(sub => (
                            <button
                              key={sub.id}
                              onClick={() => handleViewSubmission(req.id, sub.id)}
                              style={{ 
                                textAlign: 'left', background: 'white', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', borderRadius: '8px', 
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.2s',
                                boxShadow: selectedSubmission?.submission_id === sub.id ? '0 0 0 2px #3b82f6' : 'none'
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{sub.patient_name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{sub.form_name}</div>
                              </div>
                              <Eye size={16} style={{ color: '#3b82f6' }} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <button 
                        className="btn-primary" 
                        onClick={() => navigate('/meetings/new', { state: { preselectDoctor: req.doctor, preselectSubmissions: req.submissions } })}
                        style={{ marginTop: '2rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}
                      >
                        Planifier la réunion <ArrowRight size={20} />
                      </button>
                    </div>

                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', minHeight: '400px' }}>
                      {resumeLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>Chargement du résumé...</div>
                      ) : selectedSubmission ? (
                        <div className="submission-resume-content">
                          <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, color: '#0f172a' }}>{selectedSubmission.patient.first_name} {selectedSubmission.patient.last_name}</h3>
                            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                              <span><strong>Né(e) le:</strong> {formatDate(selectedSubmission.patient.birth_date)}</span>
                              <span><strong>Sexe:</strong> {selectedSubmission.patient.gender}</span>
                            </div>
                          </div>

                          <div className="resume-sections" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {selectedSubmission.forms?.map((form, fIdx) => (
                              <div key={fIdx}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                  <FileText size={18} className="text-primary" />
                                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>{form.form_name}</h4>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                  {form.fields.map((field, sIdx) => (
                                    <div key={sIdx} style={{ paddingLeft: '1.5rem', borderLeft: '2px solid #e2e8f0' }}>
                                      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{field.field_name}</div>
                                      <div style={{ color: '#0f172a', fontSize: '0.95rem' }}>
                                        {field.value || <span style={{ color: '#cbd5e1' }}>Non renseigné</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', textAlign: 'center' }}>
                          <Eye size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                          <p>Sélectionnez un dossier à gauche pour visualiser son contenu.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
