import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCurrentUser, getUser, getServices, updateUser, updateProfilePicture, removeProfilePicture, changePassword } from '../api/authApi'
import { useAuth } from '../context/AuthContext'
import UserAvatar from '../components/UserAvatar'
import { ALGERIA_WILAYAS } from '../lib/constants'
import { validatePhoneNumber } from '../lib/validators'
import {
  User, Mail, Phone, MapPin, Activity, Lock, Edit3, Save, X,
  CheckCircle2, AlertCircle, Shield, ChevronRight, Building2, BadgeCheck, Camera, Trash2,
  ZoomIn, ZoomOut, RotateCcw, Check
} from 'lucide-react'

const ROLE_LABELS = {
  MEDECIN: 'Médecin traitant',
  MEDECIN_EXPERT: 'Médecin expert',
  COORDINATEUR: 'Coordinateur',
  ADMIN: 'Administrateur'
}

const ROLE_COLORS = {
  MEDECIN:        { bg: '#ecfdf5', color: '#059669', border: '#6ee7b7' },
  MEDECIN_EXPERT: { bg: '#f5f3ff', color: '#7c3aed', border: '#a78bfa' },
  COORDINATEUR:   { bg: '#fffbeb', color: '#d97706', border: '#fcd34d' },
  ADMIN:          { bg: '#eef2ff', color: '#4f46e5', border: '#a5b4fc' }
}

const TABS = [
  { id: 'info',     label: 'Informations',     icon: User },
  { id: 'password', label: 'Mot de passe',     icon: Lock },
]

/* ── Shared style objects (must be declared before components that use them) ── */
const zoomBtnStyle = {
  width: 34, height: 34, borderRadius: 8,
  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
  color: 'white', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, padding: 0, lineHeight: 1,
}

