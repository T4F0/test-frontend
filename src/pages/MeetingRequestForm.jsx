import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getPatients } from '../api/patientsApi'
import { createMeetingRequestForPatient } from '../api/meetingsApi'
import { useAuth } from '../context/AuthContext'
import SearchableSelect from '../components/SearchableSelect'
import { formatDate } from '../lib/dateUtils'
import { Send, CheckCircle } from 'lucide-react'

export default function MeetingRequestForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  useEffect(() => {
    if (user && user.role !== 'MEDECIN') {
      navigate('/meetings')
    }
  }, [user, navigate])

  const [patients, setPatients] = useState([])
  const [selectedPatientId, setSelectedPatientId] = useState(location.state?.preselectPatientId || '')
  const [patientSearch, setPatientSearch] = useState('')
  const [patientsLoading, setPatientsLoading] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPatients(patientSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [patientSearch])

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

  const handlePatientChange = (patientId) => {
    setSelectedPatientId(patientId)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedPatientId) {
      setError('Veuillez sélectionner un patient.')
      return
    }
    try {
      setSaving(true)
      setError(null)
      await createMeetingRequestForPatient(selectedPatientId, note)
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
          Votre demande de réunion RCP pour ce patient a été transmise au coordinateur.
          Tous les dossiers du patient seront inclus dans la demande.
          Vous serez notifié lorsque la réunion sera planifiée.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn-primary" onClick={() => { setSuccess(false); setSelectedPatientId(''); setNote(''); }}>
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
        Sélectionnez le patient pour lequel vous souhaitez présenter les dossiers lors d'une réunion RCP.
        Tous les dossiers médicaux de ce patient seront inclus dans la demande.
        Le coordinateur sera notifié de votre demande.
      </p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit} className="submission-form">

        <div className="form-section-card" style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: '600', color: '#0f172a' }}>Sélection du patient</h3>

          <div style={{ marginBottom: '1.5rem' }}>
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
          <button type="submit" className="btn-primary" disabled={saving || !selectedPatientId}>
            {saving ? 'Envoi en cours…' : 'Envoyer la demande'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/meetings')}>Annuler</button>
        </div>
      </form>
    </div>
  )
}
