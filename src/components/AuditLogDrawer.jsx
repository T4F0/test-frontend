import { useEffect } from 'react'
import {
  X, User, Globe, Monitor, Smartphone, Tablet, MapPin,
  Cpu, Activity, PlusCircle, Edit, Trash2, Eye,
  Calendar, FileText, FileType, Stethoscope, File,
  LogIn, LogOut, AlertTriangle
} from 'lucide-react'
import { formatDateTime } from '../lib/dateUtils'

const ACTION_LABELS = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  VIEW: 'Consultation',
  LOGIN: 'Connexion',
  LOGOUT: 'Déconnexion',
  LOGIN_FAILED: 'Échec de connexion',
}

const ACTION_ICONS = {
  CREATE: <PlusCircle size={18} />,
  UPDATE: <Edit size={18} />,
  DELETE: <Trash2 size={18} />,
  VIEW: <Eye size={18} />,
  LOGIN: <LogIn size={18} />,
  LOGOUT: <LogOut size={18} />,
  LOGIN_FAILED: <AlertTriangle size={18} />,
}

const ACTION_COLORS = {
  CREATE: '#10b981',
  UPDATE: '#f59e0b',
  DELETE: '#ef4444',
  VIEW: '#3b82f6',
  LOGIN: '#10b981',
  LOGOUT: '#64748b',
  LOGIN_FAILED: '#ef4444',
}

const OBJECT_TYPE_LABELS = {
  User: 'Utilisateur / Compte',
  Patient: 'Dossier Patient',
  RCPMeeting: 'Réunion RCP',
  RCPReport: 'Compte-rendu RCP',
  MedicalDocument: 'Document Médical',
  Form: 'Modèle de Formulaire',
  FormSubmission: 'Soumission de Dossier',
  Session: 'Session',
}

const OBJECT_TYPE_ICONS = {
  User: <User size={14} />,
  Patient: <Stethoscope size={14} />,
  RCPMeeting: <Calendar size={14} />,
  RCPReport: <FileText size={14} />,
  MedicalDocument: <File size={14} />,
  Form: <FileType size={14} />,
  FormSubmission: <FileText size={14} />,
  Session: <LogIn size={14} />,
}

const DEVICE_TYPE_ICONS = {
  desktop: <Monitor size={16} />,
  mobile: <Smartphone size={16} />,
  tablet: <Tablet size={16} />,
}

const DEVICE_TYPE_LABELS = {
  desktop: 'Ordinateur',
  mobile: 'Mobile',
  tablet: 'Tablette',
}

