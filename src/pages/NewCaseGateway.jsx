import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getPatients } from '../api/patientsApi'
import { getForms } from '../api/formsApi'
import { checkReferenceCode } from '../api/submissionsApi'
import { useAuth } from '../context/AuthContext'
import SearchableSelect from '../components/SearchableSelect'
import { formatDate } from '../lib/dateUtils'
import { PlusCircle } from 'lucide-react'

export default function NewCaseGateway() {
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

  const [forms, setForms] = useState([])
  const [selectedFormId, setSelectedFormId] = useState('')
  const [formsLoading, setFormsLoading] = useState(true)

  const [referenceCode, setReferenceCode] = useState('')
  const [checkingCode, setCheckingCode] = useState(false)
  const [codeAvailable, setCodeAvailable] = useState(null) // null | true | false
  const [codeError, setCodeError] = useState(null)
  
  const [error, setError] = useState(null)

  // Load Forms
  useEffect(() => {
    const loadForms = async () => {
      try {
        setFormsLoading(true)
        const data = await getForms()
        setForms(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to load forms:', err)
        setError('Impossible de charger les formulaires disponibles.')
      } finally {
        setFormsLoading(false)
      }
    }
    loadForms()
  }, [])

  // Load Patients with search query
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

  // Validate reference code (debounced)
  useEffect(() => {
    const code = referenceCode.trim()
    if (!code) {
      setCodeAvailable(null)
      setCodeError(null)
      return
    }

    setCheckingCode(true)
    const check = setTimeout(async () => {
      try {
        const result = await checkReferenceCode(code)
        setCodeAvailable(result.available)
        if (!result.available) {
          setCodeError('Ce code de référence est déjà utilisé dans votre service.')
        } else {
          setCodeError(null)
        }
      } catch (err) {
        console.error('Failed to check reference code:', err)
        setCodeAvailable(null)
      } finally {
        setCheckingCode(false)
      }
    }, 400)

    return () => clearTimeout(check)
  }, [referenceCode])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedPatientId) {
      setError('Veuillez sélectionner un patient.')
      return
    }
    if (!selectedFormId) {
      setError('Veuillez sélectionner un type de dossier.')
      return
    }
    if (codeAvailable === false) {
      setError('Veuillez utiliser un code de référence disponible.')
      return
    }

    navigate(`/forms/${selectedFormId}/submit`, {
      state: {
        preselectPatientId: selectedPatientId,
        referenceCode: referenceCode.trim()
      }
    })
  }

  return (
    <div className="form-details">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <PlusCircle size={24} />
        Nouveau Dossier RCP
      </h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>
        Renseignez les informations initiales pour créer un nouveau dossier RCP. Le code de référence vous permettra d'identifier facilement ce dossier.
      </p>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit} className="submission-form">
        <div className="form-section-card" style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: '600', color: '#0f172a' }}>Détails de création</h3>

          {/* Reference Code Field */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Code de référence (Optionnel)</span>
              {checkingCode && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Vérification...</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={referenceCode}
                onChange={(e) => setReferenceCode(e.target.value)}
                placeholder="Ex : ONCO-2026-001"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: codeError ? '1px solid #ef4444' : codeAvailable === true ? '1px solid #22c55e' : '1px solid #e2e8f0',
                  outline: 'none',
                  fontSize: '0.95rem'
                }}
              />
              <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                {codeAvailable === true && !checkingCode && <span style={{ color: '#22c55e', fontSize: '1.2rem', fontWeight: 'bold' }}>✓</span>}
                {codeAvailable === false && !checkingCode && <span style={{ color: '#ef4444', fontSize: '1.2rem', fontWeight: 'bold' }}>✗</span>}
              </div>
            </div>
            {codeError && (
              <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.35rem', marginBottom: 0 }}>
                {codeError}
              </p>
            )}
            {codeAvailable === true && (
              <p style={{ color: '#22c55e', fontSize: '0.8rem', marginTop: '0.35rem', marginBottom: 0 }}>
                Le code de référence est disponible.
              </p>
            )}
          </div>

          {/* Patient Selection Field */}
          <div style={{ marginBottom: '1.5rem' }}>
            <SearchableSelect
              label="Patient"
              placeholder="Rechercher un patient..."
              options={patients.map(p => ({
                value: p.id,
                label: `${p.first_name} ${p.last_name}`,
                subLabel: `DDN : ${formatDate(p.birth_date)}`
              }))}
              value={selectedPatientId}
              onChange={(val) => setSelectedPatientId(val)}
              onSearch={setPatientSearch}
              loading={patientsLoading}
              required
            />
          </div>

          {/* Form Template Selection Field */}
          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
            <label>Formulaire RCP à remplir</label>
            {formsLoading ? (
              <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Chargement des formulaires...</p>
            ) : (
              <select
                value={selectedFormId}
                onChange={(e) => setSelectedFormId(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: 'white',
                  fontSize: '0.95rem'
                }}
              >
                <option value="">-- Sélectionner un formulaire --</option>
                {forms.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={!selectedPatientId || !selectedFormId || codeAvailable === false || checkingCode}
          >
            Continuer vers le formulaire
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate(-1)}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
