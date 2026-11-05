import React, { useState, useEffect } from 'react'
import { Home, BookOpen, BarChart3, Wallet, Calculator, Building2, TrendingUp, LineChart, CreditCard, Sun, Moon, LogOut, CheckSquare, Target, FileText, Users, Briefcase, ArrowLeftRight, History, Pin, PanelLeft, PanelLeftClose, X, NotebookPen, ListChecks } from 'lucide-react'
import '../styles/Sidebar.css'

const MODOS = [
  { id: 'fijo', label: 'Fijo', icon: Pin, hint: 'Menú siempre visible' },
  { id: 'auto', label: 'Desplegable', icon: PanelLeft, hint: 'Se despliega al pasar el cursor' },
  { id: 'oculto', label: 'Oculto', icon: PanelLeftClose, hint: 'Se abre desde el botón de menú' }
]

function Sidebar({ currentView, onNavigate, user, onLogout, isOpen = false, onClose, contribuyente = null, onCambiarContribuyente, mode = 'fijo', onModeChange }) {
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

  const agenda = {
    label: 'Agenda',
    items: [
      { id: 'leccion', label: 'Lección del Día', icon: BookOpen },
      { id: 'todo', label: 'Tareas del Día', icon: CheckSquare },
      { id: 'metas', label: 'Metas y Objetivos', icon: Target }
    ]
  }

  const gestion = {
    label: 'Gestión',
    items: [
      { id: 'clientes', label: 'Gestión de Clientes', icon: Users }
    ]
  }

  // Sin contribuyente: panel general simplificado.
  // Con contribuyente: espacio de trabajo completo sobre ese cliente.
  const menuGroups = contribuyente
    ? [
        {
          label: 'General',
          items: [
            { id: 'inicio', label: 'Inicio', icon: Home },
            { id: 'historial', label: 'Historial', icon: History },
            { id: 'leccion', label: 'Lección del Día', icon: BookOpen }
          ]
        },
        {
          label: 'Agenda del cliente',
          items: [
            { id: 'todo', label: 'Tareas de la semana', icon: CheckSquare },
            { id: 'memoria', label: 'Ayuda memoria', icon: ListChecks },
            { id: 'metas', label: 'Metas y Objetivos', icon: Target },
            { id: 'notas', label: 'Notas y Reuniones', icon: NotebookPen }
          ]
        },
        {
          label: 'Conciliación',
          items: [
            { id: 'rg90', label: 'Conciliación RG90', icon: BarChart3 },
            { id: 'bancaria', label: 'Conciliación Bancaria', icon: Wallet },
            { id: 'importar-documentos', label: 'Importar Documentos', icon: FileText },
            { id: 'control-pagos', label: 'Control de Pagos', icon: CreditCard }
          ]
        },
        {
          label: 'Cálculo',
          items: [
            { id: 'liquidacion', label: 'Liquidación Salarial', icon: Calculator },
            { id: 'activofijo', label: 'Activo Fijo', icon: Building2 },
            { id: 'flujo', label: 'Flujo de Caja', icon: TrendingUp },
            { id: 'cotizacion', label: 'Cotización', icon: LineChart }
          ]
        },
        gestion
      ]
    : [
        {
          label: 'General',
          items: [
            { id: 'inicio', label: 'Inicio', icon: Home },
            { id: 'seleccionar', label: 'Clientes', icon: Briefcase }
          ]
        },
        agenda,
        gestion
      ]

  const handleNavigate = (viewId) => {
    onNavigate(viewId)
    if (onClose) onClose()
  }

  const isActive = (id) => currentView === id || (id === 'rg90' && currentView === 'rg90-results')
  const displayName = user?.name || user?.email || ''
  const initial = displayName.trim().charAt(0).toUpperCase() || 'Q'

  return (
    <>
      <div className={`q-sidebar-scrim ${isOpen ? 'is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`q-sidebar q-sidebar--${mode} ${isOpen ? 'is-open' : ''}`} aria-label="Navegación principal">
        <div className="q-sidebar__brand">
          <svg className="q-sidebar__mark" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect className="q-sidebar__mark-a" x="1" y="1" width="11.5" height="11.5" rx="2.5" />
            <rect x="15.5" y="1" width="11.5" height="11.5" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="1" y="15.5" width="11.5" height="11.5" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="15.5" y="15.5" width="11.5" height="11.5" rx="2.5" fill="currentColor" />
          </svg>
          <div>
            <p className="q-sidebar__name">Quadra</p>
            <p className="q-sidebar__tag">Σ debe = Σ haber</p>
          </div>
          <button
            type="button"
            className="q-sidebar__close"
            onClick={() => (mode === 'oculto' || isOpen ? onClose?.() : onModeChange?.('oculto'))}
            aria-label="Ocultar menú"
            title="Ocultar menú"
          >
            {isOpen ? <X size={16} strokeWidth={1.8} /> : <PanelLeftClose size={16} strokeWidth={1.8} />}
          </button>
        </div>

        {contribuyente && (
          <div className="q-sidebar__client">
            <p className="q-sidebar__client-label">Trabajando en</p>
            <p className="q-sidebar__client-name" title={contribuyente.razonSocial}>{contribuyente.razonSocial}</p>
            <p className="q-sidebar__client-meta">RUC {contribuyente.ruc} · {contribuyente.ejercicio}</p>
            <button
              type="button"
              className="q-sidebar__client-switch"
              onClick={() => { onCambiarContribuyente?.(); if (onClose) onClose() }}
            >
              <ArrowLeftRight size={14} strokeWidth={1.8} /> Cambiar contribuyente
            </button>
          </div>
        )}

        <nav className="q-sidebar__nav">
          {menuGroups.map((group) => (
            <div key={group.label} className="q-nav-group">
              <p className="q-nav-group__label">{group.label}</p>
              <ul>
                {group.items.map((item) => {
                  const IconComponent = item.icon
                  const active = isActive(item.id)
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`q-nav-item ${active ? 'is-active' : ''}`}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => handleNavigate(item.id)}
                      >
                        <IconComponent size={17} strokeWidth={1.6} />
                        <span>{item.label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="q-sidebar__footer">
          <div className="q-sidebar__mode" role="radiogroup" aria-label="Comportamiento del menú">
            {MODOS.map((m) => {
              const Icon = m.icon
              const activo = mode === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  className={`q-sidebar__mode-btn ${activo ? 'is-active' : ''}`}
                  title={m.hint}
                  onClick={() => { onModeChange?.(m.id); if (onClose) onClose() }}
                >
                  <Icon size={14} strokeWidth={1.8} />
                  <span>{m.label}</span>
                </button>
              )
            })}
          </div>
          <button
            type="button"
            className={`q-nav-item ${currentView === 'cuenta' ? 'is-active' : ''}`}
            onClick={() => handleNavigate('cuenta')}
          >
            <span className="q-avatar" aria-hidden="true">
              {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : initial}
            </span>
            <span className="q-sidebar__user">
              <span>Mi Cuenta</span>
              {displayName && <small>{displayName}</small>}
            </span>
          </button>
          <div className="q-sidebar__actions">
            <button type="button" className="q-icon-btn" onClick={toggleTheme} title={isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}>
              {isDarkMode ? <Sun size={16} strokeWidth={1.6} /> : <Moon size={16} strokeWidth={1.6} />}
              <span>{isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
            </button>
            <button type="button" className="q-icon-btn q-icon-btn--danger" onClick={onLogout} title="Cerrar Sesión">
              <LogOut size={16} strokeWidth={1.6} />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
