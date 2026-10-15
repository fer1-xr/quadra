import React, { useState } from 'react'
import '../styles/Sidebar.css'

function Sidebar({ currentView, onNavigate, user, onLogout }) {
  const [isHovered, setIsHovered] = useState(false)

  const menuItems = [
    { id: 'inicio', label: 'INICIO', icon: '🏠' },
    { id: 'buscar', label: 'Buscar', icon: '📄', isSvg: true, svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
        <polyline points="13 2 13 9 20 9"></polyline>
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
