import React, { useState, useEffect } from 'react'
import { Button, Divider } from '@heroui/react'
import { Home, BookOpen, BarChart3, Wallet, Calculator, Building2, TrendingUp, CreditCard, Sun, Moon, User, LogOut, CheckSquare, Target, FileText, Users } from 'lucide-react'

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
    { id: 'leccion', label: 'Lección del Día', icon: BookOpen },
    { id: 'todo', label: 'TO DO del Día', icon: CheckSquare },
    { id: 'metas', label: 'Metas Anuales', icon: Target },
    { id: 'rg90', label: 'Conciliación RG90', icon: BarChart3 },
    { id: 'bancaria', label: 'Conciliación Bancaria', icon: Wallet },
    { id: 'importar-documentos', label: 'Importar Documentos', icon: FileText },
    { id: 'control-pagos', label: 'Control de Pagos', icon: CreditCard },
    { id: 'liquidacion', label: 'Liquidación Salarial', icon: Calculator },
    { id: 'activofijo', label: 'Activo Fijo', icon: Building2 },
    { id: 'flujo', label: 'Flujo de Caja', icon: TrendingUp },
    { id: 'cotizacion', label: 'Cotización', icon: TrendingUp },
    { id: 'clientes', label: 'Gestión de Clientes', icon: Users }
  ]

  const handleNavigate = (viewId) => {
    onNavigate(viewId)
  }

  return (
    <aside className="w-64 h-screen bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 flex flex-col overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        <h1 className="text-2xl font-bold text-primary">QUΔDRA</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">v1.0</p>
      </div>

      {/* Menu Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon
            const isActive = currentView === item.id

            return (
              <Button
                key={item.id}
                fullWidth
                className={`justify-start gap-3 font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md'
                    : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
                onClick={() => handleNavigate(item.id)}
                startContent={<IconComponent size={20} strokeWidth={1.5} />}
              >
                {item.label}
              </Button>
            )
          })}
        </div>
      </nav>

      {/* Divider */}
      <Divider className="my-4" />

      {/* Footer Actions */}
      <div className="p-4 space-y-2 border-t border-gray-200 dark:border-slate-700">
        <Button
          fullWidth
          className="justify-start gap-3 bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 font-medium"
          onClick={toggleTheme}
          startContent={isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        >
          {isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
        </Button>

        <Button
          fullWidth
          className="justify-start gap-3 bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 font-medium"
          onClick={() => handleNavigate('cuenta')}
          startContent={<User size={20} />}
        >
          Mi Cuenta
        </Button>

        <Button
          fullWidth
          className="justify-start gap-3 bg-transparent text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800 font-medium"
          onClick={onLogout}
          startContent={<LogOut size={20} />}
        >
          Cerrar Sesión
        </Button>
      </div>
    </aside>
  )
}

export default Sidebar
