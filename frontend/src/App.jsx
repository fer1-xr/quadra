import React, { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import Register from './components/Register'
import ForgotPassword from './components/ForgotPassword'
import ResetPassword from './components/ResetPassword'
import leccionScheduler from './services/leccionScheduler'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authPage, setAuthPage] = useState('login') // 'login', 'register', 'forgot-password', 'reset-password'
  const [resetToken, setResetToken] = useState(null)

  useEffect(() => {
    // Obtener usuario del localStorage o verificar token
    const token = localStorage.getItem('quaedra_token')
    const storedUser = localStorage.getItem('quaedra_user')

    // Verificar si hay un token de recuperación de contraseña en la URL
    const params = new URLSearchParams(window.location.search)
    const resetTokenFromUrl = params.get('token')
    if (resetTokenFromUrl) {
      setResetToken(resetTokenFromUrl)
      setAuthPage('reset-password')
    }

    if (token && storedUser && !resetTokenFromUrl) {
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
    setAuthPage('login')
    leccionScheduler.start()
  }

  const handleRegister = (userData) => {
    setUser(userData)
    setAuthPage('login')
    leccionScheduler.start()
  }

  const handleLogout = () => {
    localStorage.removeItem('quaedra_token')
    localStorage.removeItem('quaedra_user')
    setUser(null)
    setAuthPage('login')
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

  if (user) {
    return <Dashboard user={user} onLogout={handleLogout} />
  }

  return (
    <>
      {authPage === 'login' && (
        <Login
          onLogin={handleLogin}
          onSwitchToRegister={() => setAuthPage('register')}
          onSwitchToForgotPassword={() => setAuthPage('forgot-password')}
        />
      )}
      {authPage === 'register' && (
        <Register
          onRegister={handleRegister}
          onSwitchToLogin={() => setAuthPage('login')}
        />
      )}
      {authPage === 'forgot-password' && (
        <ForgotPassword onBackToLogin={() => setAuthPage('login')} />
      )}
      {authPage === 'reset-password' && resetToken && (
        <ResetPassword token={resetToken} onBackToLogin={() => setAuthPage('login')} />
      )}
    </>
  )
}

export default App
