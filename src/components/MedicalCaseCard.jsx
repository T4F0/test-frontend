import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, FileText, Trash2 } from 'lucide-react';
import { formatDate } from '../lib/dateUtils';

export default function MedicalCaseCard({ submission, onRemove, currentUserRole }) {
  const navigate = useNavigate();

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1.25rem',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>{submission.patient_name}</h4>
        <span style={{
          fontSize: '0.7rem',
          padding: '2px 8px',
          borderRadius: '999px',
          backgroundColor: '#eff6ff',
          color: '#1e40af',
          fontWeight: 600,
          textTransform: 'uppercase'
        }}>{submission.status}</span>
      </div>
      <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>{submission.form_name}</p>
      <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Soumis le {formatDate(submission.created_at)}</p>
      
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
        <button
          onClick={() => navigate(`/patients/${submission.patient_id}`)}
          style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
        >
          <ExternalLink size={14} /> Voir
        </button>
        <button
          onClick={() => navigate(`/forms/${submission.form}/submissions/${submission.id}`)}
          style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
        >
          <FileText size={14} /> Modifier
        </button>
        <button
          onClick={() => onRemove(submission.id)}
          style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer' }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
