import React, { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Check } from 'lucide-react'
import { authService } from '../services/authService'
import AuthShell from './AuthShell'

const PASSWORD_RULES = [
  { label: '8+ caracteres', test: (p) => p.length >= 8 },
  { label: 'Una minúscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Una mayúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Un número', test: (p) => /\d/.test(p) },
  { label: 'Un símbolo (@$!%*?&)', test: (p) => /[@$!%*?&]/.test(p) }
]

const STRENGTH_LABELS = ['Muy débil', 'Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte']

function Register({ onRegister, onSwitchToLogin }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const passwordStrength = PASSWORD_RULES.filter((rule) => rule.test(password)).length
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword

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

    if (passwordStrength < PASSWORD_RULES.length) {
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
    <AuthShell>
      <section className="ql-hero">
        <p className="ql-eyebrow">Crea tu espacio de trabajo</p>
        <h1 className="ql-title">
          Tu cierre,<br />
          <span className="ql-serif">sin planillas.</span>
        </h1>
        <p className="ql-sub">
          Abre tu cuenta y empieza a conciliar extractos, comprobantes de SIFEN y libros contables
          desde un mismo lugar.
        </p>
        <ol className="ql-steps">
          <li><span>01</span> Crea tu cuenta</li>
          <li><span>02</span> Importa tus extractos y documentos</li>
          <li><span>03</span> Concilia y cierra el mes con evidencia</li>
        </ol>
      </section>

      <section className="ql-card" aria-labelledby="ql-card-title">
        <div className="ql-card__head">
          <h2 id="ql-card-title">Crear cuenta</h2>
          <p>Regístrate para acceder a Quadra.</p>
        </div>

        <form onSubmit={handleSubmit} className="ql-form" noValidate>
          <div className="ql-field">
            <label htmlFor="name">Nombre completo</label>
            <div className="ql-input">
              <User size={16} className="ql-input__icon" aria-hidden="true" />
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="ql-field">
            <label htmlFor="email">Correo electrónico</label>
            <div className="ql-input">
              <Mail size={16} className="ql-input__icon" aria-hidden="true" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@empresa.com.py"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="ql-field">
            <label htmlFor="password">Contraseña</label>
            <div className="ql-input">
              <Lock size={16} className="ql-input__icon" aria-hidden="true" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby="password-rules"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="ql-input__toggle"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {password && (
              <div className="ql-strength" data-level={passwordStrength}>
                <div className="ql-strength__bar" aria-hidden="true">
                  {PASSWORD_RULES.map((_, i) => (
                    <span key={i} className={i < passwordStrength ? 'is-on' : ''} />
                  ))}
                </div>
                <span className="ql-strength__label">{STRENGTH_LABELS[passwordStrength]}</span>
              </div>
            )}

            <ul id="password-rules" className="ql-rules">
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(password)
                return (
                  <li key={rule.label} className={ok ? 'is-ok' : ''}>
                    <Check size={12} aria-hidden="true" />
                    {rule.label}
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="ql-field">
            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <div className={`ql-input ${passwordsMismatch ? 'is-invalid' : ''}`}>
              <Lock size={16} className="ql-input__icon" aria-hidden="true" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-invalid={passwordsMismatch}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="ql-input__toggle"
                aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordsMismatch && <p className="ql-hint ql-hint--err">Las contraseñas no coinciden.</p>}
          </div>

          {error && (
            <div className="ql-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="ql-btn ql-btn--primary" disabled={loading}>
            {loading ? (
              <>
                <span className="ql-spinner" aria-hidden="true" />
                Creando cuenta…
              </>
            ) : (
              <>
                Crear cuenta
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <div className="ql-divider"><span>¿Ya tienes cuenta?</span></div>

          <button
            type="button"
            className="ql-btn ql-btn--line"
            onClick={(e) => {
              e.preventDefault()
              onSwitchToLogin()
            }}
          >
            Iniciar sesión
          </button>
        </form>

        <p className="ql-foot">
          ¿Problemas para registrarte? <a href="#help" className="ql-link">Contáctanos</a>
        </p>
      </section>
    </AuthShell>
  )
}

export default Register
