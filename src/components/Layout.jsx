import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Activity, ClipboardList, Users, Calendar, Paperclip, FileText, Shield, LogOut } from 'lucide-react'

export default function Layout() {
  const { user, authenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navLinks = [
    { to: '/', label: 'Forms', icon: ClipboardList },
    { to: '/patients', label: 'Patients', icon: Users },
    { to: '/meetings', label: 'Meetings', icon: Calendar },
    { to: '/attachments', label: 'Attachments', icon: Paperclip },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/users', label: 'Users', icon: Users },
  ]

  return (
    <div className="layout">
      <header className="navbar">
        <div className="container">
          <h1>
            <Link to="/">
              <Activity className="brand-icon" size={28} />
              RCP Platform
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
                <div className="navbar-user" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="user-name" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', color: '#0f172a' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {user?.first_name || user?.last_name ? (
                        `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
                      ) : (
                        user?.username || 'User'
                      )}
                    </span>
                    <span className="user-role" style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>
                      {user?.role}
                    </span>
                  </div>
                  <button onClick={handleLogout} className="btn-logout" title="Logout" style={{display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0'}}>
                    <LogOut size={18} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <Link to="/login" className="btn-primary">Login</Link>
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
