import { Calendar, Users, FileText, ChevronRight } from 'lucide-react';
import { formatDate } from '../lib/dateUtils';
import { useNavigate } from 'react-router-dom';

export default function MeetingTab({ meetingStats }) {
  const navigate = useNavigate();

  if (!meetingStats || !meetingStats.meeting) return null;

  return (
    <div style={{ padding: '0 2rem 2rem 2rem' }}>
      <div style={{ maxWidth: '600px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
          <div style={{ backgroundColor: '#ecfdf5', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px' }}>
            <Calendar size={20} color="#059669" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Prochaine Réunion</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>{formatDate(meetingStats.meeting.scheduled_date)}</p>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.025em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={14} /> Participants & Dossiers
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {meetingStats.participants.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center', padding: '1rem 0' }}>Aucun participant inscrit</p>
            ) : (
              meetingStats.participants.map(participant => (
                <div 
                  key={participant.id}
                  style={{ 
                    padding: '1rem', 
                    borderRadius: '10px', 
                    border: '1px solid #def7ec', 
                    backgroundColor: '#f0fdf4',
                    borderLeft: '4px solid #10b981'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.925rem', color: '#064e3b' }}>Dr. {participant.last_name}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#059669' }}>{participant.hospital || 'Hôpital non spécifié'}</p>
                    </div>
                    <div style={{ backgroundColor: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {participant.submission_count} cas
                    </div>
                  </div>
                  
                  <button
                    onClick={() => navigate(`/meetings/${meetingStats.meeting.id}?doctor=${participant.id}`)}
                    style={{ 
                      width: '100%', 
                      marginTop: '0.5rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: 'white',
                      border: '1px solid #10b981',
                      borderRadius: '6px',
                      color: '#059669',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <FileText size={14} /> Voir les dossiers <ChevronRight size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