/* ── Image Crop Modal ──────────────────────────────────────── */
function ImageCropModal({ imageSrc, onConfirm, onCancel }) {
  const canvasRef        = useRef(null)
  const containerRef     = useRef(null)
  const [scale, setScale]       = useState(1)
  const [offset, setOffset]     = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const imgRef = useRef(null)

  // Load image
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setScale(1)
      setOffset({ x: 0, y: 0 })
    }
    img.src = imageSrc
  }, [imageSrc])

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const img    = imgRef.current
    if (!canvas || !img) return

    const SIZE = 320
    canvas.width  = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, SIZE, SIZE)

    // Clip to circle
    ctx.save()
    ctx.beginPath()
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2)
    ctx.clip()

    // Draw scaled + offset image centred in canvas
    const scaledW = img.naturalWidth  * scale
    const scaledH = img.naturalHeight * scale
    const drawX   = (SIZE - scaledW) / 2 + offset.x
    const drawY   = (SIZE - scaledH) / 2 + offset.y
    ctx.drawImage(img, drawX, drawY, scaledW, scaledH)
    ctx.restore()

    // Overlay ring to show crop boundary
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth   = 2
    ctx.beginPath()
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2)
    ctx.stroke()
  }, [scale, offset, imageSrc])

  const handleMouseDown = (e) => {
    setDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }
  const handleMouseMove = useCallback((e) => {
    if (!dragging) return
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }, [dragging, dragStart])
  const handleMouseUp = () => setDragging(false)

  const handleTouchStart = (e) => {
    const t = e.touches[0]
    setDragging(true)
    setDragStart({ x: t.clientX - offset.x, y: t.clientY - offset.y })
  }
  const handleTouchMove = useCallback((e) => {
    if (!dragging) return
    const t = e.touches[0]
    setOffset({ x: t.clientX - dragStart.x, y: t.clientY - dragStart.y })
  }, [dragging, dragStart])

  const handleConfirm = () => {
    const canvas  = canvasRef.current
    const img     = imgRef.current
    if (!canvas || !img) return

    // Render at high-res (512×512)
    const OUT = 512
    const out  = document.createElement('canvas')
    out.width  = OUT
    out.height = OUT
    const ctx  = out.getContext('2d')
    ctx.save()
    ctx.beginPath()
    ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2)
    ctx.clip()

    const ratio   = OUT / 320
    const scaledW = img.naturalWidth  * scale * ratio
    const scaledH = img.naturalHeight * scale * ratio
    const drawX   = (OUT - scaledW) / 2 + offset.x * ratio
    const drawY   = (OUT - scaledH) / 2 + offset.y * ratio
    ctx.drawImage(img, drawX, drawY, scaledW, scaledH)
    ctx.restore()

    out.toBlob((blob) => {
      if (blob) onConfirm(blob)
    }, 'image/jpeg', 0.92)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        background: '#1a1a2e', borderRadius: 20, padding: '2rem',
        maxWidth: 420, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h3 style={{ color: 'white', margin: '0 0 0.4rem', fontWeight: 700, fontSize: '1.2rem' }}>
          Recadrer la photo
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 1.5rem', fontSize: '0.85rem' }}>
          Glissez pour repositionner · Format 1×1
        </p>

        {/* Canvas */}
        <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <canvas
            ref={canvasRef}
            width={320}
            height={320}
            style={{
              borderRadius: '50%',
              cursor: dragging ? 'grabbing' : 'grab',
              border: '3px solid rgba(255,255,255,0.2)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              touchAction: 'none',
              display: 'block'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          />
        </div>

        {/* Zoom controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
            style={zoomBtnStyle}
            title="Dézoomer"
          >
            <ZoomOut size={16} color="white" />
          </button>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.05"
            value={scale}
            onChange={e => setScale(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: '#0066cc' }}
          />
          <button
            type="button"
            onClick={() => setScale(s => Math.min(3, s + 0.1))}
            style={zoomBtnStyle}
            title="Zoomer"
          >
            <ZoomIn size={16} color="white" />
          </button>
          <button
            type="button"
            onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }}
            style={zoomBtnStyle}
            title="Réinitialiser"
          >
            <RotateCcw size={14} color="white" />
          </button>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1, padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 12, background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: '0.9rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
            }}
          >
            <X size={16} color="rgba(255,255,255,0.8)" /> Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              flex: 1, padding: '0.75rem', border: 'none',
              borderRadius: 12, background: 'linear-gradient(135deg, #0066cc, #0052a3)',
              color: 'white', fontWeight: 700, fontSize: '0.9rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              boxShadow: '0 4px 16px rgba(0,102,204,0.4)'
            }}
          >
            <Check size={16} color="white" /> Confirmer
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Component ──────────────────────────────────────── */
export default function UserProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser, setUser: setAuthUser } = useAuth()

  // Use loose equality: URL param `id` is always a string, currentUser.id may be a UUID string or number
  const isOwnProfile = currentUser?.id != null && String(currentUser.id) === String(id)
  const canAdminEdit = ['ADMIN', 'COORDINATEUR'].includes(currentUser?.role)

  /* ── Data ─────────────────────────────────────────────── */
  const [user, setUser]               = useState(null)
  const [serviceName, setServiceName] = useState('')
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [activeTab, setActiveTab]     = useState('info')

  /* ── Edit-info state ──────────────────────────────────── */
  const [editing, setEditing]         = useState(false)
  const [editData, setEditData]       = useState({})
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError]     = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(null)

  /* ── Change-password state ────────────────────────────── */
  const [oldPassword, setOldPassword]             = useState('')
  const [newPassword, setNewPassword]             = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [pwdLoading, setPwdLoading]               = useState(false)
  const [pwdError, setPwdError]                   = useState(null)
  const [pwdSuccess, setPwdSuccess]               = useState(null)
  const [showOld, setShowOld]                     = useState(false)
  const [showNew, setShowNew]                     = useState(false)
  const [showConfirm, setShowConfirm]             = useState(false)

  /* ── Profile picture state ────────────────────────────── */
  const [pictureLoading, setPictureLoading] = useState(false)
  const [cropSrc, setCropSrc]               = useState(null)   // data-URL for crop modal
  const pictureInputRef = useRef(null)

  /* ── Fetch ────────────────────────────────────────────── */
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true)

        // When viewing own profile, use /users/me/ to bypass queryset filtering
        // that would cause 403 for Medecin users who may not have a service.
        const isSelf = currentUser?.id != null && String(currentUser.id) === String(id)
        const found = isSelf ? await getCurrentUser() : await getUser(id)

        if (found) {
          setUser(found)
          setEditData({
            first_name:   found.first_name  || '',
            last_name:    found.last_name   || '',
            email:        found.email       || '',
            phone_number: found.phone_number|| '+213',
            hospital:     found.hospital    || '',
          })
          if (found.service) {
            try {
              const svcs = await getServices()
              const arr  = Array.isArray(svcs) ? svcs : (svcs?.results || [])
              const svc  = arr.find(s => s.id === found.service || s.id === parseInt(found.service))
              if (svc) setServiceName(svc.name)
            } catch (_) {}
          }
        } else {
          setError('Utilisateur introuvable')
        }
      } catch (err) {
        setError('Échec du chargement du profil')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [id, currentUser?.id])

  /* ── Save info ────────────────────────────────────────── */
  const handleSaveInfo = async (e) => {
    e.preventDefault()

    const payload = { ...editData }
    if (payload.phone_number === '+213' || !payload.phone_number) {
      payload.phone_number = ''
    } else if (!validatePhoneNumber(payload.phone_number)) {
      setSaveError('Le numéro de téléphone doit commencer par +213 suivi de 9 chiffres.')
      return
    }

    try {
      setSaveLoading(true)
      setSaveError(null)
      setSaveSuccess(null)
      const updated = await updateUser(id, payload)
      setUser(prev => ({ ...prev, ...updated }))
      if (isOwnProfile) setAuthUser({ ...currentUser, ...updated })
      setSaveSuccess('Profil mis à jour avec succès.')
      setEditing(false)
    } catch (err) {
      const data = err.response?.data
      if (typeof data === 'object') {
        const msgs = Object.entries(data)
          .map(([f, m]) => `${f}: ${Array.isArray(m) ? m.join(', ') : m}`)
          .join('\n')
        setSaveError(msgs || 'Échec de la mise à jour')
      } else {
        setSaveError(data?.detail || 'Échec de la mise à jour du profil')
      }
    } finally {
      setSaveLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditing(false)
    setSaveError(null)
    setSaveSuccess(null)
    setEditData({
      first_name:   user.first_name   || '',
      last_name:    user.last_name    || '',
      email:        user.email        || '',
      phone_number: user.phone_number || '+213',
      hospital:     user.hospital     || '',
    })
  }

  /* ── Change password ──────────────────────────────────── */
  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmNewPassword) {
      setPwdError('Les nouveaux mots de passe ne correspondent pas')
      return
    }
    if (newPassword.length < 6) {
      setPwdError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    try {
      setPwdLoading(true)
      setPwdError(null)
      setPwdSuccess(null)
      await changePassword(oldPassword, newPassword)
      setPwdSuccess('Votre mot de passe a été modifié avec succès.')
      setOldPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (err) {
      const data = err.response?.data
      setPwdError(
        data?.old_password?.[0] ||
        data?.new_password?.[0] ||
        data?.detail ||
        'Échec de la modification du mot de passe'
      )
    } finally {
      setPwdLoading(false)
    }
  }

  /* ── Profile picture handlers ─────────────────────────── */

  // Step 1: user picks a file → open crop modal
  const handleFileSelected = (e) => {
    const file = e.target.files?.[0]
    // Reset input so the same file can be re-selected after cancelling
    e.target.value = ''
    if (!file) return

    const accepted = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!accepted.includes(file.type)) {
      setSaveError('Format d\'image non supporté. Utilisez JPEG, PNG, WebP ou GIF.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveError('L\'image ne doit pas dépasser 5 Mo.')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => setCropSrc(ev.target.result)
    reader.readAsDataURL(file)
  }

  // Step 2: user confirms crop → upload the blob
  const handleCropConfirm = async (blob) => {
    setCropSrc(null)
    try {
      setPictureLoading(true)
      setSaveError(null)
      const fd = new FormData()
      fd.append('profile_picture', blob, 'profile.jpg')
      const updated = await updateProfilePicture(id, fd)
      setUser(prev => ({ ...prev, ...updated }))
      if (isOwnProfile) setAuthUser({ ...currentUser, ...updated })
      setSaveSuccess('Photo de profil mise à jour.')
    } catch (err) {
      setSaveError('Échec du téléchargement de la photo.')
    } finally {
      setPictureLoading(false)
    }
  }

  const handleCropCancel = () => {
    setCropSrc(null)
  }

  const handleRemovePicture = async () => {
    try {
      setPictureLoading(true)
      setSaveError(null)
      const updated = await removeProfilePicture(id)
      setUser(prev => ({ ...prev, ...updated }))
      if (isOwnProfile) setAuthUser({ ...currentUser, ...updated })
      setSaveSuccess('Photo de profil supprimée.')
    } catch (err) {
      setSaveError('Échec de la suppression de la photo.')
    } finally {
      setPictureLoading(false)
    }
  }

  /* ── Render guards ────────────────────────────────────── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--gray-500)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--gray-200)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
        <p>Chargement du profil...</p>
      </div>
    </div>
  )
  if (error)  return <div className="error">{error}</div>
  if (!user)  return <div className="error">Utilisateur introuvable</div>

  const fullName   = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username
  const roleStyle  = ROLE_COLORS[user.role] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' }
  const canEdit    = isOwnProfile || canAdminEdit

  /* ─────────────────────────────────────────────────────── */
  return (
    <div className="profile-container" style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>

      {/* ── Crop Modal ──────────────────────────────────── */}
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      {/* ── Hero Header ────────────────────────────────── */}
      <div className="profile-hero" style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, #0052a3) 100%)',
        borderRadius: 20, padding: '2.5rem', marginBottom: '2rem',
        display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap',
        boxShadow: '0 8px 32px rgba(0,102,204,0.25)'
      }}>
        {/* Avatar */}
        <div style={{ position: 'relative' }}>
          {pictureLoading ? (
            <div style={{
              width: 96, height: 96, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: '3px solid rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{ width: 28, height: 28, border: '2px solid rgba(255,255,255,0.6)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <UserAvatar
              user={user}
              size={96}
              style={{
                border: '3px solid rgba(255,255,255,0.4)',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontSize: '2.2rem',
                letterSpacing: '-1px',
                backdropFilter: 'blur(10px)',
              }}
            />
          )}
          <input
            ref={pictureInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={handleFileSelected}
          />
          {canEdit && (
            <button
              onClick={() => pictureInputRef.current?.click()}
              title="Changer la photo"
              disabled={pictureLoading}
              style={{
                position: 'absolute', bottom: 0, right: -4,
                width: 32, height: 32, borderRadius: '50%',
                background: '#ffffff',
                border: '2.5px solid var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: pictureLoading ? 'not-allowed' : 'pointer',
                color: 'var(--primary)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                padding: 0,
                lineHeight: 1,
              }}
            >
              <Camera size={14} strokeWidth={2.5} />
            </button>
          )}
          {canEdit && user?.profile_picture && (
            <button
              onClick={handleRemovePicture}
              title="Supprimer la photo"
              disabled={pictureLoading}
              style={{
                position: 'absolute', bottom: 0, left: -4,
                width: 32, height: 32, borderRadius: '50%',
                background: '#ffffff',
                border: '2.5px solid #dc2626',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: pictureLoading ? 'not-allowed' : 'pointer',
                color: '#dc2626',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                padding: 0,
                lineHeight: 1,
              }}
            >
              <Trash2 size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="profile-hero-name-row" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ color: 'white', fontSize: '1.9rem', fontWeight: 800, margin: 0 }}>{fullName}</h1>
            {user.approval_status === 'APPROVED' && (
              <BadgeCheck size={22} color="rgba(255,255,255,0.8)" title="Compte approuvé" />
            )}
          </div>
          <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              background: 'rgba(255,255,255,0.18)', color: 'white',
              padding: '0.3rem 0.9rem', borderRadius: 20, fontSize: '0.8rem',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
              border: '1px solid rgba(255,255,255,0.3)'
            }}>
              {ROLE_LABELS[user.role] || user.role}
            </span>
            {serviceName && currentUser?.is_global_admin && (
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Building2 size={15} /> {serviceName}
              </span>
            )}
          </div>
          <p className="profile-hero-email" style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.88rem', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Mail size={14} /> {user.email || 'Aucun email'}
          </p>
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.15)', color: 'white',
            border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10,
            padding: '0.6rem 1.2rem', cursor: 'pointer', fontWeight: 600,
            fontSize: '0.9rem', backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '0.4rem'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
        >
          ← Retour
        </button>
      </div>

      {/* ── Tabs ───────────────────────────────────────── */}
      {/* Only show password tab for own profile */}
      {(() => {
        const tabs = isOwnProfile ? TABS : [TABS[0]]
        return (
          <div style={{
            display: 'flex', gap: 0, marginBottom: '1.5rem',
            background: 'white', borderRadius: 14, padding: '0.4rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid var(--gray-200)'
          }}>
            {tabs.map(tab => {
              const Icon   = tab.icon
              const active = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  flex: 1, padding: '0.7rem 1rem', border: 'none', cursor: 'pointer',
                  borderRadius: 10, fontWeight: 600, fontSize: '0.9rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'all 0.2s ease',
                  background: active ? 'var(--primary)' : 'transparent',
                  color: active ? 'white' : 'var(--gray-500)',
                  boxShadow: active ? '0 4px 12px rgba(0,102,204,0.25)' : 'none'
                }}>
                  <Icon size={17} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        )
      })()}

      {/* ── Tab: Informations ──────────────────────────── */}
      {activeTab === 'info' && (
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid var(--gray-200)', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

          {/* Card header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '1.5rem 2rem', borderBottom: '1px solid var(--gray-100)',
            background: 'linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={18} color="white" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)' }}>Informations personnelles</h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                  {editing ? 'Modifiez vos informations ci-dessous' : 'Vos informations de profil'}
                </p>
              </div>
            </div>
            {canEdit && !editing && (
              <button onClick={() => { setEditing(true); setSaveSuccess(null); setSaveError(null) }} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.55rem 1.2rem', borderRadius: 10, border: '1.5px solid var(--primary)',
                background: 'white', color: 'var(--primary)', fontWeight: 600, fontSize: '0.88rem',
                cursor: 'pointer', transition: 'all 0.2s ease'
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--primary)' }}>
                <Edit3 size={15} /> Modifier
              </button>
            )}
          </div>

          {/* Success/Error banners */}
          {saveSuccess && (
            <div style={{ margin: '1.25rem 2rem 0', padding: '0.85rem 1rem', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
              <CheckCircle2 size={18} /> {saveSuccess}
            </div>
          )}
          {saveError && (
            <div style={{ margin: '1.25rem 2rem 0', padding: '0.85rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, color: '#991b1b', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'pre-line' }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} /> {saveError}
            </div>
          )}

          {/* Content */}
          <div className="profile-info-content" style={{ padding: '2rem' }}>
            {editing ? (
              /* ── Edit form ── */
              <form onSubmit={handleSaveInfo}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                  <FormField label="Prénom" icon={<User size={16} />}>
                    <input
                      type="text"
                      value={editData.first_name}
                      onChange={e => setEditData(p => ({ ...p, first_name: e.target.value }))}
                      placeholder="Prénom"
                      style={inputStyle}
                      required
                    />
                  </FormField>
                  <FormField label="Nom" icon={<User size={16} />}>
                    <input
                      type="text"
                      value={editData.last_name}
                      onChange={e => setEditData(p => ({ ...p, last_name: e.target.value }))}
                      placeholder="Nom de famille"
                      style={inputStyle}
                      required
                    />
                  </FormField>
                  <FormField label="Adresse e-mail" icon={<Mail size={16} />}>
                    <input
                      type="email"
                      value={editData.email}
                      onChange={e => setEditData(p => ({ ...p, email: e.target.value }))}
                      placeholder="email@hopital.dz"
                      style={inputStyle}
                      required
                    />
                  </FormField>
                   <FormField label="Numéro de téléphone" icon={<Phone size={16} />}>
                    <input
                      type="tel"
                      value={editData.phone_number || '+213'}
                      onChange={e => {
                        const val = e.target.value
                        setEditData(p => ({
                          ...p,
                          phone_number: !val.startsWith('+213') ? ('+213'.startsWith(val) ? '+213' : '+213' + val.replace(/^\+?2?1?3?/, '')) : val
                        }))
                      }}
                      placeholder="+213612345678"
                      style={inputStyle}
                    />
                  </FormField>
                  <FormField label="Hôpital / Wilaya" icon={<MapPin size={16} />} fullWidth>
                    <select
                      value={editData.hospital}
                      onChange={e => setEditData(p => ({ ...p, hospital: e.target.value }))}
                      style={{ ...inputStyle, background: 'white' }}
                    >
                      <option value="">Sélectionnez une wilaya</option>
                      {ALGERIA_WILAYAS.map((w, i) => (
                        <option key={i} value={w}>{w}</option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={handleCancelEdit} style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.7rem 1.4rem', border: '1px solid var(--gray-300)',
                    borderRadius: 10, background: 'white', color: 'var(--gray-700)',
                    fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer'
                  }}>
                    <X size={16} /> Annuler
                  </button>
                  <button type="submit" disabled={saveLoading} style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.7rem 1.6rem', border: 'none', borderRadius: 10,
                    background: saveLoading ? 'var(--gray-300)' : 'var(--primary)',
                    color: 'white', fontWeight: 700, fontSize: '0.9rem',
                    cursor: saveLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(0,102,204,0.25)'
                  }}>
                    <Save size={16} /> {saveLoading ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            ) : (
              /* ── View mode ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <InfoRow icon={<User size={17} />}        label="Nom complet"        value={fullName} />
                <InfoRow icon={<Mail size={17} />}        label="Adresse e-mail"     value={user.email} />
                <InfoRow icon={<Shield size={17} />}      label="Nom d'utilisateur"  value={user.username} readonly />
                <InfoRow icon={<Phone size={17} />}       label="Téléphone"          value={user.phone_number} />
                <InfoRow icon={<MapPin size={17} />}      label="Hôpital / Wilaya"   value={user.hospital} />
                {serviceName && currentUser?.is_global_admin && (
                  <InfoRow icon={<Building2 size={17} />} label="Service"            value={serviceName} readonly />
                )}
                <InfoRow icon={<Activity size={17} />} label="Rôle" readonly
                  value={
                    <span style={{
                      background: roleStyle.bg, color: roleStyle.color,
                      border: `1px solid ${roleStyle.border}`,
                      padding: '0.25rem 0.75rem', borderRadius: 20,
                      fontSize: '0.8rem', fontWeight: 700
                    }}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Mot de passe (own profile only) ─────── */}
      {activeTab === 'password' && isOwnProfile && (
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid var(--gray-200)', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

          {/* Card header */}
          <div style={{
            padding: '1.5rem 2rem', borderBottom: '1px solid var(--gray-100)',
            background: 'linear-gradient(135deg, #fdf8ff 0%, #f5f0ff 100%)',
            display: 'flex', alignItems: 'center', gap: '0.6rem'
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={18} color="white" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)' }}>Modifier le mot de passe</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-500)' }}>Choisissez un mot de passe sécurisé (minimum 6 caractères)</p>
            </div>
          </div>

          <div style={{ padding: '2rem', maxWidth: 480 }}>
            {pwdSuccess && (
              <div style={{ padding: '0.85rem 1rem', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500, marginBottom: '1.5rem' }}>
                <CheckCircle2 size={18} /> {pwdSuccess}
              </div>
            )}
            {pwdError && (
              <div style={{ padding: '0.85rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500, marginBottom: '1.5rem' }}>
                <AlertCircle size={18} /> {pwdError}
              </div>
            )}

            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <PasswordField
                label="Mot de passe actuel"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                show={showOld}
                onToggle={() => setShowOld(p => !p)}
                placeholder="Entrez votre mot de passe actuel"
                required
              />
              <PasswordField
                label="Nouveau mot de passe"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                show={showNew}
                onToggle={() => setShowNew(p => !p)}
                placeholder="Minimum 6 caractères"
                required
              />
              <PasswordField
                label="Confirmer le nouveau mot de passe"
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
                show={showConfirm}
                onToggle={() => setShowConfirm(p => !p)}
                placeholder="Confirmez le nouveau mot de passe"
                required
              />

              {/* Strength indicator */}
              {newPassword && (
                <PasswordStrength password={newPassword} />
              )}

              <button
                type="submit"
                disabled={pwdLoading}
                style={{
                  padding: '0.85rem', border: 'none', borderRadius: 10,
                  background: pwdLoading ? 'var(--gray-300)' : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                  color: 'white', fontWeight: 700, fontSize: '1rem',
                  cursor: pwdLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
                  transition: 'all 0.2s ease', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                }}
              >
                <Lock size={17} />
                {pwdLoading ? 'Modification en cours...' : 'Modifier le mot de passe'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────── */

function InfoRow({ icon, label, value, readonly = false }) {
  const empty = !value || value === ''
  return (
    <div className="profile-info-row" style={{
      display: 'flex', alignItems: 'flex-start', padding: '1rem 1.25rem',
      background: 'var(--gray-50)', borderRadius: 12,
      border: '1px solid var(--gray-100)', transition: 'all 0.2s ease',
      gap: '0.75rem', position: 'relative'
    }}
      onMouseEnter={e => { if (!readonly) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = '#f0f6ff' }}}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-100)'; e.currentTarget.style.background = 'var(--gray-50)' }}
    >
      <div style={{ color: 'var(--primary)', opacity: 0.7, flexShrink: 0, marginTop: 1 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
          {label}
        </div>
        <div style={{ fontWeight: 600, color: empty ? 'var(--gray-400)' : 'var(--gray-900)', fontSize: '0.97rem', fontStyle: empty ? 'italic' : 'normal', wordBreak: 'break-word' }}>
          {empty ? 'Non renseigné' : value}
        </div>
      </div>
      {readonly && (
        <span style={{ fontSize: '0.65rem', color: 'var(--gray-400)', background: 'var(--gray-200)', padding: '0.1rem 0.45rem', borderRadius: 5, fontWeight: 600, position: 'absolute', top: '0.4rem', right: '0.6rem' }}>
          Non modifiable
        </span>
      )}
    </div>
  )
}

function FormField({ label, icon, children, fullWidth }) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--gray-700)', fontSize: '0.88rem', marginBottom: '0.5rem' }}>
        <span style={{ color: 'var(--primary)' }}>{icon}</span>
        {label}
      </label>
      {children}
    </div>
  )
}

function PasswordField({ label, value, onChange, show, onToggle, placeholder, required }) {
  return (
    <div>
      <label style={{ display: 'block', fontWeight: 600, color: 'var(--gray-700)', fontSize: '0.88rem', marginBottom: '0.5rem' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          style={{ ...inputStyle, paddingRight: '3rem' }}
        />
        <button
          type="button"
          onClick={onToggle}
          style={{
            position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)',
            padding: '0.25rem', fontSize: '0.8rem', fontWeight: 600
          }}
        >
          {show ? '🙈' : '👁️'}
        </button>
      </div>
    </div>
  )
}

function PasswordStrength({ password }) {
  const calc = (p) => {
    let score = 0
    if (p.length >= 6)  score++
    if (p.length >= 10) score++
    if (/[A-Z]/.test(p)) score++
    if (/[0-9]/.test(p)) score++
    if (/[^A-Za-z0-9]/.test(p)) score++
    return score
  }
  const score = calc(password)
  const levels = [
    { label: 'Très faible', color: '#ef4444' },
    { label: 'Faible',      color: '#f97316' },
    { label: 'Moyen',       color: '#eab308' },
    { label: 'Fort',        color: '#22c55e' },
    { label: 'Très fort',   color: '#16a34a' },
  ]
  const level = levels[Math.min(score, 4)]
  const pct = ((score) / 5) * 100

  return (
    <div style={{ marginTop: '-0.5rem' }}>
      <div style={{ height: 5, background: 'var(--gray-200)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: level.color, borderRadius: 10, transition: 'all 0.3s ease' }} />
      </div>
      <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: level.color, fontWeight: 600 }}>
        Force : {level.label}
      </p>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '0.75rem 1rem',
  border: '1.5px solid var(--gray-200)', borderRadius: 10,
  fontSize: '0.95rem', color: 'var(--gray-900)',
  transition: 'all 0.2s ease', outline: 'none',
  background: '#fafafa', boxSizing: 'border-box',
  fontFamily: 'inherit'
}
