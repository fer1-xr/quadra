import React, { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, ArrowRight, ShieldCheck, FileCheck2, Landmark } from 'lucide-react'
import { authService } from '../services/authService'
import AuthShell from './AuthShell'

function Login({ onLogin, onSwitchToRegister, onSwitchToForgotPassword }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    <AuthShell>
      <section className="ql-hero">
        <p className="ql-eyebrow">Conciliación contable · Paraguay</p>
        <h1 className="ql-title">
          Cada guaraní,<br />
          <span className="ql-serif">conciliado.</span>
        </h1>
        <p className="ql-sub">
          Extractos bancarios, documentos de SIFEN y registros contables, cruzados en un solo lugar.
          El cierre mensual con evidencia, no con planillas.
        </p>
        <ul className="ql-meta">
          <li><Landmark size={15} /> Extractos bancarios</li>
          <li><FileCheck2 size={15} /> Documentos SIFEN</li>
          <li><ShieldCheck size={15} /> Datos cifrados</li>
        </ul>
      </section>

      <section className="ql-card" aria-labelledby="ql-card-title">
        <div className="ql-card__head">
          <h2 id="ql-card-title">Bienvenido de nuevo</h2>
          <p>Inicia sesión en tu cuenta de Quadra.</p>
        </div>

        <form onSubmit={handleSubmit} className="ql-form" noValidate>
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
            <div className="ql-field__row">
              <label htmlFor="password">Contraseña</label>
              <a
                href="#forgot"
                className="ql-link"
                onClick={(e) => {
                  e.preventDefault()
                  onSwitchToForgotPassword()
                }}
              >
                ¿La olvidaste?
              </a>
            </div>
            <div className="ql-input">
              <Lock size={16} className="ql-input__icon" aria-hidden="true" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                Iniciando sesión…
              </>
            ) : (
              <>
                Iniciar sesión
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <div className="ql-divider"><span>¿Nuevo en Quadra?</span></div>

          <button
            type="button"
            className="ql-btn ql-btn--line"
            onClick={(e) => {
              e.preventDefault()
              onSwitchToRegister()
            }}
          >
            Crear cuenta
          </button>
        </form>

        <p className="ql-foot">
          ¿Necesitas ayuda? <a href="#help" className="ql-link">Contáctanos</a>
        </p>
      </section>
    </AuthShell>
  )
}

export default Login
