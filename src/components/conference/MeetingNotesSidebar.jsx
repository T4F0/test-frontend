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
        idle: 'All changes saved',
        unsaved: 'Changes pending autosave',
        saving: 'Saving notes…',
        error: 'Autosave failed',
    }[saveStatus] || 'All changes saved'

    return (
        <div className="sidebar notes-sidebar">
            <div className="sidebar-header">
                <h3>
                    <FileText size={18} />
                    Meeting Notes (PV)
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
                    placeholder={canEdit ? 'Write the meeting report here…' : 'Meeting notes will appear here.'}
                    readOnly={!canEdit}
                />

                <div className="notes-meta">
                    {updatedAt ? (
                        <span>
                            Last saved {new Date(updatedAt).toLocaleTimeString()}
                            {updatedByName ? ` by ${updatedByName}` : ''}
                        </span>
                    ) : (
                        <span>{canEdit ? 'Autosave is enabled while you type.' : 'Read-only for invited participants.'}</span>
                    )}
                </div>
            </div>
        </div>
    )
}
