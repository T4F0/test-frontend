import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

/** Grouped nav entry (e.g. "Administration"): a button that opens a small menu of links. */
export default function NavDropdown({ label, icon: Icon, items, pathname }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const active = items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        ref.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Close after navigating
  useEffect(() => setOpen(false), [pathname])

  return (
    <div className="nav-dropdown" ref={ref}>
      <button
        type="button"
        className={`nav-dropdown-toggle ${active ? 'active' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {Icon && <Icon size={18} aria-hidden="true" />}
        {label}
        <ChevronDown size={15} aria-hidden="true" className={open ? 'is-open' : ''} />
      </button>
      {open && (
        <div className="nav-dropdown-menu" role="menu">
          {items.map(({ to, label: text, icon: ItemIcon }) => (
            <Link key={to} to={to} role="menuitem" className={pathname === to ? 'active' : ''}>
              {ItemIcon && <ItemIcon size={17} aria-hidden="true" />}
              {text}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
