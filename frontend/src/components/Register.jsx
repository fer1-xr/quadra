import React, { useState, useEffect, useRef } from 'react'
import { Button, Input, Card, CardBody } from '@heroui/react'
import { Eye, EyeOff } from 'lucide-react'
import { authService } from '../services/authService'
import '../styles/Login.css'

function Register({ onRegister, onSwitchToLogin }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [dominantColor, setDominantColor] = useState({ r: 102, g: 126, b: 234 })
  const [isDarkImage, setIsDarkImage] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const canvasRef = useRef(null)

  const images = [
    '/login-images/1.jpg',
    '/login-images/2.jpg',
    '/login-images/3.jpg',
    '/login-images/4.jpg',
    '/login-images/5.jpg',
    '/login-images/6.jpg',
    '/login-images/7.jpg',
    '/login-images/8.jpg',
    '/login-images/9.jpg',
    '/login-images/10.jpg'
  ]

  // Detectar color dominante
  const getDominantColor = (imageSrc) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) resolve({ r: 102, g: 126, b: 234 })

        const ctx = canvas.getContext('2d')
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, img.width, img.height)
        const data = imageData.data

        let r = 0, g = 0, b = 0
        const pixelCount = data.length / 4

        for (let i = 0; i < data.length; i += 4) {
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
        }

        r = Math.floor(r / pixelCount)
        g = Math.floor(g / pixelCount)
        b = Math.floor(b / pixelCount)

        const brightness = (r * 299 + g * 587 + b * 114) / 1000
        const isDark = brightness < 128

        setDominantColor({ r, g, b })
        setIsDarkImage(isDark)
        resolve({ r, g, b, isDark })
      }
      img.onerror = () => resolve({ r: 102, g: 126, b: 234 })
      img.src = imageSrc
    })
  }

  // Carrusel de imágenes
  useEffect(() => {
    getDominantColor(images[currentImageIndex])

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [currentImageIndex])

  // Evaluar fortaleza de contraseña
  const evaluatePasswordStrength = (pwd) => {
    let strength = 0
    if (!pwd) return 0

    if (pwd.length >= 8) strength++
    if (/[a-z]/.test(pwd)) strength++
    if (/[A-Z]/.test(pwd)) strength++
    if (/\d/.test(pwd)) strength++
    if (/[@$!%*?&]/.test(pwd)) strength++

    return strength
  }

  const handlePasswordChange = (e) => {
    const pwd = e.target.value
    setPassword(pwd)
    setPasswordStrength(evaluatePasswordStrength(pwd))
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'red'
    if (passwordStrength <= 2) return 'orange'
    if (passwordStrength <= 3) return 'yellow'
    if (passwordStrength <= 4) return 'lime'
    return 'green'
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return 'Muy débil'
    if (passwordStrength <= 2) return 'Débil'
    if (passwordStrength <= 3) return 'Regular'
    if (passwordStrength <= 4) return 'Fuerte'
    return 'Muy fuerte'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validaciones
    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }

    if (name.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres')
      return
    }

    if (!email) {
      setError('El email es requerido')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email inválido')
      return
    }

    if (!password) {
      setError('La contraseña es requerida')
      return
    }

    if (passwordStrength < 5) {
      setError('La contraseña debe tener: 8+ caracteres, mayúsculas, minúsculas, números y símbolos especiales')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    try {
      const result = await authService.signup(email, password, name.trim())
      onRegister(result.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="login-wrapper"
      style={{
        background: isDarkImage
          ? `linear-gradient(135deg, rgb(${Math.max(dominantColor.r - 40, 0)}, ${Math.max(dominantColor.g - 40, 0)}, ${Math.max(dominantColor.b - 40, 0)}) 0%, rgb(${Math.max(dominantColor.r - 60, 0)}, ${Math.max(dominantColor.g - 60, 0)}, ${Math.max(dominantColor.b - 60, 0)}) 100%)`
          : `linear-gradient(135deg, rgb(${Math.min(dominantColor.r + 30, 255)}, ${Math.min(dominantColor.g + 30, 255)}, ${Math.min(dominantColor.b + 30, 255)}) 0%, rgb(${Math.min(dominantColor.r + 10, 255)}, ${Math.min(dominantColor.g + 10, 255)}, ${Math.min(dominantColor.b + 10, 255)}) 100%)`
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div className="login-container">
        {/* Lado izquierdo - Carrusel de imágenes */}
        <div className="login-branding image-carousel">
          <img
            src={images[currentImageIndex]}
            alt="Fondo de registro"
            className="carousel-image"
            key={currentImageIndex}
          />
          <div className="carousel-indicators">
            {images.map((_, idx) => (
              <div
                key={idx}
                className={`indicator ${idx === currentImageIndex ? 'active' : ''}`}
                onClick={() => setCurrentImageIndex(idx)}
              />
            ))}
          </div>
        </div>

        {/* Lado derecho - Formulario */}
        <div className="login-form-section">
          <Card className="login-card">
            <CardBody className="login-card-body">
              <div className="form-header">
                <h2 className="form-title">Crear Cuenta</h2>
                <p className="form-subtitle">Regístrate para acceder a QUADRA</p>
              </div>

              <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                  <label htmlFor="name" className="form-label">Nombre Completo</label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    fullWidth
                    className="input-field"
                    variant="bordered"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">Correo Electrónico</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    fullWidth
                    className="input-field"
                    variant="bordered"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password" className="form-label">Contraseña</label>
                  <div className="password-input-wrapper">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={handlePasswordChange}
                      required
                      fullWidth
                      className="input-field"
                      variant="bordered"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="password-toggle-btn"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {password && (
                    <div style={{ marginTop: '8px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            style={{
                              height: '4px',
                              flex: 1,
                              backgroundColor: i < passwordStrength ? getPasswordStrengthColor() : '#e0e0e0',
                              borderRadius: '2px',
                              transition: 'background-color 0.3s'
                            }}
                          />
                        ))}
                      </div>
                      <span style={{ color: getPasswordStrengthColor() }}>
                        Fortaleza: {getPasswordStrengthText()}
                      </span>
                      <p style={{ color: '#666', fontSize: '11px', margin: '4px 0 0 0' }}>
                        Debe tener: 8+ caracteres, mayúsculas, minúsculas, números y símbolos (@$!%*?&)
                      </p>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword" className="form-label">Confirmar Contraseña</label>
                  <div className="password-input-wrapper">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      fullWidth
                      className="input-field"
                      variant="bordered"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="password-toggle-btn"
                      aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
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
                  {loading ? 'Registrando...' : 'Crear Cuenta'}
                </Button>

                <div className="form-divider">
                  <span>o</span>
                </div>

                <p style={{ textAlign: 'center', margin: 0, fontSize: '14px' }}>
                  ¿Ya tienes cuenta?{' '}
                  <a
                    href="#login"
                    onClick={(e) => {
                      e.preventDefault()
                      onSwitchToLogin()
                    }}
                    style={{ color: '#666', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    Inicia sesión
                  </a>
                </p>
              </form>

              <div className="form-footer">
                <p>¿Problemas para registrarte? <a href="#help">Contáctanos</a></p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Register
