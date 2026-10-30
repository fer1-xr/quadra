import React, { useState, useEffect, useRef } from 'react'
import { Button, Input, Card, CardBody } from '@heroui/react'
import { authService } from '../services/authService'
import '../styles/Login.css'

function Login({ onLogin, onSwitchToRegister, onSwitchToForgotPassword }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [dominantColor, setDominantColor] = useState({ r: 102, g: 126, b: 234 })
  const [isDarkImage, setIsDarkImage] = useState(false)
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

  // Detectar color dominante de la imagen
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
    }, 30000)

    return () => clearInterval(interval)
  }, [currentImageIndex])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Por favor completa todos los campos')
      return
    }

    setLoading(true)

    try {
      const result = await authService.login(email, password)
      onLogin(result.user)
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
            alt="Fondo de login"
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

                <Button
                  type="button"
                  className="login-button"
                  variant="bordered"
                  fullWidth
                  size="lg"
                  onClick={(e) => {
                    e.preventDefault()
                    onSwitchToRegister()
                  }}
                >
                  Crear Cuenta
                </Button>
              </form>

              <div className="form-footer">
                <p>
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault()
                      onSwitchToForgotPassword()
                    }}
                    style={{ color: '#666', textDecoration: 'underline', cursor: 'pointer', marginRight: '16px' }}
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                  <a href="#help" style={{ color: '#666', textDecoration: 'underline', cursor: 'pointer' }}>Contáctanos</a>
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Login
