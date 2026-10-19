import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, FileText, Trash2, ClipboardList } from 'lucide-react';
import { formatDate } from '../lib/dateUtils';
import StatusBadge from './StatusBadge';

export default function MedicalCaseCard({ submission, onRemove, onViewDetails, activeDetailId, currentUserRole }) {
  const navigate = useNavigate();
  const isActive = activeDetailId === submission.id;

  return (
    <div className={`medical-case-card ${isActive ? 'medical-case-card--active' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>{submission.patient_name}</h4>
        <StatusBadge status={submission.status} />
      </div>
      <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>{submission.form_name}</p>
      <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Soumis le {formatDate(submission.created_at)}</p>
      
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', flexWrap: 'wrap' }}>
        {currentUserRole !== 'COORDINATEUR' && (
          <button
            onClick={() => onViewDetails && onViewDetails(submission)}
            className={`medical-case-btn medical-case-btn--details ${isActive ? 'medical-case-btn--details-active' : ''}`}
            title="Voir les détails du formulaire"
          >
            <ClipboardList size={14} /> Détails
          </button>
        )}
        <button
          onClick={() => navigate(`/patients/${submission.patient_id}`)}
          className="medical-case-btn medical-case-btn--view"
          title="Voir le dossier patient"
        >
          <ExternalLink size={14} /> Voir
        </button>
        <button
          onClick={() => onRemove(submission.id)}
          className="medical-case-btn medical-case-btn--remove"
          title="Retirer de la réunion"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
