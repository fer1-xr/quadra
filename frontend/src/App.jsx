import React, { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
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
    } else {
      // Redirigir a login si no hay sesión
      window.location.href = '/login'
    }
    setLoading(false)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('quaedra_token')
    localStorage.removeItem('quaedra_user')
    window.location.href = '/login'
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
  ) : null
}

export default App
