import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMeeting, createMeeting, updateMeeting } from '../api/meetingsApi'
import { getSubmissionsByPatient, getSubmissions } from '../api/submissionsApi'
import { getPatients } from '../api/patientsApi'
import { getUsers } from '../api/authApi'
import { useAuth } from '../context/AuthContext'
import SearchableSelect from '../components/SearchableSelect'

export default function MeetingForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEdit = !!id

  useEffect(() => {
    // Restrict access for Medecins - they cannot create or edit meetings
    if (user && user.role === 'MEDECIN') {
      navigate('/meetings')
    }
  }, [user, navigate])

  const [form, setForm] = useState({
    name: '',
    submissions: [],
    coordinator: '',
    scheduled_date: '',
    scheduled_time: '09:00',
    meeting_link: '',
    participants: [],
  })
  const [allSubmissions, setAllSubmissions] = useState([])
  const [patients, setPatients] = useState([])
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [participantSearch, setParticipantSearch] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [patientsLoading, setPatientsLoading] = useState(false)

  useEffect(() => {
    if (id) loadMeeting()
  }, [id])

  useEffect(() => {
    loadUsers()
    loadInitialSubmissions()
  }, [])

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

  const formatUserName = (candidate) => {
    if (!candidate) return 'Utilisateur inconnu'
    const fullName = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim()
    return fullName || candidate.username || candidate.email || 'Utilisateur inconnu'
  }

  const formatUserMeta = (candidate) => {
    if (!candidate) return ''
    return [candidate.email, candidate.role, candidate.specialty].filter(Boolean).join(' • ')
  }

  const getInitials = (candidate) => {
    const source = `${candidate?.first_name || ''} ${candidate?.last_name || ''}`.trim()
    if (!source) {
      return (candidate?.username || candidate?.email || '?').slice(0, 2).toUpperCase()
    }
    return source.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
  }

  const normalizedCoordinatorId = isEdit ? form.coordinator : user?.id || ''
  const usersById = useMemo(() => new Map(users.map((u) => [String(u.id), u])), [users])
  const submissionsById = useMemo(() => new Map(allSubmissions.map((s) => [String(s.id), s])), [allSubmissions])

  const selectedParticipantIds = useMemo(() => new Set(form.participants), [form.participants])
  const coordinatorUser = useMemo(() => {
    if (!normalizedCoordinatorId) return user || null
    return usersById.get(normalizedCoordinatorId) || (user?.id === normalizedCoordinatorId ? user : null)
  }, [normalizedCoordinatorId, user, usersById])
  
  const selectedParticipants = useMemo(
    () => form.participants.map((pId) => usersById.get(String(pId))).filter(Boolean),
    [form.participants, usersById],
  )

  const selectedSubmissions = useMemo(
    () => form.submissions.map((sId) => submissionsById.get(String(sId))).filter(Boolean),
    [form.submissions, submissionsById],
  )

  const loadUsers = async () => {
    try {
      const usersData = await getUsers()
      setUsers(Array.isArray(usersData) ? usersData : [])
    } catch (e) {
      console.error(e)
      if (e.response?.status === 403) {
        setError('Accès refusé : Seuls les administrateurs et les coordinateurs peuvent créer ou modifier des réunions.')
      } else {
        setError('Échec du chargement des utilisateurs')
      }
    }
  }

  const loadInitialSubmissions = async () => {
    try {
      const data = await getSubmissions()
      const newSubs = Array.isArray(data) ? data : []
      setAllSubmissions(prev => {
        const existingIds = new Set(prev.map(s => String(s.id)))
        return [...prev, ...newSubs.filter(s => !existingIds.has(String(s.id)))]
      })
    } catch (e) {
      console.error(e)
    }
  }

  const loadSubmissionsForPatient = async (patientId) => {
    try {
      const data = await getSubmissionsByPatient(patientId)
      const newSubs = Array.isArray(data) ? data : []
      setAllSubmissions(prev => {
        const existingIds = new Set(prev.map(s => String(s.id)))
        const combined = [...prev, ...newSubs.filter(s => !existingIds.has(String(s.id)))]
        return combined
      })
    } catch (e) {
      console.error(e)
    }
  }

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

  const filteredUsers = useMemo(() => {
    const q = participantSearch.toLowerCase()
    return users.filter(u => 
      u.id !== user?.id && 
      (formatUserName(u).toLowerCase().includes(q) || 
       u.email?.toLowerCase().includes(q) || 
       u.role?.toLowerCase().includes(q) || 
       u.specialty?.toLowerCase().includes(q))
    )
  }, [users, participantSearch, user])

  const loadMeeting = async () => {
    try {
      const data = await getMeeting(id)
      const dt = data.scheduled_date ? new Date(data.scheduled_date) : new Date()
      
      if (data.submission_details) {
        setAllSubmissions(prev => {
          const existingIds = new Set(prev.map(s => String(s.id)))
          const newOnes = data.submission_details.filter(s => !existingIds.has(String(s.id)))
          return [...prev, ...newOnes]
        })
      }

      setForm({
        name: data.name || '',
        submissions: (data.submissions || []).map(id => String(id)),
        coordinator: data.coordinator?.id || data.coordinator || '',
        scheduled_date: dt.toISOString().slice(0, 10),
        scheduled_time: dt.toTimeString().slice(0, 5),
        meeting_link: data.meeting_link || '',
        participants: (data.participants || []).map((p) => String(p?.id || p)),
      })
      setError(null)
    } catch (err) {
      setError('Échec du chargement de la réunion')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredSubmissions = useMemo(() => {
    if (!selectedPatientId) return []
    return allSubmissions.filter((s) => String(s.patient) === String(selectedPatientId))
  }, [allSubmissions, selectedPatientId])

  const handlePatientChange = (patientId) => {
    setSelectedPatientId(patientId)
    setSelectedSubmissionId('')
  }

  const handleAddSubmission = () => {
    if (!selectedSubmissionId) return
    if (form.submissions.includes(selectedSubmissionId)) {
      alert('Cette soumission est déjà ajoutée à la réunion.')
      return
    }
    setForm(f => ({ ...f, submissions: [...f.submissions, selectedSubmissionId] }))
    setSelectedSubmissionId('')
  }

  const handleRemoveSubmission = (sId) => {
    setForm(f => ({ ...f, submissions: f.submissions.filter(id => id !== sId) }))
  }

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const handleParticipantToggle = (userId) => {
    const idStr = String(userId)
    setForm((f) => ({
      ...f,
      participants: f.participants.includes(idStr)
        ? f.participants.filter((p) => p !== idStr)
        : [...f.participants, idStr],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.submissions.length === 0) {
      setError('Veuillez ajouter au moins un dossier (soumission) à la réunion.')
      return
    }
    try {
      setSaving(true)
      setError(null)
      const scheduled_date = `${form.scheduled_date}T${form.scheduled_time}:00`
      const payload = {
        name: form.name,
        submissions: form.submissions,
        scheduled_date,
        participants: form.participants,
      }
      if (isEdit) {
        await updateMeeting(id, payload)
        navigate(`/meetings/${id}`)
      } else {
        const created = await createMeeting(payload)
        navigate(`/meetings/${created.id}`)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Échec de l\'enregistrement de la réunion')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading">Chargement de la réunion...</div>

  return (
    <div className="form-details">
      <h2>{isEdit ? 'Modifier la réunion' : 'Nouvelle réunion'}</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit} className="submission-form">
        
        <div className="form-group">
          <label>Titre de la réunion (Optionnel)</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Ex: Réunion pluridisciplinaire d'oncologie..."
          />
        </div>

        <div className="form-section-card" style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: '600', color: '#0f172a' }}>Sélection des dossiers (soumissions) à discuter</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
            <SearchableSelect 
              label="Rechercher un patient"
              placeholder="Tapez pour rechercher..."
              options={patients.map(p => ({
                value: p.id,
                label: `${p.first_name} ${p.last_name}`,
                subLabel: `DDN : ${new Date(p.birth_date).toLocaleDateString()}`
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
                {filteredSubmissions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.form_name} ({new Date(s.created_at).toLocaleDateString()})
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
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Dossiers sélectionnés ({form.submissions.length})</label>
            {form.submissions.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {form.submissions.map(sId => {
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
                          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Dossier ID: {String(sId).substring(0,8)}... (Chargement)</div>
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

        <div className="form-section-card" style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#0f172a' }}>Participants</h3>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {selectedParticipants.length} sélectionnés • {filteredUsers.length} affichés
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <input 
              type="text" 
              placeholder="Rechercher par nom, email, rôle, spécialité..." 
              value={participantSearch}
              onChange={(e) => setParticipantSearch(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '60px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem' }}>Participants sélectionnés</div>
            {selectedParticipants.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {selectedParticipants.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem' }}>
                    <span>{formatUserName(p)}</span>
                    <button type="button" onClick={() => handleParticipantToggle(p.id)} style={{ border: 'none', background: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Aucun participant sélectionné pour le moment.</div>
            )}
          </div>

          <div className="participants-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
            {filteredUsers.map(u => (
              <div 
                key={u.id} 
                className="participant-row"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '1rem', 
                  background: 'white', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: '#f1f5f9', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  color: '#3b82f6',
                  marginRight: '1rem',
                  fontSize: '0.85rem',
                  flexShrink: 0
                }}>
                  {getInitials(u)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{formatUserName(u)}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{formatUserMeta(u)}</div>
                </div>
                <button 
                  type="button" 
                  className={selectedParticipantIds.has(String(u.id)) ? 'btn-danger-outline' : 'btn-primary-outline'}
                  onClick={() => handleParticipantToggle(u.id)}
                  style={{ 
                    padding: '0.4rem 1rem', 
                    borderRadius: '6px', 
                    fontSize: '0.85rem',
                    border: '1px solid',
                    borderColor: selectedParticipantIds.has(String(u.id)) ? '#ef4444' : '#2563eb',
                    color: selectedParticipantIds.has(String(u.id)) ? '#ef4444' : '#2563eb',
                    background: 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  {selectedParticipantIds.has(String(u.id)) ? 'Retirer' : 'Ajouter'}
                </button>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Aucun utilisateur trouvé.</div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Date *</label>
          <input type="date" value={form.scheduled_date} onChange={(e) => handleChange('scheduled_date', e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Heure</label>
          <input type="time" value={form.scheduled_time} onChange={(e) => handleChange('scheduled_time', e.target.value)} />
        </div>

        <div className="form-actions">
          <button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          <button type="button" onClick={() => navigate(-1)}>Annuler</button>
        </div>
      </form>
    </div>
  )
}
