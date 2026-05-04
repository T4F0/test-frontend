import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { Activity, ClipboardList, Users, Calendar, Paperclip, FileText, Shield, LogOut, Bell } from 'lucide-react'
import { getNotifications, markNotificationRead } from '../api/authApi'
import { formatDate } from '../lib/dateUtils'

export default function Layout() {
  const { user, authenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const notifRef = useRef(null)

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
    if (authenticated && ['ADMIN', 'COORDINATEUR'].includes(user?.role)) {
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

  const handleReadNotification = async (id) => {
    try {
      await markNotificationRead(id)
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (err) {
      console.error(err)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const patientsLabel = user?.role === 'ADMIN' ? 'Patients' : 'Mes Patients'

  const navLinks = [
    { to: '/forms', label: 'Formulaires', icon: ClipboardList, roles: ['ADMIN'] },
    { to: '/patients', label: patientsLabel, icon: Users },
    { to: '/meetings', label: 'Réunions', icon: Calendar },
    { to: '/users', label: 'Utilisateurs', icon: Users, roles: ['ADMIN', 'COORDINATEUR'] },
  ].filter(link => !link.roles || link.roles.includes(user?.role))

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="layout">
      <header className="navbar">
        <div className="container">
          <h1>
            <Link to="/">
              <Activity className="brand-icon" size={28} />
              Plateforme RCP
            </Link>
          </h1>
          <nav>
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
                </div>
                
                <div className="navbar-controls" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  {['ADMIN', 'COORDINATEUR'].includes(user?.role) && (
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
                                <div key={n.id} style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', background: n.is_read ? 'white' : '#f0f9ff', opacity: n.is_read ? 0.7 : 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>{n.title}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{formatDate(n.created_at)}</span>
                                  </div>
                                  <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0, marginBottom: '0.5rem' }}>{n.message}</p>
                                  {!n.is_read && (
                                    <button 
                                      onClick={() => handleReadNotification(n.id)}
                                      style={{ fontSize: '0.75rem', color: '#2563eb', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 500 }}
                                    >
                                      Marquer comme lu
                                    </button>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="navbar-user" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="user-name" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', color: '#0f172a' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {user?.first_name || user?.last_name ? (
                          `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
                        ) : (
                          user?.username || 'Utilisateur'
                        )}
                      </span>
                      <span className={`badge badge-${user?.role?.toLowerCase()}`} style={{ fontSize: '0.72rem', padding: '2px 8px', marginTop: '2px', fontWeight: 600 }}>
                        {user?.role === 'MEDECIN' ? 'Médecin traitant' : user?.role === 'COORDINATEUR' ? 'Coordinateur' : user?.role === 'ADMIN' ? 'Administrateur' : user?.role}
                      </span>
                    </div>
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
        </div>
      </header>
      
      <main className="container">
        <Outlet />
      </main>
    </div>
  )
}
