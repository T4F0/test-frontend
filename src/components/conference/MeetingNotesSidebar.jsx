import { FileText, Save } from 'lucide-react'

export default function MeetingNotesSidebar({
    isOpen,
    onToggle,
    notes,
    onChange,
    canEdit,
    saveStatus,
    updatedAt,
    updatedByName,
}) {
    if (!isOpen) return null

    const statusLabel = {
        idle: 'Tous les changements enregistrés',
        unsaved: 'Changements en attente d\'enregistrement automatique',
        saving: 'Enregistrement des notes…',
        error: 'Échec de l\'enregistrement automatique',
    }[saveStatus] || 'Tous les changements enregistrés'

    return (
        <div className="sidebar notes-sidebar">
            <div className="sidebar-header">
                <h3>
                    <FileText size={18} />
                    Notes de réunion (PV)
                </h3>
                <button className="sidebar-close" onClick={onToggle}>×</button>
            </div>
            <div className="sidebar-content notes-content">
                <div className={`notes-save-status ${saveStatus}`}>
                    <Save size={14} />
                    <span>{statusLabel}</span>
                </div>

                <textarea
                    className="notes-editor"
                    value={notes}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={canEdit ? 'Écrivez le compte-rendu de la réunion ici…' : 'Les notes de réunion apparaîtront ici.'}
                    readOnly={!canEdit}
                />

                <div className="notes-meta">
                    {updatedAt ? (
                        <span>
                            Dernier enregistrement à {new Date(updatedAt).toLocaleTimeString()}
                            {updatedByName ? ` par ${updatedByName}` : ''}
                        </span>
                    ) : (
                        <span>{canEdit ? 'L\'enregistrement automatique est activé pendant la saisie.' : 'Lecture seule pour les participants invités.'}</span>
                    )}
                </div>
            </div>
        </div>
    )
}
