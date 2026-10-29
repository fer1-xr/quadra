import React, { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import leccionScheduler from './services/leccionScheduler'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Obtener usuario del localStorage o verificar token
    const token = localStorage.getItem('quaedra_token')
    const storedUser = localStorage.getItem('quaedra_user')

    if (token && storedUser) {
      setUser(JSON.parse(storedUser))
      // Iniciar el scheduler de lecciones cuando el usuario está autenticado
      leccionScheduler.start()
    }
    setLoading(false)

    // Limpiar el scheduler cuando se desmonta el componente
    return () => {
      leccionScheduler.stop()
    }
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    leccionScheduler.start()
  }

  const handleLogout = () => {
    localStorage.removeItem('quaedra_token')
    localStorage.removeItem('quaedra_user')
    setUser(null)
    leccionScheduler.stop()
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#1B2A4A', marginBottom: '20px' }}>QUADRA</h1>
          <div style={{ fontSize: '24px' }}>Cargando...</div>
        </div>
      </div>
    )
  }

  return user ? (
    <Dashboard user={user} onLogout={handleLogout} />
  ) : (
    <Login onLogin={handleLogin} />
  )
}

export default App
