import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getMeeting, createMeeting, updateMeeting } from '../api/meetingsApi'
import { getSubmissionsByPatientForMeeting } from '../api/submissionsApi'
import { getPatients } from '../api/patientsApi'
import { getUsers } from '../api/authApi'
import { useAuth } from '../context/AuthContext'
import SearchableSelect from '../components/SearchableSelect'
import UserAvatar from '../components/UserAvatar'
import { formatDate } from '../lib/dateUtils'
import { Users } from 'lucide-react'

// Status display config for the 3 new statuses
const SUBMISSION_STATUS_LABELS = {
  NOUVEAU:      'Nouveau',
  A_REDISCUTER: 'À rediscuter',
  CLOTURE:      'Clôturé',
}
const SUBMISSION_STATUS_COLORS = {
  NOUVEAU:      '#3b82f6',
  A_REDISCUTER: '#f97316',
  CLOTURE:      '#6b7280',
}

export default function MeetingForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const isEdit = !!id

  useEffect(() => {
    // Restrict access for Medecins - they cannot create or edit meetings
    if (user && ['MEDECIN', 'MEDECIN_EXPERT'].includes(user.role)) {
      navigate('/meetings')
    }
  }, [user, navigate])

  const preselectData = useMemo(() => location.state || {}, [location.state])

  const [form, setForm] = useState({
    name: '',
    submissions: preselectData.preselectSubmissions
      ? preselectData.preselectSubmissions.map((sid) => String(sid))
      : [],
    coordinator: '',
    scheduled_date: '',
    scheduled_time: '09:00',
    meeting_link: '',
    participants: Array.from(new Set([
      ...(preselectData.preselectDoctor ? [String(preselectData.preselectDoctor)] : []),
      ...(user?.id ? [String(user.id)] : [])
    ])),
  })

  // Cache of all fetched submission objects (for building payload & display)
  const [allSubmissions, setAllSubmissions] = useState([])
  // Patients whose cases have been added to this meeting
  const [selectedPatients, setSelectedPatients] = useState([])
  // Patient search autocomplete state
  const [patients, setPatients] = useState([])
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [patientsLoading, setPatientsLoading] = useState(false)
  const [addingPatient, setAddingPatient] = useState(false)

  const [users, setUsers] = useState([])
  const [participantSearch, setParticipantSearch] = useState('')

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [infoMessage, setInfoMessage] = useState(null)

  // ─── Load on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    if (id) loadMeeting()
    else if (preselectData.preselectPatientId) {
      initPreselectedPatient()
    }
  }, [id])

  useEffect(() => {
    loadUsers()
  }, [])

  // Debounced patient search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadPatients(patientSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [patientSearch])

  // ─── Derived data ─────────────────────────────────────────────────────────
  const normalizedCoordinatorId = isEdit ? form.coordinator : user?.id || ''
  const usersById = useMemo(() => new Map(users.map((u) => [String(u.id), u])), [users])
  const submissionsById = useMemo(
    () => new Map(allSubmissions.map((s) => [String(s.id), s])),
    [allSubmissions],
  )

  const selectedParticipantIds = useMemo(() => new Set(form.participants), [form.participants])

  const selectedParticipants = useMemo(
    () => form.participants.map((pId) => usersById.get(String(pId))).filter(Boolean),
    [form.participants, usersById],
  )

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const formatUserName = (candidate) => {
    if (!candidate) return 'Utilisateur inconnu'
    const fullName = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim()
    return fullName || candidate.username || candidate.email || 'Utilisateur inconnu'
  }

  const formatUserMeta = (candidate) =>
    [candidate.email, candidate.role].filter(Boolean).join(' • ')

  // Count how many submissions in the form belong to a given patient
  const countSubmissionsForPatient = (patientId) =>
    allSubmissions.filter(
      (s) => String(s.patient) === String(patientId) && form.submissions.includes(String(s.id)),
    ).length

  const filteredUsers = useMemo(() => {
    const q = participantSearch.toLowerCase()
    return users.filter(
      (u) =>
        u.id !== user?.id &&
        u.role !== 'MEDECIN_EXPERT' &&
        (formatUserName(u).toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.role?.toLowerCase().includes(q)),
    )
  }, [users, participantSearch, user])

  const expertUsers = useMemo(() => users.filter(u => u.role === 'MEDECIN_EXPERT'), [users])
  const allExpertsSelected = expertUsers.length > 0 && expertUsers.every(u => selectedParticipantIds.has(String(u.id)))

  const handleToggleAllExperts = () => {
    if (expertUsers.length === 0) return
    
    if (allExpertsSelected) {
      const expertIds = new Set(expertUsers.map(u => String(u.id)))
      setForm(f => ({ ...f, participants: f.participants.filter(pId => !expertIds.has(pId)) }))
    } else {
      const newParticipants = new Set(form.participants)
      expertUsers.forEach(u => newParticipants.add(String(u.id)))
      setForm(f => ({ ...f, participants: Array.from(newParticipants) }))
    }
  }

  // ─── API calls ────────────────────────────────────────────────────────────
  const loadUsers = async () => {
    try {
      const usersData = await getUsers()
      setUsers(Array.isArray(usersData) ? usersData : [])
    } catch (e) {
      console.error(e)
      if (e.response?.status === 403) {
        setError(
          'Accès refusé : Seuls les administrateurs et les coordinateurs peuvent créer ou modifier des réunions.',
        )
      } else {
        setError('Échec du chargement des utilisateurs')
      }
    }
  }

  const loadPatients = async (query = '') => {
    try {
      setPatientsLoading(true)
      const data = await getPatients(1, query, '', true)
      const patientsData = Array.isArray(data) ? data : []
      setPatients(
        [...patientsData].sort((a, b) =>
          `${a.first_name || ''} ${a.last_name || ''}`.localeCompare(
            `${b.first_name || ''} ${b.last_name || ''}`,
          ),
        ),
      )
    } catch (e) {
      console.error(e)
    } finally {
      setPatientsLoading(false)
    }
  }

  const loadMeeting = async () => {
    try {
      const data = await getMeeting(id)
      const dt = data.scheduled_date ? new Date(data.scheduled_date) : new Date()

      // Reconstruct selectedPatients from submission_details returned by the API
      const submissionDetails = data.submission_details || []
      if (submissionDetails.length > 0) {
        // Merge into allSubmissions cache (normalise to match FormSubmission shape)
        setAllSubmissions((prev) => {
          const existingIds = new Set(prev.map((s) => String(s.id)))
          const normalised = submissionDetails
            .filter((s) => !existingIds.has(String(s.id)))
            .map((s) => ({
              id: s.id,
              patient: s.patient_id,   // keep "patient" field for consistency
              patient_id: s.patient_id,
              patient_name: s.patient_name,
              form_name: s.form_name,
              name: s.form_name,
              created_at: s.created_at,
              status: s.status,
            }))
          return [...prev, ...normalised]
        })

        // Build unique patient list from submission details
        const patientsMap = new Map()
        submissionDetails.forEach((sub) => {
          if (sub.patient_id && !patientsMap.has(String(sub.patient_id))) {
            const nameParts = (sub.patient_name || '').split(' ')
            patientsMap.set(String(sub.patient_id), {
              id: sub.patient_id,
              first_name: nameParts[0] || '',
              last_name: nameParts.slice(1).join(' ') || '',
              display_name: sub.patient_name || '',
            })
          }
        })
        setSelectedPatients(Array.from(patientsMap.values()))
      }

      setForm({
        name: data.name || '',
        submissions: (data.submissions || []).map((sid) => String(sid)),
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

  const initPreselectedPatient = async () => {
    try {
      setAddingPatient(true)
      const patientId = preselectData.preselectPatientId
      const subs = await getSubmissionsByPatientForMeeting(patientId)
      const newSubs = Array.isArray(subs) ? subs : []

      // Merge into allSubmissions cache
      setAllSubmissions((prev) => {
        const existingIds = new Set(prev.map((s) => String(s.id)))
        return [...prev, ...newSubs.filter((s) => !existingIds.has(String(s.id)))]
      })

      // Add all submission IDs to the form (deduplicated)
      setForm((f) => {
        const existingSet = new Set(f.submissions)
        const toAdd = newSubs.map((s) => String(s.id)).filter((sid) => !existingSet.has(sid))
        return { ...f, submissions: [...f.submissions, ...toAdd] }
      })

      // Construct a basic patient object for the UI chips
      const nameParts = (preselectData.preselectPatientName || '').split(' ')
      setSelectedPatients([{
        id: patientId,
        first_name: nameParts[0] || 'Patient',
        last_name: nameParts.slice(1).join(' ') || '',
        display_name: preselectData.preselectPatientName || 'Patient',
      }])
    } catch (e) {
      console.error('Failed to init preselected patient', e)
    } finally {
      setAddingPatient(false)
    }
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────
  /** Called when the user picks a patient from the SearchableSelect */
  const handleAddPatient = async (patientId) => {
    if (!patientId) return

    // Already added — silently reset the picker
    if (selectedPatients.some((p) => String(p.id) === String(patientId))) {
      setSelectedPatientId('')
      return
    }

    const patient = patients.find((p) => String(p.id) === String(patientId))
    if (!patient) return

    try {
      setAddingPatient(true)
      const subs = await getSubmissionsByPatientForMeeting(patientId)
      const newSubs = Array.isArray(subs) ? subs : []

      // Merge into allSubmissions cache
      setAllSubmissions((prev) => {
        const existingIds = new Set(prev.map((s) => String(s.id)))
        return [...prev, ...newSubs.filter((s) => !existingIds.has(String(s.id)))]
      })

      // Add all submission IDs to the form (deduplicated)
      setForm((f) => {
        const existingSet = new Set(f.submissions)
        const toAdd = newSubs.map((s) => String(s.id)).filter((sid) => !existingSet.has(sid))
        return { ...f, submissions: [...f.submissions, ...toAdd] }
      })

      // Add patient to the chip list
      setSelectedPatients((prev) => [...prev, patient])

      // Warn if no eligible dossiers found
      if (newSubs.length === 0) {
        setInfoMessage(
          `ℹ️ Ce patient n'a aucun dossier "Nouveau" ou "À rediscuter". Tous ses dossiers sont déjà clôturés.`
        )
      } else {
        setInfoMessage(null)
      }
    } catch (e) {
      console.error(e)
      setError('Impossible de charger les dossiers du patient.')
    } finally {
      setAddingPatient(false)
      setSelectedPatientId('')
    }
  }

  /** Remove a patient chip → remove all their submissions from the form */
  const handleRemovePatient = (patientId) => {
    const patientSubIds = new Set(
      allSubmissions
        .filter((s) => String(s.patient) === String(patientId))
        .map((s) => String(s.id)),
    )
    setForm((f) => ({
      ...f,
      submissions: f.submissions.filter((sid) => !patientSubIds.has(sid)),
    }))
    setSelectedPatients((prev) => prev.filter((p) => String(p.id) !== String(patientId)))
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
    try {
      setSaving(true)
      setError(null)
      const scheduled_date = `${form.scheduled_date}T${form.scheduled_time}:00`
      const payload = {
        name: form.name,
        submissions: form.submissions,
        patients: selectedPatients.map(p => String(p.id)),
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
      setError(err.response?.data?.detail || "Échec de l'enregistrement de la réunion")
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return <div className="loading">Chargement de la réunion...</div>

  return (
    <div className="form-details">
      <h2>{isEdit ? 'Modifier la réunion' : 'Nouvelle réunion'}</h2>
      {error && <div className="error">{error}</div>}
      {infoMessage && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          fontSize: '0.875rem',
          color: '#92400e',
        }}>
          {infoMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="submission-form">

        {/* ── Meeting title ─────────────────────────────────────────────── */}
        <div className="form-group">
          <label>Titre de la réunion (Optionnel)</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Ex: Réunion pluridisciplinaire d'oncologie..."
          />
        </div>

        {/* ── Patient selection ─────────────────────────────────────────── */}
        <div className="form-section-card">
          <h3
            style={{
              marginBottom: '0.5rem',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#0f172a',
            }}
          >
            Patients à discuter
          </h3>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#64748b',
              marginBottom: '1.25rem',
            }}
          >
            Sélectionnez un patient pour inclure automatiquement tous ses dossiers médicaux dans
            la réunion.
          </p>

          <SearchableSelect
            label="Rechercher et ajouter un patient"
            placeholder="Tapez le nom du patient..."
            options={patients
              .filter((p) => !selectedPatients.some((sp) => String(sp.id) === String(p.id)))
              .map((p) => ({
                value: p.id,
                label: `${p.first_name} ${p.last_name}`,
                subLabel: `DDN : ${formatDate(p.birth_date)}`,
              }))}
            value={selectedPatientId}
            onChange={(patientId) => {
              setSelectedPatientId(patientId)
              if (patientId) handleAddPatient(patientId)
            }}
            onSearch={setPatientSearch}
            loading={patientsLoading || addingPatient}
          />

          {/* Spinner while fetching submissions */}
          {addingPatient && (
            <div
              style={{
                marginTop: '0.75rem',
                fontSize: '0.875rem',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  border: '2px solid #bfdbfe',
                  borderTopColor: '#3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }}
              />
              Chargement des dossiers du patient…
            </div>
          )}

          {/* Selected patients chips */}
          <div style={{ marginTop: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                fontWeight: '700',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Patients sélectionnés ({selectedPatients.length}) —{' '}
              <span style={{ color: '#2563eb' }}>{form.submissions.length} dossier(s) inclus</span>
            </label>

            {selectedPatients.length > 0 ? (
              <div className="selected-chips-container">
                {selectedPatients.map((patient) => {
                  const subCount = countSubmissionsForPatient(patient.id)
                  const initials =
                    `${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}`.toUpperCase() ||
                    '?'
                  const displayName =
                    patient.display_name ||
                    `${patient.first_name} ${patient.last_name}`.trim()

                  return (
                    <div key={patient.id} className="selected-chip">
                      {/* Avatar */}
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #2563eb, #6366f1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: '700',
                          fontSize: '0.75rem',
                          flexShrink: 0,
                          letterSpacing: '0.02em',
                        }}
                      >
                        {initials}
                      </div>

                      {/* Info */}
                      <div className="selected-chip-info">
                        <div className="selected-chip-title">
                          {displayName}
                        </div>
                        <div className="selected-chip-subtitle">
                          {subCount > 0
                            ? `${subCount} dossier(s)`
                            : 'Aucun dossier'}
                        </div>
                      </div>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemovePatient(patient.id)}
                        title="Retirer ce patient et ses dossiers"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '1.25rem',
                          lineHeight: 1,
                          padding: '0 0.1rem',
                          marginLeft: '0.25rem',
                          boxShadow: 'none',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: '1.25rem',
                  textAlign: 'center',
                  background: 'white',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  fontSize: '0.9rem',
                }}
              >
                Aucun patient sélectionné. Recherchez un patient ci-dessus pour ajouter ses
                dossiers.
              </div>
            )}
          </div>
        </div>

        {/* ── Participants ──────────────────────────────────────────────── */}
        <div className="form-section-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#0f172a' }}>
              Participants
            </h3>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {selectedParticipants.length} sélectionnés • {filteredUsers.length} affichés
            </div>
          </div>

          {/* Search box */}
          <div className="form-group" style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <input
              type="text"
              placeholder="Rechercher par nom, email ou rôle..."
              value={participantSearch}
              onChange={(e) => setParticipantSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 2.5rem 0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            />
            {participantSearch && (
              <button
                type="button"
                onClick={() => setParticipantSearch('')}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--gray-400)',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Selected participants chips */}
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              background: '#fff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              minHeight: '60px',
            }}
          >
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 'bold',
                color: '#0f172a',
                marginBottom: '0.5rem',
              }}
            >
              Participants sélectionnés
            </div>
            {selectedParticipants.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {selectedParticipants.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                    }}
                  >
                    <span>{formatUserName(p)}</span>
                    <button
                      type="button"
                      onClick={() => handleParticipantToggle(p.id)}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        boxShadow: 'none',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                Aucun participant sélectionné pour le moment.
              </div>
            )}
          </div>

          {/* User list */}
          <div
            className="participants-list"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              maxHeight: '400px',
              overflowY: 'auto',
            }}
          >
            {expertUsers.length > 0 && !participantSearch && (
              <div
                className="participant-row"
                style={{
                  background: '#faf5ff',
                  borderColor: '#d8b4fe',
                  marginBottom: '0.5rem'
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#e9d5ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#7c3aed',
                    marginRight: '1rem',
                    flexShrink: 0,
                  }}
                >
                  <Users size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: '600',
                      color: '#6d28d9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    Tous les médecins experts
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#7c3aed' }}>
                    Ajouter les {expertUsers.length} médecins experts d'un seul clic
                  </div>
                </div>
                <button
                  type="button"
                  disabled={expertUsers.length === 0}
                  className={allExpertsSelected ? 'btn-danger-outline' : 'btn-primary-outline'}
                  onClick={handleToggleAllExperts}
                  style={{
                    padding: '0.4rem 1rem',
                    borderRadius: '6px',
                    cursor: expertUsers.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {expertUsers.length === 0 ? 'Aucun expert' : (allExpertsSelected ? 'Retirer tous' : 'Ajouter tous')}
                </button>
              </div>
            )}
            {filteredUsers.map((u) => (
              <div key={u.id} className="participant-row">
                <div style={{ marginRight: '1rem' }}>
                  <UserAvatar user={u} size={40} style={{ background: '#f1f5f9', color: '#3b82f6', fontSize: '0.85rem' }} />
                </div>
                <div className="participant-info">
                  <div
                    className="participant-name-wrapper"
                    style={{ color: u.has_pending_request ? '#16a34a' : '#1e293b' }}
                  >
                    {formatUserName(u)}
                    {u.has_pending_request && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          background: '#dcfce7',
                          color: '#16a34a',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                        }}
                      >
                        EN ATTENTE
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{formatUserMeta(u)}</div>
                </div>
                <button
                  type="button"
                  className={
                    selectedParticipantIds.has(String(u.id))
                      ? 'btn-danger-outline'
                      : 'btn-primary-outline'
                  }
                  onClick={() => handleParticipantToggle(u.id)}
                  style={{
                    padding: '0.4rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    border: '1px solid',
                    borderColor: selectedParticipantIds.has(String(u.id)) ? '#ef4444' : '#2563eb',
                    color: selectedParticipantIds.has(String(u.id)) ? '#ef4444' : '#2563eb',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {selectedParticipantIds.has(String(u.id)) ? 'Retirer' : 'Ajouter'}
                </button>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                Aucun utilisateur trouvé.
              </div>
            )}
          </div>
        </div>

        {/* ── Date & Time ───────────────────────────────────────────────── */}
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>Date *</label>
            <input
              type="date"
              value={form.scheduled_date}
              onChange={(e) => handleChange('scheduled_date', e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Heure</label>
            <input
              type="time"
              value={form.scheduled_time}
              onChange={(e) => handleChange('scheduled_time', e.target.value)}
            />
          </div>
        </div>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button type="button" onClick={() => navigate(-1)}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
