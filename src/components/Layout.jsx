import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { Activity, ClipboardList, Users, Calendar, FileText, Shield, Settings, LogOut, Bell, Send, CheckSquare, Trash2, Menu, X } from 'lucide-react'
import { getNotifications, markNotificationRead, markAllNotificationsRead, clearAllNotifications } from '../api/authApi'
import { formatDate } from '../lib/dateUtils'

export default function Layout() {
  const { user, authenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const notifRef = useRef(null)

  const closeMobileMenu = () => setMobileMenuOpen(false)

  useEffect(() => {
    if (user?.role) {
      document.body.className = `theme-${user.role.toLowerCase()}`
    } else {
      document.body.className = ''
    }
    return () => {
      document.body.className = ''
    }
  }, [user?.role])

  useEffect(() => {
    let interval;
    if (authenticated && ['ADMIN', 'COORDINATEUR', 'MEDECIN', 'MEDECIN_EXPERT'].includes(user?.role)) {
      const loadNotifications = async () => {
        try {
          const data = await getNotifications()
          setNotifications(data || [])
        } catch (err) {
          console.error(err)
        }
      }
      loadNotifications()
      // interval = setInterval(loadNotifications, 30000)
    }
    return () => clearInterval(interval)
  }, [authenticated, user?.role])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getNotificationRedirect = (notification) => {
    const title = notification.title || '';
    const titleLower = title.toLowerCase();

    if (titleLower.includes('registration') || titleLower.includes('inscription') || titleLower.includes('nouveau médecin')) {
      return { path: '/users', search: '?tab=pending' };
    }
    if (titleLower.includes('demande')) {
      return { path: '/meetings/requests', search: '' };
    }
    if (titleLower.includes('réunion') || titleLower.includes('planifiée') || titleLower.includes('meeting')) {
      return { path: '/meetings', search: '' };
    }
    return null;
  };

  const handleReadNotification = async (id) => {
    try {
      await markNotificationRead(id)
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsRead()
      setNotifications(notifications.map(n => ({ ...n, is_read: true })))
    } catch (err) {
      console.error(err)
    }
  }

  const handleClearAllNotifications = async () => {
    try {
      await clearAllNotifications()
      setNotifications([])
      setShowNotifications(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const patientsLabel = ['ADMIN', 'COORDINATEUR'].includes(user?.role) ? 'Patients' : 'Mes Patients'

  const homePath = !authenticated ? '/login' : '/'

  const navLinks = [
    { to: '/forms', label: 'Formulaires', icon: ClipboardList, roles: ['ADMIN', 'COORDINATEUR', 'MEDECIN_EXPERT'] },
    // Show patients for ADMIN, MEDECIN, and COORDINATEUR
    ...(['ADMIN', 'MEDECIN', 'MEDECIN_EXPERT', 'COORDINATEUR'].includes(user?.role) ? [{ to: '/patients', label: patientsLabel, icon: Users }] : []),
    { to: '/meetings', label: 'Réunions', icon: Calendar },
    { to: '/reports', label: 'Rapports', icon: FileText },
    // Coordinators and Admin can see the requests list
    ...(['ADMIN', 'COORDINATEUR'].includes(user?.role) ? [{ to: '/meetings/requests', label: 'Demandes', icon: Send }] : []),
    // MEDECIN can request an RCP meeting
    ...(user?.role === 'MEDECIN' ? [{ to: '/meetings/request', label: 'Demander une RCP', icon: Send }] : []),
    // For Coordinators, label is 'Medecins', for ADMIN it is 'Utilisateurs'
    { 
      to: '/users', 
      label: user?.role === 'COORDINATEUR' ? 'Medecins' : 'Utilisateurs', 
      icon: Users, 
      roles: ['ADMIN', 'COORDINATEUR'] 
    },
  ].filter(link => !link.roles || link.roles.includes(user?.role))

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="layout">
      <header className="navbar">
        <div className="container">
          <h1>
            <Link to={homePath}>
              <Activity className="brand-icon" size={28} />
              Plateforme RCP
            </Link>
          </h1>

          <button
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <nav className="desktop-nav">
            {authenticated ? (
              <>
                <div className="nav-links">
                  {navLinks.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      className={location.pathname === to ? 'active' : ''}
                    >
                      <Icon size={18} />
                      {label}
                    </Link>
                  ))}
                  {user?.role === 'ADMIN' && (
                    <Link to="/audit-logs" className={location.pathname === '/audit-logs' ? 'active' : ''}>
                      <Shield size={18} />
                      Audit
                    </Link>
                  )}
                  {user?.is_global_admin && (
                    <Link to="/settings/services" className={location.pathname === '/settings/services' ? 'active' : ''}>
                      <Settings size={18} />
                      Paramètres
                    </Link>
                  )}
                </div>
                
                <div className="navbar-controls">
                  {['ADMIN', 'COORDINATEUR', 'MEDECIN', 'MEDECIN_EXPERT'].includes(user?.role) && (
                    <div className="notifications-wrapper" ref={notifRef} style={{ position: 'relative' }}>
                      <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', color: '#64748b' }}
                      >
                        <Bell size={22} />
                        {unreadCount > 0 && (
                          <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#e11d48', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {unreadCount}
                          </span>
                        )}
                      </button>
                      
                      {showNotifications && (
                        <div className="notifications-dropdown" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '320px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', zIndex: 1000, overflow: 'hidden' }}>
                          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', background: '#f8fafc', color: '#0f172a' }}>
                            Notifications
                          </div>
                          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                            {notifications.length === 0 ? (
                              <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>Aucune notification</div>
                            ) : (
                              notifications.map(n => (
                                <div 
                                  key={n.id} 
                                  onClick={() => {
                                    if (!n.is_read) {
                                      handleReadNotification(n.id)
                                    }
                                    setShowNotifications(false)
                                    const redirect = getNotificationRedirect(n)
                                    if (redirect) {
                                      navigate(redirect.path + redirect.search)
                                    }
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = n.is_read ? '#f8fafc' : '#e0f2fe'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = n.is_read ? 'white' : '#f0f9ff'
                                  }}
                                  style={{ 
                                    padding: '1rem', 
                                    borderBottom: '1px solid #f1f5f9', 
                                    background: n.is_read ? 'white' : '#f0f9ff', 
                                    opacity: n.is_read ? 0.7 : 1,
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>{n.title}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{formatDate(n.created_at)}</span>
                                  </div>
                                  <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0, marginBottom: '0.5rem' }}>{n.message}</p>
                                  {!n.is_read && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleReadNotification(n.id)
                                      }}
                                      style={{ fontSize: '0.75rem', color: '#2563eb', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 500 }}
                                    >
                                      Marquer comme lu
                                    </button>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                          {notifications.length > 0 && (
                            <div style={{ padding: '0.5rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: unreadCount > 0 ? 'space-between' : 'center', alignItems: 'center' }}>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleClearAllNotifications(); }}
                                style={{ 
                                  background: 'transparent', 
                                  border: 'none', 
                                  color: '#64748b', 
                                  fontSize: '0.75rem', 
                                  fontWeight: '600',
                                  cursor: 'pointer', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '6px',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                                title="Effacer tout"
                              >
                                <Trash2 size={14} />
                                Effacer tout
                              </button>

                              {unreadCount > 0 && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleMarkAllAsRead(); }}
                                  style={{ 
                                    background: 'transparent', 
                                    border: 'none', 
                                    color: '#64748b', 
                                    fontSize: '0.75rem', 
                                    fontWeight: '600',
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    transition: 'all 0.2s ease',
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                                  title="Tout marquer comme lu"
                                >
                                  <CheckSquare size={14} />
                                  Tout marquer comme lu
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="navbar-user" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link
                      to={user?.id ? `/users/${user.id}` : '#'}
                      title="Mon profil"
                      style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'var(--primary)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.9rem', fontWeight: 700, flexShrink: 0
                      }}>
                        {((user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')) || user?.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="user-name" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', color: '#0f172a' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {user?.first_name || user?.last_name ? (
                            `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
                          ) : (
                            user?.username || 'Utilisateur'
                          )}
                        </span>
                        <span className={`badge badge-${user?.role?.toLowerCase()}`} style={{ fontSize: '0.72rem', padding: '2px 8px', marginTop: '2px', fontWeight: 600 }}>
                          {user?.role === 'MEDECIN' ? 'Médecin traitant' : user?.role === 'MEDECIN_EXPERT' ? 'Médecin expert' : user?.role === 'COORDINATEUR' ? 'Coordinateur' : user?.role === 'ADMIN' ? 'Administrateur' : user?.role}
                        </span>
                      </div>
                    </Link>
                    <button onClick={handleLogout} className="btn-logout" title="Déconnexion" style={{display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0'}}>
                      <LogOut size={18} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Déconnexion</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <Link to="/login" className="btn-primary">Connexion</Link>
            )}
          </nav>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div className="mobile-drawer-overlay" onClick={closeMobileMenu}>
              <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
                <div className="mobile-drawer-header">
                  <span className="mobile-drawer-title">Menu</span>
                  <button onClick={closeMobileMenu} className="mobile-drawer-close">
                    <X size={20} />
                  </button>
                </div>

                <div className="mobile-drawer-body">
                  <div
                    className="mobile-drawer-user"
                    onClick={() => { closeMobileMenu(); navigate(user?.id ? `/users/${user.id}` : '#'); }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'var(--primary)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.95rem', fontWeight: 700, flexShrink: 0
                    }}>
                      {((user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')) || user?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0f172a' }}>
                        {user?.first_name || user?.last_name ? (
                          `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
                        ) : (
                          user?.username || 'Utilisateur'
                        )}
                      </div>
                      <span className={`badge badge-${user?.role?.toLowerCase()}`} style={{ fontSize: '0.7rem', padding: '2px 8px', marginTop: '2px', fontWeight: 600 }}>
                        {user?.role === 'MEDECIN' ? 'Médecin traitant' : user?.role === 'MEDECIN_EXPERT' ? 'Médecin expert' : user?.role === 'COORDINATEUR' ? 'Coordinateur' : user?.role === 'ADMIN' ? 'Administrateur' : user?.role}
                      </span>
                    </div>
                  </div>

                  {unreadCount > 0 && (
                    <div className="mobile-notifications-bar" onClick={() => { closeMobileMenu(); setShowNotifications(true); }}>
                      <Bell size={16} />
                      <span>{unreadCount} notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}</span>
                    </div>
                  )}

                  <nav className="mobile-nav-links">
                    {navLinks.map(({ to, label, icon: Icon }) => (
                      <Link
                        key={to}
                        to={to}
                        className={location.pathname === to ? 'active' : ''}
                        onClick={closeMobileMenu}
                      >
                        <Icon size={18} />
                        {label}
                      </Link>
                    ))}
                    {user?.role === 'ADMIN' && (
                      <Link to="/audit-logs" className={location.pathname === '/audit-logs' ? 'active' : ''} onClick={closeMobileMenu}>
                        <Shield size={18} />
                        Audit
                      </Link>
                    )}
                    {user?.is_global_admin && (
                      <Link to="/settings/services" className={location.pathname === '/settings/services' ? 'active' : ''} onClick={closeMobileMenu}>
                        <Settings size={18} />
                        Paramètres
                      </Link>
                    )}
                  </nav>

                  <div className="mobile-drawer-footer">
                    <button onClick={handleLogout} className="btn-logout mobile-logout-btn">
                      <LogOut size={16} />
                      <span>Déconnexion</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
      
      <main className="container">
        <Outlet />
      </main>
    </div>
  )
}
