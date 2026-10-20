import React, { useState, useEffect } from 'react'
import '../styles/Sidebar.css'
import { Home, BookOpen, Search, BarChart3, Wallet, Calculator, Building2, TrendingUp, CreditCard, Sun, Moon, User, LogOut } from 'lucide-react'

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
    { id: 'inicio', label: 'INICIO', icon: Home },
    { id: 'leccion', label: 'Leccion del Dia', icon: BookOpen },
    { id: 'buscar', label: 'Buscar', icon: Search },
    { id: 'rg90', label: 'Conciliación RG90', icon: BarChart3 },
    { id: 'bancaria', label: 'Conciliación Bancaria', icon: Wallet },
    { id: 'liquidacion', label: 'Liquidación Salarial', icon: Calculator },
    { id: 'activofijo', label: 'Activo Fijo', icon: Building2 },
    { id: 'flujo', label: 'Flujo de Caja', icon: TrendingUp },
    { id: 'control-pagos', label: 'Control de Pagos', icon: CreditCard }
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
                <item.icon size={20} strokeWidth={1.5} />
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
              {isDarkMode ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
            </span>
            <span className="menu-label">{isDarkMode ? 'Claro' : 'Oscuro'}</span>
          </button>
          <button className="menu-item account-item" onClick={() => handleNavigate('cuenta')} title="Mi cuenta">
            <span className="menu-icon">
              <User size={20} strokeWidth={1.5} />
            </span>
            <span className="menu-label">Mi cuenta</span>
          </button>
          <button className="menu-item logout-item" onClick={onLogout} title="Cerrar sesión">
            <span className="menu-icon">
              <LogOut size={20} strokeWidth={1.5} />
            </span>
            <span className="menu-label">Cerrar sesión</span>
          </button>
        </div>
      </aside>
  )
}

export default Sidebar
