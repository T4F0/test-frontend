import React from 'react';
import { Users, FileText, Calendar } from 'lucide-react';
import { formatDate } from '../lib/dateUtils';

export default function MeetingSummary({ totalDossiers, participatingDoctors, meetingDate }) {
  const cardStyle = {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  };

  const titleStyle = {
    fontSize: '0.875rem',
    color: '#64748b',
    fontWeight: 600,
    textTransform: 'uppercase',
  };

  const valueStyle = {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0f172a',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
      <div style={cardStyle}>
        <span style={titleStyle}>Dossiers</span>
        <span style={valueStyle}>{totalDossiers}</span>
      </div>
      <div style={cardStyle}>
        <span style={titleStyle}>Médecins</span>
        <span style={valueStyle}>{participatingDoctors}</span>
      </div>
      <div style={cardStyle}>
        <span style={titleStyle}>Réunion</span>
        <span style={valueStyle}>{formatDate(meetingDate)}</span>
      </div>
    </div>
  );
}
