import React, { useState } from 'react'
import { Button, Input, Card, CardBody } from '@heroui/react'
import '../styles/Login.css'

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

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
    <div className="login-wrapper">
      <div className="login-container">
        {/* Lado izquierdo - Branding */}
        <div className="login-branding">
          <div className="branding-content">
            <div className="branding-icon">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <rect width="80" height="80" rx="20" fill="url(#grad1)" />
                <path d="M25 35L40 50L55 35" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="80" y2="80">
                    <stop offset="0%" stopColor="#667eea" />
                    <stop offset="100%" stopColor="#764ba2" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="branding-title">QUADRA</h1>
            <p className="branding-subtitle">Sistema de Conciliación Contable</p>

            <div className="benefits">
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <p>Gestión integral de datos contables</p>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <p>Reportes en tiempo real</p>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <p>Seguridad y cumplimiento normativo</p>
              </div>
            </div>
          </div>
          <div className="branding-footer">
            <p>© 2024 QUADRA. Todos los derechos reservados.</p>
          </div>
        </div>

        {/* Lado derecho - Formulario */}
        <div className="login-form-section">
          <Card className="login-card">
            <CardBody className="login-card-body">
              <div className="form-header">
                <h2 className="form-title">Bienvenido</h2>
                <p className="form-subtitle">Inicia sesión en tu cuenta</p>
              </div>

              <form onSubmit={handleSubmit} className="login-form">
                <div className={`form-group ${emailFocused ? 'focused' : ''}`}>
                  <label htmlFor="email" className="form-label">Correo electrónico</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    required
                    fullWidth
                    className="input-field"
                    variant="bordered"
                  />
                </div>

                <div className={`form-group ${passwordFocused ? 'focused' : ''}`}>
                  <label htmlFor="password" className="form-label">Contraseña</label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    required
                    fullWidth
                    className="input-field"
                    variant="bordered"
                  />
                </div>

                {error && (
                  <div className="error-message">
                    <span className="error-icon">⚠</span>
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="login-button"
                  isLoading={loading}
                  fullWidth
                  size="lg"
                >
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>

                <div className="form-divider">
                  <span>o</span>
                </div>

                <p className="demo-info">
                  <strong>Demo:</strong> usa cualquier email y contraseña
                </p>
              </form>

              <div className="form-footer">
                <p>¿Problemas para ingresar? <a href="#help">Contáctanos</a></p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Login
