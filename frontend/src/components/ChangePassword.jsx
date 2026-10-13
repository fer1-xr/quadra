import React, { useState } from 'react'
import axios from 'axios'
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi'

function ChangePassword({ onClose, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

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

  const handleNewPasswordChange = (e) => {
    const pass = e.target.value
    setNewPassword(pass)
    setPasswordStrength(calculatePasswordStrength(pass))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!currentPassword) {
      setError('La contraseña actual es requerida')
      return
    }

    if (!newPassword) {
      setError('La nueva contraseña es requerida')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Las nuevas contraseñas no coinciden')
      return
    }

    if (passwordStrength < 3) {
      setError('La nueva contraseña debe ser más fuerte (mínimo 8 caracteres, mayúsculas, números y símbolos)')
      return
    }

    if (currentPassword === newPassword) {
      setError('La nueva contraseña no puede ser igual a la actual')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('quaedra_token')
      const response = await axios.post(
        '/api/auth/change-password',
        {
          currentPassword,
          newPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      setSuccess('✅ Contraseña actualizada exitosamente!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordStrength(0)

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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '30px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{marginTop: 0, marginBottom: '20px', textAlign: 'center'}}>Cambiar Contraseña</h2>

        {error && (
          <div style={{
            color: '#ef4444',
            background: '#fee2e2',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            color: '#16a34a',
            background: '#dcfce7',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '14px'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{marginBottom: '15px'}}>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500'}}>
              Contraseña Actual
            </label>
            <div style={{position: 'relative'}}>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  paddingRight: '40px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.color = '#4b5563'}
                onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
              >
                {showCurrentPassword ? <HiOutlineEyeOff size={18} /> : <HiOutlineEye size={18} />}
              </button>
            </div>
          </div>

          <div style={{marginBottom: '15px'}}>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500'}}>
              Nueva Contraseña
            </label>
            <div style={{position: 'relative'}}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={handleNewPasswordChange}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  paddingRight: '40px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.color = '#4b5563'}
                onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
              >
                {showNewPassword ? <HiOutlineEyeOff size={18} /> : <HiOutlineEye size={18} />}
              </button>
            </div>

            {newPassword && (
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

          <div style={{marginBottom: '15px'}}>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500'}}>
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '10px',
                border: newPassword && confirmPassword && newPassword !== confirmPassword ? '1px solid #ef4444' : '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <small style={{color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '12px'}}>
                Las contraseñas no coinciden
              </small>
            )}
          </div>

          <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '10px',
                background: '#1f2937',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: loading || passwordStrength < 3 || !newPassword || !confirmPassword ? 0.6 : 1,
                pointerEvents: loading || passwordStrength < 3 || !newPassword || !confirmPassword ? 'none' : 'auto'
              }}
              disabled={loading || passwordStrength < 3 || !newPassword || !confirmPassword}
            >
              {loading ? 'Procesando...' : 'Cambiar Contraseña'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px',
                background: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChangePassword
