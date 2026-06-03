import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSubmissionsByPatient } from '../api/submissionsApi'
import { getPatients } from '../api/patientsApi'
import { createMeetingRequest } from '../api/meetingsApi'
import { useAuth } from '../context/AuthContext'
import SearchableSelect from '../components/SearchableSelect'
import { formatDate } from '../lib/dateUtils'
import { Send, CheckCircle } from 'lucide-react'

export default function MeetingRequestForm() {
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    if (user && user.role !== 'MEDECIN') {
      navigate('/meetings')
    }
  }, [user, navigate])

  const [submissions, setSubmissions] = useState([])
  const [selectedSubmissions, setSelectedSubmissions] = useState([])
  const [patients, setPatients] = useState([])
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [patientsLoading, setPatientsLoading] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const submissionsById = useMemo(() => new Map(submissions.map(s => [String(s.id), s])), [submissions])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPatients(patientSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [patientSearch])

  useEffect(() => {
    if (selectedPatientId) {
      loadSubmissionsForPatient(selectedPatientId)
    }
  }, [selectedPatientId])

  const loadPatients = async (query = '') => {
    try {
      setPatientsLoading(true)
      const data = await getPatients(1, query)
      const patientsData = Array.isArray(data) ? data : []
      setPatients([...patientsData].sort((a, b) =>
        `${a.first_name || ''} ${a.last_name || ''}`.localeCompare(`${b.first_name || ''} ${b.last_name || ''}`)
      ))
    } catch (e) {
      console.error(e)
    } finally {
      setPatientsLoading(false)
    }
  }

  const loadSubmissionsForPatient = async (patientId) => {
    try {
      const data = await getSubmissionsByPatient(patientId)
      const newSubs = Array.isArray(data) ? data : []
      setSubmissions(prev => {
        const existingIds = new Set(prev.map(s => String(s.id)))
        return [...prev, ...newSubs.filter(s => !existingIds.has(String(s.id)))]
      })
    } catch (e) {
      console.error(e)
    }
  }

  const filteredSubmissions = useMemo(() => {
    if (!selectedPatientId) return []
    return submissions.filter(s => String(s.patient) === String(selectedPatientId))
  }, [submissions, selectedPatientId])

  const handlePatientChange = (patientId) => {
    setSelectedPatientId(patientId)
    setSelectedSubmissionId('')
  }

  const handleAddSubmission = () => {
    if (!selectedSubmissionId) return
    if (selectedSubmissions.includes(selectedSubmissionId)) {
      alert('Ce dossier est déjà ajouté à la demande.')
      return
    }
    setSelectedSubmissions(prev => [...prev, selectedSubmissionId])
    setSelectedSubmissionId('')
  }

  const handleRemoveSubmission = (sId) => {
    setSelectedSubmissions(prev => prev.filter(id => id !== sId))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedSubmissions.length === 0) {
      setError('Veuillez ajouter au moins un dossier médical.')
      return
    }
    try {
      setSaving(true)
      setError(null)
      await createMeetingRequest({
        submissions: selectedSubmissions,
        note: note || '',
      })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Échec de l\'envoi de la demande.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="form-details" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%', background: '#f0fdf4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem'
        }}>
          <CheckCircle size={40} color="#16a34a" />
        </div>
        <h2 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>Demande envoyée avec succès !</h2>
        <p style={{ color: '#64748b', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
          Votre demande de réunion RCP a été transmise au coordinateur.
          Vous serez notifié lorsque la réunion sera planifiée.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn-primary" onClick={() => { setSuccess(false); setSelectedSubmissions([]); setNote(''); }}>
            Nouvelle demande
          </button>
          <button className="btn-secondary" onClick={() => navigate('/meetings')} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
            Retour aux réunions
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="form-details">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Send size={24} />
        Demander une réunion RCP
      </h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>
        Sélectionnez les dossiers médicaux que vous souhaitez présenter lors d'une réunion RCP.
        Le coordinateur sera notifié de votre demande.
      </p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit} className="submission-form">

        <div className="form-section-card" style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: '600', color: '#0f172a' }}>Sélection des dossiers médicaux</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
            <SearchableSelect
              label="Rechercher un patient"
              placeholder="Tapez pour rechercher..."
              options={patients.map(p => ({
                value: p.id,
                label: `${p.first_name} ${p.last_name}`,
                subLabel: `DDN : ${formatDate(p.birth_date)}`
              }))}
              value={selectedPatientId}
              onChange={handlePatientChange}
              onSearch={setPatientSearch}
              loading={patientsLoading}
            />
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Sélectionner le dossier</label>
              <select
                value={selectedSubmissionId}
                onChange={(e) => setSelectedSubmissionId(e.target.value)}
                disabled={!selectedPatientId}
                style={{ height: '42px' }}
              >
                <option value="">{selectedPatientId ? 'Choisir une soumission...' : 'Rechercher le patient d\'abord'}</option>
                {filteredSubmissions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.form_name} ({formatDate(s.created_at)})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleAddSubmission}
              className="btn-primary"
              disabled={!selectedSubmissionId}
              style={{ height: '42px', padding: '0 1.5rem' }}
            >
              Ajouter
            </button>
          </div>

          <div className="selected-cases-list">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Dossiers sélectionnés ({selectedSubmissions.length})</label>
            {selectedSubmissions.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {selectedSubmissions.map(sId => {
                  const s = submissionsById.get(String(sId))
                  return (
                    <div key={sId} className="case-selection-chip" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1px solid #e2e8f0', padding: '0.5rem 0.75rem', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <div>
                        {s ? (
                          <>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{s.patient_name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.name || s.form_name}</div>
                          </>
                        ) : (
                          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Dossier ID: {String(sId).substring(0,8)}...</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubmission(sId)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.25rem' }}
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ padding: '1rem', textAlign: 'center', background: 'white', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#94a3b8', fontSize: '0.9rem' }}>
                Aucun dossier ajouté pour le moment.
              </div>
            )}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label>Note / Message au coordinateur (optionnel)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Précisez les raisons de votre demande ou toute information utile..."
            rows={4}
            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div className="form-actions">
          <button type="submit" disabled={saving || selectedSubmissions.length === 0}>
            {saving ? 'Envoi en cours…' : 'Envoyer la demande'}
          </button>
          <button type="button" onClick={() => navigate('/meetings')}>Annuler</button>
        </div>
      </form>
    </div>
  )
}
