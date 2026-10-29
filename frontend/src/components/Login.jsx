import React, { useState } from 'react'
import { Button, Input } from '@heroui/react'
import '../styles/Login.css'

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Simular llamada al backend
      await new Promise(resolve => setTimeout(resolve, 500))

      if (email && password) {
        const userData = {
          email: email,
          name: email.split('@')[0]
        }
        localStorage.setItem('quaedra_token', 'mock_token_' + Date.now())
        localStorage.setItem('quaedra_user', JSON.stringify(userData))
        onLogin(userData)
      } else {
        setError('Por favor completa todos los campos')
      }
    } catch (err) {
      setError('Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">QUADRA</h1>
        <p className="login-subtitle">Sistema de Conciliación Contable</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <Input
              type="email"
              label="Correo electrónico"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              className="input-field"
            />
          </div>

          <div className="form-group">
            <Input
              type="password"
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              className="input-field"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <Button
            type="submit"
            color="primary"
            size="lg"
            className="login-button"
            isLoading={loading}
            fullWidth
          >
            Iniciar Sesión
          </Button>
        </form>

        <p className="login-footer">
          Demo: usa cualquier email y contraseña
        </p>
      </div>
    </div>
  )
}

export default Login
