import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import './App.css'

// En desarrollo queda vacío y se usa el proxy de Vite (/api/...). En producción: VITE_API_URL = URL del backend en Render.
axios.defaults.baseURL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('quaedra_token')
    const savedUser = localStorage.getItem('quaedra_user')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setIsLoggedIn(true)
      if (savedUser) {
        try { setUser(JSON.parse(savedUser)) } catch(e) {}
      }
    }
  }, [])

  const handleLogin = (userData, authToken) => {
    localStorage.setItem('quaedra_token', authToken)
    localStorage.setItem('quaedra_user', JSON.stringify(userData))
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`
    setUser(userData)
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('quaedra_token')
    localStorage.removeItem('quaedra_user')
    delete axios.defaults.headers.common['Authorization']
    setIsLoggedIn(false)
    setUser(null)
  }

  return (
    <>
      {isLoggedIn ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </>
  )
}

export default App
