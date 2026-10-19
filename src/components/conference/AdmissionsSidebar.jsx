import { UserCheck, Check, X, XCircle } from 'lucide-react'
import { avatarHue } from '../../lib/avatar'


/** Host-only panel: people waiting at the door of a live meeting. */
export default function AdmissionsSidebar({ requests, onAccept, onReject, onClose }) {
  return (
    <aside className="sidebar admissions-sidebar" id="admissions-sidebar" aria-label="Demandes d'accès">
      <div className="sidebar-header">
        <h3>
          <UserCheck size={19} />
          Demandes d'accès
          {requests.length > 0 && <span className="sidebar-count is-alert">{requests.length}</span>}
        </h3>
        <button type="button" className="sidebar-close" onClick={onClose} aria-label="Fermer le panneau">
          <X size={18} />
        </button>
      </div>

      <div className="sidebar-content admissions-list">
        {requests.length === 0 ? (
          <div className="panel-empty">
            <UserCheck size={30} />
            <strong>Aucune demande en attente</strong>
            <span>Les personnes qui demandent à rejoindre la réunion apparaîtront ici.</span>
          </div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="admission-card" id={`join-req-${req.id}`}>
              <div className="admission-who">
                <div className="admission-avatar" style={{ '--avatar-hue': avatarHue(req.user_name) }}>
                  {req.user_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="admission-info">
                  <strong>{req.user_name}</strong>
                  <span>{req.user_role}</span>
                </div>
              </div>
              <div className="admission-actions">
                <button type="button" className="btn-accept" id={`accept-req-${req.id}`} onClick={() => onAccept(req.id)}>
                  <Check size={16} /> Accepter
                </button>
                <button type="button" className="btn-reject" id={`reject-req-${req.id}`} onClick={() => onReject(req.id)}>
                  <XCircle size={16} /> Refuser
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
