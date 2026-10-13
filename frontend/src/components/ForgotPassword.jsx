import React, { useState } from 'react'
import axios from 'axios'

function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState('')

  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!value) {
      setEmailError('El email es requerido')
      return false
    }
    if (!emailRegex.test(value)) {
      setEmailError('Ingresa un email válido')
      return false
    }
    setEmailError('')
    return true
  }

  const handleEmailChange = (e) => {
    const val = e.target.value
    setEmail(val)
    if (val) validateEmail(val)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateEmail(email)) return

    setLoading(true)
    try {
      const response = await axios.post('/api/auth/forgot-password', { email })
      setSuccess('✅ Enlace de recuperación enviado. Revisa tu email.')
      setEmail('')
      setTimeout(() => {
        onBack()
      }, 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al solicitar recuperación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>QUΔDRA</h1>
        <p>Recuperar Contraseña</p>

        {error && (
          <div style={{color: '#ef4444', background: '#fee2e2', padding: '10px', borderRadius: '4px', marginBottom: '15px'}}>
            {error}
          </div>
        )}

        {success && (
          <div style={{color: '#16a34a', background: '#dcfce7', padding: '10px', borderRadius: '4px', marginBottom: '15px'}}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email registrado</label>
            <input
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => validateEmail(email)}
              placeholder="tu@email.com"
              required
              style={{borderColor: emailError ? '#ef4444' : '#ddd'}}
            />
            {emailError && <small style={{color: '#ef4444'}}>{emailError}</small>}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{width:'100%'}}
            disabled={loading || !!emailError}
          >
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
        </form>

        <div style={{marginTop: '15px', textAlign: 'center'}}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '14px'
            }}
          >
            ← Volver a Login
          </button>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
