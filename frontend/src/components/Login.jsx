import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi'
import ForgotPassword from './ForgotPassword'
import ResetPassword from './ResetPassword'

function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [suggestedPassword, setSuggestedPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [screen, setScreen] = useState('login') // 'login', 'forgot', 'reset'
  const [resetToken, setResetToken] = useState(null)
  const [activeVideoIndex, setActiveVideoIndex] = useState(0)
  const videos = [
    'https://cdn.pixabay.com/vimeo/505127577/505127577-hd.mp4',
    'https://cdn.pixabay.com/vimeo/433781/433781-hd.mp4'
  ]

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      setResetToken(token)
      setScreen('reset')
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveVideoIndex(prev => (prev + 1) % videos.length)
    }, 15000)
    return () => clearInterval(interval)
  }, [videos.length])

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

  const calculatePasswordStrength = (pass) => {
    let strength = 0
    if (!pass) return 0
    if (pass.length >= 8) strength++
    if (pass.length >= 12) strength++
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) strength++
    if (/\d/.test(pass)) strength++
    if (/[@$!%*?&]/.test(pass)) strength++
    return Math.min(strength, 5)
  }

  const generateStrongPassword = () => {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lower = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const special = '@$!%*?&'
    const chars = upper + lower + numbers + special

    let pwd = ''
    pwd += upper[Math.floor(Math.random() * upper.length)]
    pwd += lower[Math.floor(Math.random() * lower.length)]
    pwd += numbers[Math.floor(Math.random() * numbers.length)]
    pwd += special[Math.floor(Math.random() * special.length)]

    for (let i = pwd.length; i < 12; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)]
    }

    pwd = pwd.split('').sort(() => Math.random() - 0.5).join('')
    setSuggestedPassword(pwd)
    return pwd
  }

  const getStrengthColor = () => {
    if (passwordStrength === 0) return '#ccc'
    if (passwordStrength <= 2) return '#ef4444'
    if (passwordStrength <= 3) return '#f97316'
    if (passwordStrength <= 4) return '#eab308'
    return '#22c55e'
  }

  const getStrengthText = () => {
    if (passwordStrength === 0) return 'Sin datos'
    if (passwordStrength <= 2) return 'Débil'
    if (passwordStrength <= 3) return 'Regular'
    if (passwordStrength <= 4) return 'Fuerte'
    return 'Muy fuerte'
  }

  const handlePasswordChange = (e) => {
    const pass = e.target.value
    setPassword(pass)
    setPasswordStrength(calculatePasswordStrength(pass))
  }

  const handleEmailChange = (e) => {
    const val = e.target.value
    setEmail(val)
    if (val) validateEmail(val)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!validateEmail(email)) return

    if (isSignup) {
      if (passwordStrength < 3) {
        setError('La contraseña debe ser más fuerte (mínimo 8 caracteres, mayúsculas, números y símbolos)')
        return
      }
      if (!name.trim()) {
        setError('El nombre es requerido')
        return
      }
    }

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

  if (screen === 'forgot') {
    return <ForgotPassword onBack={() => setScreen('login')} />
  }

  if (screen === 'reset') {
    return (
      <ResetPassword
        token={resetToken}
        onSuccess={() => {
          setScreen('login')
          setResetToken(null)
        }}
      />
    )
  }

  return (
    <div className="login-wrapper">
      <video autoPlay muted playsInline className="bg-video" key={activeVideoIndex}>
        <source src={videos[activeVideoIndex]} type="video/mp4" />
      </video>
      <div className="login-overlay"></div>
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>QUΔDRA</h1>
            <p className="tagline">Conciliación RG90 — Nivel Contable</p>
          </div>
          {error && <div className="error-message" style={{color: '#ef4444', background: '#fee2e2', padding: '10px', borderRadius: '4px', marginBottom: '15px'}}>{error}</div>}
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
            <div className="form-group">
              <label>Contraseña</label>
              <div style={{position: 'relative'}}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  required
                  style={{paddingRight: '40px', width: '100%', boxSizing: 'border-box'}}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '6px',
                    color: '#9ca3af',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#4b5563'}
                  onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <HiOutlineEyeOff size={20} /> : <HiOutlineEye size={20} />}
                </button>
              </div>
              {isSignup && password && (
                <div style={{marginTop: '8px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                    <small style={{fontSize: '12px'}}>Fortaleza:</small>
                    <small style={{color: getStrengthColor(), fontWeight: 'bold'}}>{getStrengthText()}</small>
                  </div>
                  <div style={{background: '#e5e7eb', height: '4px', borderRadius: '2px', overflow: 'hidden'}}>
                    <div style={{
                      background: getStrengthColor(),
                      height: '100%',
                      width: `${(passwordStrength / 5) * 100}%`,
                      transition: 'all 0.3s ease'
                    }}></div>
                  </div>
                  <small style={{color: '#666', fontSize: '11px', marginTop: '4px', display: 'block'}}>
                    Mínimo: 8 caracteres, mayúsculas, números y símbolos especiales
                  </small>
                </div>
              )}
            </div>
            {isSignup && (
              <button
                type="button"
                onClick={() => {
                  const pwd = generateStrongPassword()
                  setPassword(pwd)
                  setPasswordStrength(calculatePasswordStrength(pwd))
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  marginBottom: '10px',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#374151'
                }}
              >
                💡 Generar contraseña fuerte
              </button>
            )}
            <button type="submit" className="btn btn-primary" style={{width:'100%'}} disabled={loading || (isSignup && passwordStrength < 3) || !!emailError}>
              {loading ? 'Procesando...' : isSignup ? 'Registrarse' : 'Ingresar'}
            </button>
          </form>

          {!isSignup && (
            <div style={{marginTop: '15px', textAlign: 'center'}}>
              <button
                onClick={() => setScreen('forgot')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '14px'
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login
