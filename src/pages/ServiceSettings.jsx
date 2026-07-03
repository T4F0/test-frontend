import { useEffect, useRef, useState } from 'react'
import { getServices, updateServiceHeader, updateServiceParticipants } from '../api/authApi'
import { resolveApiUrl } from '../api/config'
import { useAuth } from '../context/AuthContext'
import {
  Settings, Upload, Trash2, Users, Plus, X, ChevronDown,
  ChevronUp, Check, Image as ImageIcon, ToggleLeft, ToggleRight,
  GripVertical,
} from 'lucide-react'

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ServiceNavItem({ service, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '0.7rem 1rem',
        borderRadius: '8px',
        border: 'none',
        background: active ? '#eff6ff' : 'transparent',
        color: active ? '#1d4ed8' : '#374151',
        fontWeight: active ? '600' : '400',
        fontSize: '0.9rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {/* Colored avatar */}
      <span style={{
        width: '30px', height: '30px', borderRadius: '7px',
        background: active ? '#2563eb' : '#e5e7eb',
        color: active ? '#fff' : '#6b7280',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.7rem', fontWeight: '700', flexShrink: 0,
      }}>
        {initials(service.name) || '?'}
      </span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {service.name}
      </span>
      {!service.is_active && (
        <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#b91c1c', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
          Inactif
        </span>
      )}
    </button>
  )
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb',
      overflow: 'hidden', marginBottom: '1.5rem',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9',
        background: '#f8fafc',
      }}>
        {Icon && <Icon size={18} style={{ color: '#2563eb', flexShrink: 0 }} />}
        <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#0f172a' }}>{title}</span>
      </div>
      <div style={{ padding: '1.25rem' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Header Section ────────────────────────────────────────────────────────────

function HeaderSection({ service, onUpdated }) {
  const [pendingFile, setPendingFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  const headerUrl = service.report_header_image ? resolveApiUrl(service.report_header_image) : null

  const handleUpload = async () => {
    if (!pendingFile) return
    setSaving(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('report_header_image', pendingFile)
      const updated = await updateServiceHeader(service.id, fd)
      setPendingFile(null)
      if (fileRef.current) fileRef.current.value = ''
      onUpdated(updated)
    } catch { setError("Échec du téléversement.") }
    finally { setSaving(false) }
  }

  const handleRemove = async () => {
    setSaving(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('report_header_image', '')
      const updated = await updateServiceHeader(service.id, fd)
      onUpdated(updated)
    } catch { setError("Échec de la suppression.") }
    finally { setSaving(false) }
  }

  return (
    <SectionCard title="En-tête du rapport PDF" icon={ImageIcon}>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 0, marginBottom: '1rem' }}>
        Cette image apparaît en haut de tous les PDFs générés pour ce service.
        Format paysage large recommandé.
      </p>

      {/* Preview */}
      <div style={{
        width: '100%', height: '100px', border: '1.5px dashed #cbd5e1', borderRadius: '8px',
        background: '#f8fafc', overflow: 'hidden', display: 'flex',
        alignItems: 'center', justifyContent: 'center', marginBottom: '1rem',
      }}>
        {headerUrl
          ? <img src={headerUrl} alt="En-tête" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Aucune image — en-tête par défaut</span>}
      </div>

      {error && <div className="error" style={{ marginBottom: '0.75rem' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={e => setPendingFile(e.target.files?.[0] || null)}
          disabled={saving}
          style={{ fontSize: '0.85rem', flex: '1 1 auto', minWidth: '200px' }}
        />
        <button
          onClick={handleUpload}
          disabled={saving || !pendingFile}
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', opacity: (saving || !pendingFile) ? 0.6 : 1 }}
        >
          <Upload size={15} />
          {saving ? 'Enregistrement...' : 'Téléverser'}
        </button>
        {headerUrl && (
          <button onClick={handleRemove} disabled={saving} className="btn-small btn-danger"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Trash2 size={14} /> Supprimer
          </button>
        )}
      </div>
    </SectionCard>
  )
}

// ─── Participants Section ──────────────────────────────────────────────────────

function ParticipantsSection({ service, onUpdated }) {
  // groups: [{title: str, members: [str]}]
  const [groups, setGroups] = useState(() => service.participants_config || [])
  const [includeInReport, setIncludeInReport] = useState(service.include_participants_in_report !== false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  // Sync when switching services
  useEffect(() => {
    setGroups(service.participants_config || [])
    setIncludeInReport(service.include_participants_in_report !== false)
    setSaved(false)
    setError(null)
  }, [service.id])

  // ── group helpers ──
  const addGroup = () => setGroups(g => [...g, { title: '', members: [] }])
  const removeGroup = (gi) => setGroups(g => g.filter((_, i) => i !== gi))
  const updateGroupTitle = (gi, title) => setGroups(g => g.map((grp, i) => i === gi ? { ...grp, title } : grp))

  // ── member helpers ──
  const addMember = (gi) => setGroups(g => g.map((grp, i) => i === gi ? { ...grp, members: [...grp.members, ''] } : grp))
  const removeMember = (gi, mi) => setGroups(g => g.map((grp, i) => i === gi ? { ...grp, members: grp.members.filter((_, j) => j !== mi) } : grp))
  const updateMember = (gi, mi, val) => setGroups(g => g.map((grp, i) => i === gi
    ? { ...grp, members: grp.members.map((m, j) => j === mi ? val : m) }
    : grp))

  const handleSave = async () => {
    setSaving(true); setError(null); setSaved(false)
    // Clean up empty members
    const cleaned = groups
      .map(grp => ({ ...grp, members: grp.members.filter(m => m.trim() !== '') }))
      .filter(grp => grp.title.trim() !== '' || grp.members.length > 0)
    try {
      const updated = await updateServiceParticipants(service.id, {
        participants_config: cleaned,
        include_participants_in_report: includeInReport,
      })
      setGroups(updated.participants_config || [])
      setIncludeInReport(updated.include_participants_in_report !== false)
      onUpdated(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { setError("Échec de l'enregistrement des participants.") }
    finally { setSaving(false) }
  }

  return (
    <SectionCard title="Participants dans le rapport" icon={Users}>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 0, marginBottom: '1rem' }}>
        Définissez la liste des participants affichée dans la marge gauche du PDF.
        Vous pouvez organiser les participants par groupes ou sans groupes.
      </p>

      {/* Toggle: include or not */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        marginBottom: '1.25rem', padding: '0.75rem 1rem',
        background: includeInReport ? '#f0fdf4' : '#fafafa',
        border: `1px solid ${includeInReport ? '#86efac' : '#e5e7eb'}`,
        borderRadius: '8px', cursor: 'pointer',
        transition: 'background 0.2s, border-color 0.2s',
      }}
        onClick={() => setIncludeInReport(v => !v)}
      >
        {includeInReport
          ? <ToggleRight size={24} style={{ color: '#16a34a', flexShrink: 0 }} />
          : <ToggleLeft size={24} style={{ color: '#9ca3af', flexShrink: 0 }} />}
        <div>
          <div style={{ fontWeight: '600', fontSize: '0.9rem', color: includeInReport ? '#15803d' : '#374151' }}>
            {includeInReport ? 'Liste des participants incluse dans le rapport' : 'Liste des participants exclue du rapport'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '1px' }}>
            Cliquez pour {includeInReport ? 'masquer' : 'afficher'} les participants dans les PDFs générés
          </div>
        </div>
      </div>

      {/* Groups editor — only shown when participants are included */}
      {includeInReport && (
        <>
          {groups.length === 0 && (
            <div style={{
              padding: '1.5rem', textAlign: 'center', border: '1.5px dashed #cbd5e1',
              borderRadius: '8px', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem',
            }}>
              Aucun groupe défini. Cliquez sur « Ajouter un groupe » pour commencer,
              ou laissez vide pour utiliser la configuration par défaut du serveur.
            </div>
          )}

          {groups.map((group, gi) => (
            <GroupEditor
              key={gi}
              group={group}
              index={gi}
              total={groups.length}
              onTitleChange={(t) => updateGroupTitle(gi, t)}
              onAddMember={() => addMember(gi)}
              onRemoveMember={(mi) => removeMember(gi, mi)}
              onMemberChange={(mi, v) => updateMember(gi, mi, v)}
              onRemoveGroup={() => removeGroup(gi)}
            />
          ))}

          <button
            onClick={addGroup}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 1rem', borderRadius: '7px', border: '1.5px dashed #93c5fd',
              background: '#eff6ff', color: '#2563eb', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: '500', marginBottom: '1rem',
            }}
          >
            <Plus size={15} /> Ajouter un groupe
          </button>
        </>
      )}

      {error && <div className="error" style={{ marginBottom: '0.75rem' }}>{error}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer les participants'}
        </button>
        {saved && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#16a34a', fontSize: '0.875rem', fontWeight: '500' }}>
            <Check size={15} /> Enregistré
          </span>
        )}
      </div>
    </SectionCard>
  )
}

function GroupEditor({ group, index, total, onTitleChange, onAddMember, onRemoveMember, onMemberChange, onRemoveGroup }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: '10px', marginBottom: '0.75rem',
      overflow: 'hidden', background: '#fff',
    }}>
      {/* Group header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.65rem 0.85rem', background: '#f8fafc', borderBottom: collapsed ? 'none' : '1px solid #f1f5f9',
      }}>
        <GripVertical size={15} style={{ color: '#cbd5e1', flexShrink: 0 }} />
        <input
          type="text"
          value={group.title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder={`Nom du groupe ${index + 1} (ex: L'équipe d'urologie)`}
          style={{
            flex: 1, border: 'none', background: 'transparent', fontSize: '0.875rem',
            fontWeight: '600', color: '#1e293b', outline: 'none',
          }}
        />
        <span style={{
          fontSize: '0.72rem', background: '#e0e7ff', color: '#3730a3',
          padding: '1px 7px', borderRadius: '10px', fontWeight: '600',
        }}>
          {group.members.length} membre{group.members.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? 'Développer' : 'Réduire'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px', display: 'flex' }}
        >
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        <button
          onClick={onRemoveGroup}
          title="Supprimer ce groupe"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px', display: 'flex' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Members */}
      {!collapsed && (
        <div style={{ padding: '0.75rem' }}>
          {group.members.length === 0 && (
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 0.5rem', fontStyle: 'italic' }}>
              Aucun membre. Cliquez sur « + Ajouter » pour en ajouter.
            </p>
          )}
          {group.members.map((member, mi) => (
            <div key={mi} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span style={{
                width: '24px', height: '24px', background: '#f1f5f9', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', color: '#64748b', fontWeight: '600', flexShrink: 0,
              }}>
                {mi + 1}
              </span>
              <input
                type="text"
                value={member}
                onChange={e => onMemberChange(mi, e.target.value)}
                placeholder="Nom du participant (ex: Dr M. DUPONT)"
                style={{
                  flex: 1, padding: '0.35rem 0.65rem', borderRadius: '6px',
                  border: '1px solid #e5e7eb', fontSize: '0.85rem', color: '#1e293b',
                }}
              />
              <button
                onClick={() => onRemoveMember(mi)}
                title="Retirer ce membre"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px', display: 'flex', flexShrink: 0 }}
              >
                <X size={15} />
              </button>
            </div>
          ))}
          <button
            onClick={onAddMember}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              marginTop: '0.25rem', background: 'none', border: 'none',
              color: '#2563eb', fontSize: '0.8rem', cursor: 'pointer', padding: '2px 0',
            }}
          >
            <Plus size={13} /> Ajouter un membre
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ServiceSettings() {
  const { user: currentUser } = useAuth()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => { loadServices() }, [])

  const loadServices = async () => {
    setLoading(true); setError(null)
    try {
      const data = await getServices()
      setServices(data)
      if (data.length > 0) setSelectedId(prev => prev || data[0].id)
    } catch { setError('Impossible de charger les services.') }
    finally { setLoading(false) }
  }

  const handleUpdated = (updated) => {
    setServices(prev => prev.map(s => s.id === updated.id ? updated : s))
  }

  if (!currentUser?.is_global_admin) {
    return (
      <div className="empty" style={{ padding: '2rem' }}>
        Accès réservé aux administrateurs globaux.
      </div>
    )
  }

  const selectedService = services.find(s => s.id === selectedId) || null

  return (
    <div style={{
      display: 'flex', minHeight: 'calc(100vh - 64px)',
      margin: '0 -24px', /* cancel container padding */
      gap: 0, background: '#fff',
    }}>

      {/* ── Side navbar ── */}
      <div style={{
        width: '240px', flexShrink: 0, borderRight: '1px solid #e5e7eb',
        padding: '1.5rem 0.85rem', background: '#f8fafc',
        position: 'sticky', top: '64px', height: 'calc(100vh - 64px)', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', paddingLeft: '0.25rem' }}>
          <Settings size={16} style={{ color: '#2563eb' }} />
          <span style={{ fontWeight: '700', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Services
          </span>
        </div>

        {loading && <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '0.5rem' }}>Chargement...</div>}
        {!loading && services.length === 0 && (
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '0.5rem' }}>Aucun service.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {services.map(s => (
            <ServiceNavItem
              key={s.id}
              service={s}
              active={s.id === selectedId}
              onClick={() => setSelectedId(s.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Main panel ── */}
      <div style={{ flex: 1, padding: '2rem 2.25rem', overflowY: 'auto' }}>
        {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {!selectedService && !loading && (
          <div className="empty">Sélectionnez un service dans le panneau de gauche.</div>
        )}

        {selectedService && (
          <>
            {/* Service title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: '700', fontSize: '1rem', flexShrink: 0,
              }}>
                {initials(selectedService.name) || '?'}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                  {selectedService.name}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '3px' }}>
                  <code style={{ fontSize: '0.78rem', color: '#64748b' }}>{selectedService.slug}</code>
                  <span style={{
                    fontSize: '0.7rem', padding: '1px 7px', borderRadius: '4px', fontWeight: '600',
                    background: selectedService.is_active ? '#dcfce7' : '#fee2e2',
                    color: selectedService.is_active ? '#15803d' : '#b91c1c',
                  }}>
                    {selectedService.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
            </div>

            <HeaderSection service={selectedService} onUpdated={handleUpdated} />
            <ParticipantsSection service={selectedService} onUpdated={handleUpdated} />
          </>
        )}
      </div>
    </div>
  )
}