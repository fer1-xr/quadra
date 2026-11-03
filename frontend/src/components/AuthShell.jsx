import React, { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import '../styles/QuadraLogin.css'

// Misma clave y atributo que la landing y el Sidebar, para que el tema se comparta
const getInitialTheme = () => {
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'dark' || attr === 'light') return attr
  let saved
  try { saved = localStorage.getItem('quadra-theme') } catch (e) {}
  if (saved === 'dark' || saved === 'light') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Marco común de las pantallas de acceso: fondo, marca y selector de tema
function AuthShell({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('quadra-theme', theme) } catch (e) {}
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <div className="ql-page">
      <div className="ql-grid" aria-hidden="true" />

      <header className="ql-nav">
        <div className="ql-brand">
          <svg className="ql-brand__mark" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect className="ql-brand__mark-a" x="1" y="1" width="11.5" height="11.5" rx="2.5" />
            <rect x="15.5" y="1" width="11.5" height="11.5" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="1" y="15.5" width="11.5" height="11.5" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="15.5" y="15.5" width="11.5" height="11.5" rx="2.5" fill="currentColor" />
          </svg>
          <span className="ql-brand__name">Quadra</span>
        </div>

        <button
          type="button"
          className="ql-theme-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          <Moon className="ql-i-moon" />
          <Sun className="ql-i-sun" />
        </button>
      </header>

      <main className="ql-main">{children}</main>
    </div>
  )
}

export default AuthShell
