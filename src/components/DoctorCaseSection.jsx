import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import MedicalCaseCard from './MedicalCaseCard';

export default function DoctorCaseSection({ doctorName, hospital, cases, onRemoveCase, onViewDetails, activeDetailId, currentUserRole }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div style={{ marginBottom: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          backgroundColor: 'white',
          border: 'none',
          borderBottom: isOpen ? '1px solid #e2e8f0' : 'none',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>👨‍⚕️ {doctorName}</h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>{hospital} • {cases.length} dossier{cases.length > 1 ? 's' : ''}</p>
        </div>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {isOpen && (
        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
          {Array.from(
            cases.reduce((map, sub) => {
              if (!map.has(sub.patient_id)) {
                map.set(sub.patient_id, { ...sub, cases_count: 1 });
              } else {
                map.get(sub.patient_id).cases_count += 1;
              }
              return map;
            }, new Map()).values()
          ).map(grouped => (
            <MedicalCaseCard
              key={grouped.patient_id}
              submission={{
                id: grouped.id,
                patient_id: grouped.patient_id,
                patient_name: grouped.patient_name,
                form_name: `${grouped.cases_count} dossier${grouped.cases_count > 1 ? 's' : ''} médical${grouped.cases_count > 1 ? 'aux' : ''}`,
                status: grouped.status,
                created_at: grouped.created_at
              }}
              onRemove={onRemoveCase}
              onViewDetails={onViewDetails}
              activeDetailId={activeDetailId}
              currentUserRole={currentUserRole}
            />
          ))}
        </div>
      )}
    </div>
  );
}

