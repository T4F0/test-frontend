import { useState, useEffect } from 'react'
import { FileText, User, Calendar, Activity, ChevronDown, ChevronUp, AlertCircle, ClipboardList } from 'lucide-react'
import { getCaseResume } from '../../api/meetingsApi'

const GENDER_LABELS = { M: 'Homme', F: 'Femme', O: 'Autre' }

export default function CaseResumeSidebar({ isOpen, onToggle, meetingId, activeCaseId }) {
  const [caseResume, setCaseResume] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedForms, setExpandedForms] = useState({})

  useEffect(() => {
    if (isOpen && meetingId) {
      loadCaseResume()
    }
  }, [isOpen, meetingId, activeCaseId])

  const loadCaseResume = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getCaseResume(meetingId, activeCaseId)
      setCaseResume(data)
      const expanded = {}
      data.forms?.forEach((_, idx) => { expanded[idx] = true })
      setExpandedForms(expanded)
    } catch (err) {
      console.error('Failed to load case resume:', err)
      setError('Aucune donnée de formulaire disponible pour ce dossier.')
    } finally {
      setLoading(false)
    }
  }

  const toggleForm = (idx) => {
    setExpandedForms(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const formatValue = (value, fieldType) => {
    if (value === null || value === undefined || value === '') return '—'
    if (fieldType === 'checkbox') return value ? '✓ Oui' : '✗ Non'
    if (fieldType === 'date') {
      try { return new Date(value).toLocaleDateString('fr-FR') } catch { return value }
    }
    if (Array.isArray(value)) return value.join(', ')
    return String(value)
  }

  const groupFieldsBySection = (fields) => {
    const groups = {}
    fields.forEach(field => {
      const sectionKey = field.parent_section_name
        ? `${field.parent_section_name} › ${field.section_name}`
        : field.section_name
      if (!groups[sectionKey]) groups[sectionKey] = []
      groups[sectionKey].push(field)
    })
    return groups
  }

  if (!isOpen) return null

  return (
    <div className="sidebar case-resume-sidebar">
      <div className="sidebar-header">
        <h3>
          <ClipboardList size={18} />
          Résumé du dossier
        </h3>
        <button className="sidebar-close" onClick={onToggle}>×</button>
      </div>
      <div className="sidebar-content case-resume-sidebar-content">
        {loading && (
          <div className="cr-sidebar-loading">
            <div className="cr-sidebar-spinner" />
            <span>Chargement des données du dossier...</span>
          </div>
        )}

        {error && !caseResume && (
          <div className="cr-sidebar-empty">
            <AlertCircle size={24} />
            <p>{error}</p>
          </div>
        )}

        {caseResume && (
          <>
            {/* Patient Banner */}
            <div className="cr-patient-banner">
              <div className="cr-patient-avatar">
                <User size={18} />
              </div>
              <div className="cr-patient-details">
                <span className="cr-patient-name">
                  {caseResume.patient.first_name} {caseResume.patient.last_name}
                </span>
                <div className="cr-patient-meta-row">
                  <span className="cr-meta-chip">
                    <Calendar size={12} />
                    {new Date(caseResume.patient.birth_date).toLocaleDateString('fr-FR')}
                  </span>
                  <span className="cr-meta-chip">
                    {GENDER_LABELS[caseResume.patient.gender] || caseResume.patient.gender}
                  </span>
                  <span className={`cr-status-chip cr-status-${caseResume.medical_case_status?.toLowerCase()}`}>
                    {caseResume.medical_case_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Forms */}
            {caseResume.forms?.length > 0 ? (
              <div className="cr-forms-list">
                {caseResume.forms.map((form, idx) => {
                  const sectionGroups = groupFieldsBySection(form.fields)
                  const isExpanded = expandedForms[idx]

                  return (
                    <div key={idx} className="cr-form-card">
                      <button
                        type="button"
                        className="cr-form-header"
                        onClick={() => toggleForm(idx)}
                      >
                        <div className="cr-form-header-left">
                          <FileText size={15} className="cr-form-icon" />
                          <div>
                            <div className="cr-form-name">{form.form_name}</div>
                            <div className="cr-form-date">
                              {new Date(form.submitted_at).toLocaleDateString('fr-FR', {
                                day: 'numeric', month: 'short', year: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="cr-form-toggle">
                          <span className="cr-field-count">{form.fields.length}</span>
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="cr-form-body">
                          {Object.entries(sectionGroups).map(([sectionName, fields]) => (
                            <div key={sectionName} className="cr-section-group">
                              <div className="cr-section-label">
                                <Activity size={12} />
                                <span>{sectionName}</span>
                              </div>
                              <div className="cr-fields">
                                {fields.map((field, fIdx) => (
                                  <div key={fIdx} className="cr-field">
                                    <div className="cr-field-label">{field.field_name}</div>
                                    <div className={`cr-field-value ${!field.value && field.value !== false ? 'empty' : ''}`}>
                                      {formatValue(field.value, field.field_type)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="cr-sidebar-empty">
                <FileText size={24} />
                <p>Aucun champ RDV trouvé pour ce patient.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
