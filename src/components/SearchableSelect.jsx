import { useState, useRef, useEffect } from 'react'

export default function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  onSearch, 
  placeholder = "Search...", 
  label = "Select",
  loading = false,
  error = null,
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const containerRef = useRef(null)

  // Find the label for the current value
  const selectedOption = options.find(opt => String(opt.value) === String(value))

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchText('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchChange = (e) => {
    const text = e.target.value
    setSearchText(text)
    onSearch(text)
  }

  const handleSelect = (val) => {
    onChange(val)
    setIsOpen(false)
    setSearchText('')
  }

  return (
    <div className="searchable-select-container" ref={containerRef}>
      <label className="searchable-select-label">
        {label} {required && <span className="required">*</span>}
      </label>
      
      <div 
        className={`searchable-select-input-wrapper ${isOpen ? 'open' : ''} ${error ? 'error' : ''}`} 
        onClick={() => setIsOpen(true)}
      >
        <input
          type="text"
          className="searchable-select-input"
          placeholder={selectedOption ? `${selectedOption.label}` : placeholder}
          value={isOpen ? searchText : (selectedOption ? selectedOption.label : '')}
          onChange={handleSearchChange}
          onFocus={() => setIsOpen(true)}
          autoComplete="off"
        />
        <span className="searchable-select-arrow">{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div className="searchable-select-dropdown">
          {loading && <div className="dropdown-info">Loading...</div>}
          {!loading && options.length === 0 && <div className="dropdown-info">No results found</div>}
          {options.map(opt => (
            <div 
              key={opt.value} 
              className={`dropdown-item ${String(opt.value) === String(value) ? 'selected' : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              <div className="item-label">{opt.label}</div>
              {opt.subLabel && <div className="item-sublabel">{opt.subLabel}</div>}
            </div>
          ))}
        </div>
      )}
      {error && <p className="helper-text error-text" style={{ marginTop: '0.5rem', color: 'var(--danger)', fontSize: '0.8rem' }}>{error}</p>}
    </div>
  )
}
