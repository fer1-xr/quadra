import React, { useState } from 'react'
import axios from 'axios'
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi'

function ResetPassword({ token, onSuccess }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [showPassword, setShowPassword] = useState(false)

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!password) {
      setError('La contraseña es requerida')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (passwordStrength < 3) {
      setError('La contraseña debe ser más fuerte (mínimo 8 caracteres, mayúsculas, números y símbolos)')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post('/api/auth/reset-password', {
        token,
        newPassword: password
      })
      setSuccess('✅ Contraseña actualizada exitosamente!')
      setTimeout(() => {
        onSuccess()
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>QUΔDRA</h1>
        <p>Establecer Nueva Contraseña</p>

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
            <label>Nueva Contraseña</label>
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

            {password && (
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

          <div className="form-group">
            <label>Confirmar Contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{borderColor: password && confirmPassword && password !== confirmPassword ? '#ef4444' : '#ddd'}}
            />
            {password && confirmPassword && password !== confirmPassword && (
              <small style={{color: '#ef4444'}}>Las contraseñas no coinciden</small>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{width:'100%'}}
            disabled={loading || passwordStrength < 3 || !confirmPassword || password !== confirmPassword}
          >
            {loading ? 'Procesando...' : 'Cambiar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ResetPassword
