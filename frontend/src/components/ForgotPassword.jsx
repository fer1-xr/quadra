import React, { useState, useEffect, useRef } from 'react'
import { Button, Input, Card, CardBody } from '@heroui/react'
import { authService } from '../services/authService'
import '../styles/Login.css'

function ForgotPassword({ onBackToLogin }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
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

  useEffect(() => {
    getDominantColor(images[currentImageIndex])

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [currentImageIndex])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!email) {
      setError('El email es requerido')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email inválido')
      return
    }

    setLoading(true)

    try {
      await authService.forgotPassword(email)
      setSuccess(true)
      setEmail('')
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
        {/* Lado izquierdo - Carrusel */}
        <div className="login-branding image-carousel">
          <img
            src={images[currentImageIndex]}
            alt="Recuperar contraseña"
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
                <h2 className="form-title">Recuperar Contraseña</h2>
                <p className="form-subtitle">Ingresa tu email para recibir un enlace de recuperación</p>
              </div>

              <form onSubmit={handleSubmit} className="login-form">
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

                {error && (
                  <div className="error-message">
                    <span className="error-icon">⚠</span>
                    {error}
                  </div>
                )}

                {success && (
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: '#d4edda',
                      color: '#155724',
                      borderRadius: '4px',
                      fontSize: '14px',
                      marginBottom: '16px',
                      border: '1px solid #c3e6cb'
                    }}
                  >
                    ✓ Se ha enviado un email de recuperación a {email}. Por favor revisa tu bandeja de entrada.
                  </div>
                )}

                <Button
                  type="submit"
                  className="login-button"
                  isLoading={loading}
                  fullWidth
                  size="lg"
                  disabled={success}
                >
                  {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
                </Button>

                <Button
                  type="button"
                  className="login-button"
                  variant="bordered"
                  fullWidth
                  size="lg"
                  onClick={onBackToLogin}
                  style={{ marginTop: '12px' }}
                >
                  Volver al Login
                </Button>
              </form>

              <div className="form-footer">
                <p>¿Necesitas ayuda? <a href="#help">Contáctanos</a></p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
