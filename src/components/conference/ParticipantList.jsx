import { Users, Crown, MicOff, UserMinus, Hand } from 'lucide-react'

/**
 * Collapsible participant list sidebar.
 */
export default function ParticipantList({
  participants,
  currentUserId,
  isHost,
  onMuteParticipant,
  onRemoveParticipant,
  isOpen,
  onToggle,
}) {
  if (!isOpen) return null

  const activeParticipants = participants.filter((p) => p.is_active !== false)

  return (
    <div className="sidebar participant-sidebar">
      <div className="sidebar-header">
        <h3>
          <Users size={18} />
          Participants ({activeParticipants.length})
        </h3>
        <button className="sidebar-close" onClick={onToggle}>×</button>
      </div>
      <div className="sidebar-content">
        <ul className="participant-list">
          {participants.map((p) => (
            <li key={p.user_id} className={`participant-item ${p.is_active === false ? 'offline' : ''}`}>
              <div className="participant-avatar">
                {(p.first_name || p.username || '?')[0].toUpperCase()}
              </div>
              <div className="participant-info">
                <span className="participant-name">
                  {p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : p.username}
                  {p.user_id === currentUserId && <span className="you-tag">(You)</span>}
                </span>
                <div className="participant-badges">
                  {p.role === 'HOST' && (
                    <span className="badge-host" title="Host">
                      <Crown size={12} /> Host
                    </span>
                  )}
                  {p.user_role && (
                    <span className="badge-role">{p.user_role}</span>
                  )}
                </div>
              </div>
              <div className="participant-actions">
                {p.hand_raised && (
                  <span className="hand-icon" title="Hand raised">
                    <Hand size={16} />
                  </span>
                )}
                {p.is_muted && (
                  <span className="muted-icon" title="Muted">
                    <MicOff size={14} />
                  </span>
                )}
                {isHost && p.user_id !== currentUserId && (
                  <>
                    <button
                      className="action-btn"
                      onClick={() => onMuteParticipant(p.user_id)}
                      title="Mute participant"
                    >
                      <MicOff size={14} />
                    </button>
                    <button
                      className="action-btn danger"
                      onClick={() => onRemoveParticipant(p.user_id)}
                      title="Remove participant"
                    >
                      <UserMinus size={14} />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
