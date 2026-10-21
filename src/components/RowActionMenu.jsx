import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal } from 'lucide-react'

/**
 * "⋯" menu for the secondary actions of a table row or card.
 * items: [{ label, icon: LucideIcon, onClick, danger?, hidden?, disabled? }]
 * The menu is rendered in a portal, so table overflow never clips it.
 */
export default function RowActionMenu({ items, label = 'Autres actions' }) {
  const visible = items.filter((item) => !item.hidden)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  const close = useCallback((returnFocus = true) => {
    setOpen(false)
    if (returnFocus) buttonRef.current?.focus()
  }, [])

  useLayoutEffect(() => {
    if (!open || !buttonRef.current || !menuRef.current) return
    const b = buttonRef.current.getBoundingClientRect()
    const m = menuRef.current.getBoundingClientRect()
    const below = b.bottom + 6 + m.height <= window.innerHeight - 8
    setPos({
      top: below ? b.bottom + 6 : Math.max(8, b.top - 6 - m.height),
      left: Math.max(8, Math.min(window.innerWidth - m.width - 8, b.right - m.width)),
    })
    menuRef.current.querySelector('[role=menuitem]:not(:disabled)')?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) close(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const entries = [...menuRef.current.querySelectorAll('[role=menuitem]:not(:disabled)')]
        const i = entries.indexOf(document.activeElement)
        const next = e.key === 'ArrowDown' ? (i + 1) % entries.length : (i - 1 + entries.length) % entries.length
        entries[next]?.focus()
      } else if (e.key === 'Tab') {
        close(false)
      }
    }
    const onScroll = () => close(false)
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, close])

  if (visible.length === 0) return null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="ui-icon-btn"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="ui-menu"
            role="menu"
            style={{ top: pos.top, left: pos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            {visible.map(({ label: text, icon: Icon, onClick, danger, disabled }) => (
              <button
                key={text}
                type="button"
                role="menuitem"
                className={`ui-menu-item ${danger ? 'is-danger' : ''}`}
                disabled={disabled}
                onClick={() => {
                  close(false)
                  onClick?.()
                }}
              >
                {Icon && <Icon size={16} aria-hidden="true" />}
                {text}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
