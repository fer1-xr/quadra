import React, { useState } from 'react'
import axios from 'axios'

function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login'
      const payload = isSignup ? { email, password, name } : { email, password }
      const response = await axios.post(endpoint, payload)
      const { token, user } = response.data
      onLogin(user, token)
    } catch (err) {
      setError(err.response?.data?.error || 'Error en la autenticación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>QUΔDRA</h1>
        <p>Conciliación RG90 — Nivel Contable</p>
        {error && <div className="error-message">{error}</div>}
        <div className="tabs">
          <button className={!isSignup ? 'tab-btn active' : 'tab-btn'} onClick={() => setIsSignup(false)}>Iniciar Sesión</button>
          <button className={isSignup ? 'tab-btn active' : 'tab-btn'} onClick={() => setIsSignup(true)}>Registrarse</button>
        </div>
        <form onSubmit={handleSubmit}>
          {isSignup && (
            <div className="form-group">
              <label>Nombre</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" required />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" required />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{width:'100%'}} disabled={loading}>
            {loading ? 'Procesando...' : isSignup ? 'Registrarse' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
