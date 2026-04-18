import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMeeting, createMeeting, updateMeeting } from '../api/meetingsApi'
import { getMedicalCases } from '../api/medicalCasesApi'
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
    medical_cases: [],
    coordinator: '',
    scheduled_date: '',
    scheduled_time: '09:00',
    meeting_link: '',
    specialty: '',
    participants: [],
  })
  const [cases, setCases] = useState([])
  const [patients, setPatients] = useState([])
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [selectedCaseId, setSelectedCaseId] = useState('')
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
    loadUsersAndCases()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPatients(patientSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [patientSearch])

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

    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('')
  }

  const normalizedCoordinatorId = isEdit ? form.coordinator : user?.id || ''
  const usersById = useMemo(
    () => new Map(users.map((candidate) => [candidate.id, candidate])),
    [users],
  )
  const casesById = useMemo(
    () => new Map(cases.map((c) => [c.id, c])),
    [cases],
  )

  const selectedParticipantIds = useMemo(() => new Set(form.participants), [form.participants])
  const coordinatorUser = useMemo(() => {
    if (!normalizedCoordinatorId) return user || null
    return usersById.get(normalizedCoordinatorId) || (user?.id === normalizedCoordinatorId ? user : null)
  }, [normalizedCoordinatorId, user, usersById])
  
  const selectedParticipants = useMemo(
    () => form.participants.map((participantId) => usersById.get(participantId)).filter(Boolean),
    [form.participants, usersById],
  )

  const selectedCases = useMemo(
    () => form.medical_cases.map((caseId) => {
      const c = casesById.get(caseId);
      if (!c) return null;
      // Find patient name for the case
      const patient = patients.find(p => p.id === c.patient) || { first_name: 'Patient', last_name: 'Inconnu' };
      return { ...c, patientName: `${patient.first_name} ${patient.last_name}` };
    }).filter(Boolean),
    [form.medical_cases, casesById, patients],
  )

  const filteredUsers = useMemo(() => {
    const query = participantSearch.trim().toLowerCase()

    return [...users]
      .filter((candidate) => {
        if (!query) return true

        return [
          formatUserName(candidate),
          candidate.email,
          candidate.username,
          candidate.role,
          candidate.specialty,
          candidate.hospital,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query))
      })
      .sort((left, right) => {
        const leftSelected = selectedParticipantIds.has(left.id)
        const rightSelected = selectedParticipantIds.has(right.id)

        if (leftSelected !== rightSelected) {
          return leftSelected ? -1 : 1
        }

        return formatUserName(left).localeCompare(formatUserName(right))
      })
  }, [participantSearch, selectedParticipantIds, users])

  const loadUsersAndCases = async () => {
    try {
      const [casesData, usersData] = await Promise.all([
        getMedicalCases(),
        getUsers(),
      ])
      setCases(Array.isArray(casesData) ? casesData : [])
      setUsers(Array.isArray(usersData) ? usersData : [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadPatients = async (query = '') => {
    try {
      setPatientsLoading(true)
      const data = await getPatients(1, query)
      const patientsData = Array.isArray(data) ? data : []
      const sortedPatients = [...patientsData].sort((a, b) => 
            `${a.first_name || ''} ${a.last_name || ''}`.localeCompare(`${b.first_name || ''} ${b.last_name || ''}`)
          )
      setPatients(sortedPatients)
    } catch (e) {
      console.error(e)
    } finally {
      setPatientsLoading(false)
    }
  }

  const loadMeeting = async () => {
    try {
      setLoading(true)
      const data = await getMeeting(id)
      const dt = data.scheduled_date ? new Date(data.scheduled_date) : new Date()
      setForm({
        medical_cases: data.medical_cases || [],
        coordinator: data.coordinator?.id || data.coordinator || '',
        scheduled_date: dt.toISOString().slice(0, 10),
        scheduled_time: dt.toTimeString().slice(0, 5),
        meeting_link: data.meeting_link || '',
        specialty: data.specialty || '',
        participants: (data.participants || []).map((participant) => participant?.id || participant),
      })
    } catch (err) {
      setError('Échec du chargement de la réunion')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredCases = useMemo(() => {
    if (!selectedPatientId) return []
    return cases.filter((c) => c.patient === selectedPatientId)
  }, [cases, selectedPatientId])

  const handlePatientChange = (patientId) => {
    setSelectedPatientId(patientId)
    setSelectedCaseId('')
  }

  const handleAddCase = () => {
    if (!selectedCaseId) return
    if (form.medical_cases.includes(selectedCaseId)) {
      alert('Ce dossier est déjà ajouté à la réunion.')
      return
    }
    setForm(f => ({ ...f, medical_cases: [...f.medical_cases, selectedCaseId] }))
    setSelectedCaseId('')
  }

  const handleRemoveCase = (caseId) => {
    setForm(f => ({ ...f, medical_cases: f.medical_cases.filter(id => id !== caseId) }))
  }

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const handleParticipantToggle = (userId) => {
    setForm((f) => ({
      ...f,
      participants: f.participants.includes(userId)
        ? f.participants.filter((p) => p !== userId)
        : [...f.participants, userId],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.medical_cases.length === 0) {
      setError('Veuillez ajouter au moins un dossier médical à la réunion.')
      return
    }
    try {
      setSaving(true)
      setError(null)
      const scheduled_date = `${form.scheduled_date}T${form.scheduled_time}:00`
      const payload = {
        medical_cases: form.medical_cases,
        scheduled_date,
        specialty: form.specialty || null,
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
        
        {/* Medical Cases Selection Area */}
        <div className="form-section-card" style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: '600', color: '#0f172a' }}>Sélection des dossiers médicaux</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
            <SearchableSelect 
              label="Rechercher un patient"
              placeholder="Tapez pour rechercher..."
              options={patients.map(p => ({
                value: p.id,
                label: `${p.first_name} ${p.last_name}`,
                subLabel: p.anonymized_code ? `Code : ${p.anonymized_code}` : `DDN : ${new Date(p.birth_date).toLocaleDateString()}`
              }))}
              value={selectedPatientId}
              onChange={handlePatientChange}
              onSearch={setPatientSearch}
              loading={patientsLoading}
            />
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Sélectionner le dossier</label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                disabled={!selectedPatientId}
                style={{ height: '42px' }}
              >
                <option value="">{selectedPatientId ? 'Choisir un dossier...' : 'Rechercher le patient d\'abord'}</option>
                {filteredCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || `Dossier ${c.id.slice(0, 8)}...`} ({c.status})
                  </option>
                ))}
              </select>
            </div>
            <button 
              type="button" 
              onClick={handleAddCase}
              className="btn-primary"
              disabled={!selectedCaseId}
              style={{ height: '42px', padding: '0 1.5rem' }}
            >
              Ajouter le dossier
            </button>
          </div>

          <div className="selected-cases-list">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Dossiers sélectionnés ({form.medical_cases.length})</label>
            {selectedCases.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {selectedCases.map(c => (
                  <div key={c.id} className="case-selection-chip" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1px solid #e2e8f0', padding: '0.5rem 0.75rem', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{c.patientName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.name || 'Dossier sans titre'}</div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveCase(c.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.25rem' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '1rem', textAlign: 'center', background: 'white', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#94a3b8', fontSize: '0.9rem' }}>
                Aucun dossier ajouté pour le moment. Utilisez la recherche ci-dessus pour ajouter des dossiers médicaux à cette réunion.
              </div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Coordinateur</label>
          <div className="readonly-field">
            <div className="readonly-field-title">{formatUserName(coordinatorUser || user)}</div>
            <div className="readonly-field-meta">
              {isEdit
                ? 'Coordinateur assigné à cette réunion'
                : 'Défini automatiquement sur l\'utilisateur connecté créant cette réunion'}
              {formatUserMeta(coordinatorUser || user) ? ` • ${formatUserMeta(coordinatorUser || user)}` : ''}
            </div>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Date *</label>
            <input
              type="date"
              value={form.scheduled_date}
              onChange={(e) => handleChange('scheduled_date', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Heure</label>
            <input
              type="time"
              value={form.scheduled_time}
              onChange={(e) => handleChange('scheduled_time', e.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Lien de la réunion</label>
          <div className="readonly-field">
            <div className="readonly-field-title">{form.meeting_link || 'Généré automatiquement après l\'enregistrement de la réunion'}</div>
            <div className="readonly-field-meta">Le lien de participation est permanent et géré par la plateforme.</div>
          </div>
        </div>
        <div className="form-group">
          <label>Spécialité</label>
          <input
            type="text"
            value={form.specialty}
            onChange={(e) => handleChange('specialty', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Participants</label>
          <div className="participant-picker">
            <div className="participant-picker-toolbar">
              <div className="participant-picker-summary">
                <span>{form.participants.length} sélectionnés</span>
                <span>{filteredUsers.length} affichés</span>
              </div>
              {!!form.participants.length && (
                <button
                  type="button"
                  className="btn-small btn-secondary"
                  onClick={() => handleChange('participants', [])}
                >
                  Effacer la sélection
                </button>
              )}
            </div>

            <input
              type="search"
              value={participantSearch}
              onChange={(e) => setParticipantSearch(e.target.value)}
              className="participant-search-input"
              placeholder="Rechercher par nom, email, rôle, spécialité..."
            />

            <div className="selected-participants-panel">
              <div className="selected-participants-header">Participants sélectionnés</div>
              {selectedParticipants.length ? (
                <div className="selected-participants-list">
                  {selectedParticipants.map((participant) => (
                    <button
                      key={participant.id}
                      type="button"
                      className="selected-participant-chip"
                      onClick={() => handleParticipantToggle(participant.id)}
                      title={`Retirer ${formatUserName(participant)}`}
                    >
                      <span className="selected-participant-avatar">{getInitials(participant)}</span>
                      <span className="selected-participant-name">{formatUserName(participant)}</span>
                      <span className="selected-participant-remove">×</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="empty-inline">Aucun participant sélectionné pour le moment.</p>
              )}
            </div>

            <div className="participant-results" role="listbox" aria-label="Liste des participants">
              {filteredUsers.length ? (
                filteredUsers.map((candidate) => {
                  const isSelected = selectedParticipantIds.has(candidate.id)

                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      className={`participant-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleParticipantToggle(candidate.id)}
                    >
                      <span className="participant-avatar">{getInitials(candidate)}</span>
                      <span className="participant-option-text">
                        <span className="participant-option-name">{formatUserName(candidate)}</span>
                        <span className="participant-option-meta">
                          {formatUserMeta(candidate) || candidate.username || 'Pas de détails supplémentaires'}
                        </span>
                      </span>
                      <span className="participant-option-state">{isSelected ? 'Sélectionné' : 'Ajouter'}</span>
                    </button>
                  )
                })
              ) : (
                <p className="empty-inline">Aucun utilisateur ne correspond à votre recherche.</p>
              )}
            </div>
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          <button type="button" onClick={() => navigate(-1)}>Annuler</button>
        </div>
      </form>
    </div>
  )
}