export default function AuditLogDrawer({ log, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!log) return null

  const actionColor = ACTION_COLORS[log.action] || '#64748b'
  const hasIP = !!log.ip_address
  const hasLocation = log.location && Object.keys(log.location).length > 0
  const isPrivateIP = hasIP && !hasLocation
  const isEmptyLog = !log.user_agent && !hasIP && !log.device_type && !log.device_name && !log.browser && !log.os

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          zIndex: 1000,
          backdropFilter: 'blur(2px)',
        }}
      />

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '440px',
          maxWidth: '100vw',
          height: '100vh',
          background: '#ffffff',
          boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.12)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: `${actionColor}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: actionColor,
              }}
            >
              {ACTION_ICONS[log.action] || <Activity size={18} />}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>
                {ACTION_LABELS[log.action] || log.action}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {formatDateTime(log.timestamp)}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {/* Utilisateur */}
          <Section icon={<User size={16} />} title="Utilisateur">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  flexShrink: 0,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                {(log.username || 'S')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{log.username || 'Système'}</div>
                {log.user_email && (
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{log.user_email}</div>
                )}
              </div>
            </div>
            <DetailRow label="Rôle" value={log.user_role || null} missing={!log.user_role ? "non spécifié" : null} />
            <DetailRow label="Service" value={log.service_name || null} missing={!log.service_name ? "aucun" : null} />
          </Section>

          {/* Appareil */}
          <Section icon={<Cpu size={16} />} title="Appareil">
            {isEmptyLog ? (
              <MissingHint>Aucune information — journal antérieur à la collecte des données</MissingHint>
            ) : (
              <>
                <DetailRow
                  label="Type"
                  value={
                    log.device_type ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {DEVICE_TYPE_ICONS[log.device_type]}
                        {DEVICE_TYPE_LABELS[log.device_type] || log.device_type}
                      </span>
                    ) : null
                  }
                  missing={!log.device_type ? "non déterminé" : null}
                />
                <DetailRow
                  label="Modèle"
                  value={log.device_name || null}
                  missing={!log.device_name ? "non déterminé" : null}
                />
                <DetailRow
                  label="Système"
                  value={log.os || null}
                  missing={!log.os ? "non déterminé" : null}
                />
                <DetailRow
                  label="Navigateur"
                  value={log.browser || null}
                  missing={!log.browser ? "non déterminé" : null}
                />
                <DetailRow
                  label="User Agent"
                  value={log.user_agent || null}
                  missing={!log.user_agent ? "non disponible" : null}
                  mono
                />
              </>
            )}
          </Section>

          {/* Réseau */}
          <Section icon={<Globe size={16} />} title="Réseau & Localisation">
            <DetailRow
              label="Adresse IP"
              value={log.ip_address || null}
              missing={!log.ip_address ? "non capturée" : null}
              mono
            />
            {hasLocation ? (
              <>
                {log.location.city && log.location.country && (
                  <DetailRow
                    label="Localisation"
                    value={
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <MapPin size={14} style={{ color: '#ef4444' }} />
                        {[log.location.city, log.location.region, log.location.country]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    }
                  />
                )}
                {log.location.lat && log.location.lon && (
                  <DetailRow
                    label="Coordonnées"
                    value={`${log.location.lat}, ${log.location.lon}`}
                    mono
                  />
                )}
                {log.location.isp && <DetailRow label="FAI" value={log.location.isp} />}
              </>
            ) : isPrivateIP ? (
              <MissingHint>Localisation non disponible (IP privée ou locale)</MissingHint>
            ) : hasIP ? (
              <MissingHint>Localisation non disponible (service indisponible)</MissingHint>
            ) : null}
          </Section>

          {/* Objet */}
          <Section icon={<Activity size={16} />} title="Élément concerné">
            <DetailRow
              label="Type"
              value={
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {OBJECT_TYPE_ICONS[log.object_type]}
                  {OBJECT_TYPE_LABELS[log.object_type] || log.object_type}
                </span>
              }
            />
            {log.object_id && (
              <DetailRow label="ID" value={log.object_id} mono />
            )}
          </Section>

          {/* Données d'événement (login/logout) */}
          {log.action === 'LOGIN_FAILED' && log.new_value && (
            <Section icon={<AlertTriangle size={16} />} title="Détails de l'échec">
              <DetailRow
                label="Utilisateur tenté"
                value={log.new_value.attempted_username || '/'}
              />
            </Section>
          )}

          {/* Données modifiées */}
          {log.action === 'UPDATE' && log.old_value && log.new_value && (
            <Section icon={<Edit size={16} />} title="Données modifiées">
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', marginTop: '0.25rem' }}>
                Ancienne valeur
              </div>
              <pre
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  padding: '0.75rem',
                  fontSize: '0.75rem',
                  color: '#991b1b',
                  overflow: 'auto',
                  maxHeight: 180,
                  margin: 0,
                }}
              >
                {JSON.stringify(log.old_value, null, 2)}
              </pre>

              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', marginTop: '1rem' }}>
                Nouvelle valeur
              </div>
              <pre
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 8,
                  padding: '0.75rem',
                  fontSize: '0.75rem',
                  color: '#166534',
                  overflow: 'auto',
                  maxHeight: 180,
                  margin: 0,
                }}
              >
                {JSON.stringify(log.new_value, null, 2)}
              </pre>
            </Section>
          )}

          {log.action === 'CREATE' && log.new_value && (
            <Section icon={<PlusCircle size={16} />} title="Données enregistrées">
              <pre
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 8,
                  padding: '0.75rem',
                  fontSize: '0.75rem',
                  color: '#166534',
                  overflow: 'auto',
                  maxHeight: 200,
                  margin: 0,
                }}
              >
                {JSON.stringify(log.new_value, null, 2)}
              </pre>
            </Section>
          )}

          {log.action === 'DELETE' && log.old_value && (
            <Section icon={<Trash2 size={16} />} title="Données supprimées">
              <pre
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  padding: '0.75rem',
                  fontSize: '0.75rem',
                  color: '#991b1b',
                  overflow: 'auto',
                  maxHeight: 200,
                  margin: 0,
                }}
              >
                {JSON.stringify(log.old_value, null, 2)}
              </pre>
            </Section>
          )}
        </div>
      </div>
    </>
  )
}

function Section({ icon, title, children }) {
  return (
    <div
      style={{
        marginBottom: '1.25rem',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.75rem',
          color: '#475569',
          fontSize: '0.85rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {icon}
        {title}
      </div>
      {children}
    </div>
  )
}

function DetailRow({ label, value, missing, mono }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.4rem 0',
        fontSize: '0.85rem',
      }}
    >
      <span style={{ color: '#94a3b8', flexShrink: 0 }}>{label}</span>
      {value != null ? (
        <span
          style={{
            color: '#334155',
            textAlign: 'right',
            fontFamily: mono ? '"JetBrains Mono", "Fira Code", monospace' : 'inherit',
            fontSize: mono ? '0.75rem' : '0.85rem',
            wordBreak: 'break-all',
            lineHeight: 1.4,
          }}
        >
          {value}
        </span>
      ) : missing ? (
        <span
          style={{
            color: '#cbd5e1',
            fontStyle: 'italic',
            fontSize: '0.78rem',
            textAlign: 'right',
          }}
        >
          {missing}
        </span>
      ) : (
        <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>—</span>
      )}
    </div>
  )
}

function MissingHint({ children }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.4rem 0',
        fontSize: '0.8rem',
        color: '#94a3b8',
        fontStyle: 'italic',
      }}
    >
      <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>ⓘ</span>
      {children}
    </div>
  )
}
