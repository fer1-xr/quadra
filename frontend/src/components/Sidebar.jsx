import React, { useState, useEffect } from 'react'
import '../styles/Sidebar.css'

function Sidebar({ currentView, onNavigate, user, onLogout }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('quadra-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const darkMode = savedTheme ? savedTheme === 'dark' : prefersDark
    setIsDarkMode(darkMode)
    applyTheme(darkMode)
  }, [])

  const applyTheme = (dark) => {
    const html = document.documentElement
    const root = document.querySelector(':root')

    if (dark) {
      // Modo oscuro
      html.setAttribute('data-theme', 'dark')
      html.style.backgroundColor = '#0a0e1a'
      html.style.color = '#ffffff'
      document.body.style.backgroundColor = '#0a0e1a'
      document.body.style.color = '#ffffff'

      // Actualizar variables CSS para modo oscuro
      if (root) {
        root.style.setProperty('--bg-page', '#0a0e1a')
        root.style.setProperty('--text-primary', '#ffffff')
        root.style.setProperty('--card-bg', '#1a2535')
        root.style.setProperty('--card-border', 'rgba(212, 175, 55, 0.15)')
      }
    } else {
      // Modo claro
      html.setAttribute('data-theme', 'light')
      html.style.backgroundColor = '#ffffff'
      html.style.color = '#333333'
      document.body.style.backgroundColor = '#ffffff'
      document.body.style.color = '#333333'

      // Actualizar variables CSS para modo claro
      if (root) {
        root.style.setProperty('--bg-page', '#ffffff')
        root.style.setProperty('--text-primary', '#333333')
        root.style.setProperty('--card-bg', '#ffffff')
        root.style.setProperty('--card-border', '#DDD')
      }
    }
    localStorage.setItem('quadra-theme', dark ? 'dark' : 'light')
  }

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    applyTheme(newDarkMode)
  }

  const menuItems = [
    { id: 'inicio', label: 'INICIO', icon: '🏠' },
    { id: 'buscar', label: 'Buscar', icon: '🔍', isSvg: true, svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.35-4.35"></path>
      </svg>
    )},
    { id: 'rg90', label: 'Conciliación RG90', icon: '📊', isImage: true, image: '/rg90-logo.png' },
    { id: 'bancaria', label: 'Conciliación Bancaria', icon: '🏦', isSvg: true, svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="2"></rect>
        <path d="M2 10h20"></path>
        <rect x="5" y="16" width="3" height="2" rx="0.5"></rect>
        <circle cx="12" cy="12" r="1" fill="currentColor"></circle>
      </svg>
    )},
    { id: 'liquidacion', label: 'Liquidación Salarial', icon: '💰', isImage: true, image: '/ips-logo.png' },
    { id: 'activofijo', label: 'Activo Fijo', icon: '🏢', isSvg: true, svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="8" width="18" height="11" rx="1"></rect>
        <circle cx="6" cy="19" r="1.5" fill="currentColor"></circle>
        <circle cx="18" cy="19" r="1.5" fill="currentColor"></circle>
        <path d="M8 8L4 4M16 8l4-4"></path>
      </svg>
    )},
    { id: 'flujo', label: 'Flujo de Caja', icon: '💵', isSvg: true, svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9"></circle>
        <circle cx="12" cy="12" r="5" fill="currentColor" opacity="0.3"></circle>
        <path d="M12 7v10M7 12h10"></path>
      </svg>
    )}
  ]

  const handleNavigate = (viewId) => {
    onNavigate(viewId)
  }

  return (
    <aside
      className={`sidebar ${isHovered ? 'expanded' : 'collapsed'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
        <nav className="sidebar-menu">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`menu-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => handleNavigate(item.id)}
              title={item.label}
            >
              <span className="menu-icon">
                {item.isImage ? (
                  <img src={item.image} alt={item.label} style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                ) : item.isSvg ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px' }}>
                    {item.svg}
                  </span>
                ) : (
                  item.icon
                )}
              </span>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="menu-item theme-toggle-item"
            onClick={toggleTheme}
            title={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
          >
            <span className="menu-icon">
              {isDarkMode ? (
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </span>
            <span className="menu-label">{isDarkMode ? 'Claro' : 'Oscuro'}</span>
          </button>
          <button className="menu-item account-item" onClick={() => handleNavigate('cuenta')} title="Mi cuenta">
            <span className="menu-icon">👤</span>
            <span className="menu-label">Mi cuenta</span>
          </button>
          <button className="menu-item logout-item" onClick={onLogout} title="Cerrar sesión">
            <span className="menu-icon">🚪</span>
            <span className="menu-label">Cerrar sesión</span>
          </button>
        </div>
      </aside>
  )
}

export default Sidebar
