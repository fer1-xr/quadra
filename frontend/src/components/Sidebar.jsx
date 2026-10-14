import React, { useState } from 'react'
import '../styles/Sidebar.css'

function Sidebar({ currentView, onNavigate, user, onLogout }) {
  const [isOpen, setIsOpen] = useState(true)

  const menuItems = [
    { id: 'inicio', label: 'INICIO', icon: '🏠' },
    { id: 'rg90', label: 'Conciliación RG90', icon: '📊' },
    { id: 'bancaria', label: 'Conciliación Bancaria', icon: '🏦' },
    { id: 'calculadora', label: 'Calculadora Venta AF', icon: '🧮' },
    { id: 'reportes', label: 'Reportes', icon: '📈' },
    { id: 'documentacion', label: 'Documentación', icon: '📚' }
  ]

  const handleNavigate = (viewId) => {
    onNavigate(viewId)
  }

  return (
    <>
      <button className="sidebar-toggle" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle sidebar">
        {isOpen ? '✕' : '☰'}
      </button>

      <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-logo">QUΔDRA</h2>
        </div>

        <nav className="sidebar-menu">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`menu-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => handleNavigate(item.id)}
              title={item.label}
            >
              <span className="menu-icon">{item.icon}</span>
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
    </>
  )
}

export default Sidebar
