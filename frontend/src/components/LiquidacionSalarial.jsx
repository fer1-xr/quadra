import React, { useState } from 'react'
import axios from 'axios'
import '../styles/LiquidacionSalarial.css'

const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://quadra-45d6.onrender.com'

function LiquidacionSalarial() {
  const [formData, setFormData] = useState({
    // Datos del empleado
    nombreEmpleado: '',
    cedula: '',
    cargo: '',

    // Datos de la liquidación
    salarioMensual: 0,
    fechaIngreso: '',
    fechaEgreso: '',
    diasTrabajados: 30,
    modalidad: 'despido-injustificado', // renuncia, retiro-justificado, despido-justificado, despido-injustificado

    // Complementos
    horasExtras: 0,
    tasaHoraExtra: 1.5, // 50% o 100%
    bonificaciones: 0,
    vacacionesNoGozadas: 0,

    // Descuentos
    afiliadoAFP: true,
    porcentajeAFP: 10,
    afiliadoIPS: true,
    porcentajeIPS: 9.625,
  })

  const [resultado, setResultado] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value
    }))
  }

  const calcularLiquidacion = () => {
    setError('')

    // Validaciones
    if (!formData.nombreEmpleado || !formData.cedula || !formData.salarioMensual) {
      setError('Por favor, complete los datos del empleado (nombre, cédula, salario)')
      return
    }

    // Cálculos
    const salarioDiario = formData.salarioMensual / 30
    const salarioDevengado = salarioDiario * formData.diasTrabajados

    // Horas extras
    const extrasPorMes = formData.horasExtras
    const salarioHora = formData.salarioMensual / 240 // 30 días * 8 horas
    const montoHorasExtras = salarioHora * extrasPorMes * (formData.tasaHoraExtra === 1.5 ? 1.5 : 2)

    // Decimotercera (proporcional)
    const decimoterceraMensual = formData.salarioMensual / 12
    const decimoterceraProporcional = (decimoterceraMensual / 30) * formData.diasTrabajados

    // Vacaciones no gozadas (en días, se convierte a monto)
    const montoVacaciones = (salarioDiario * formData.vacacionesNoGozadas)

    // Subtotal antes de indemnización
    const subtotalAntes = salarioDevengado + montoHorasExtras + decimoterceraProporcional + montoVacaciones + formData.bonificaciones

    // Indemnización según modalidad (Código Laboral - Artículos 65-67)
    let indemnizacion = 0
    let preaviso = 0

    if (formData.modalidad === 'despido-injustificado') {
      // DESPIDO INJUSTIFICADO
      // Indemnización: 15 días + 1 día por año de antigüedad (máximo 30 días)
      // Preaviso: 30 días en su lugar
      const diasAntiguedad = Math.floor(formData.diasTrabajados / 365)
      const diasIndemnizacion = Math.min(15 + diasAntiguedad, 30)
      indemnizacion = salarioDiario * diasIndemnizacion
      preaviso = formData.salarioMensual
    } else if (formData.modalidad === 'despido-justificado') {
      // DESPIDO JUSTIFICADO
      // Indemnización: NINGUNA
      // Preaviso: 15 días
      indemnizacion = 0
      preaviso = salarioDiario * 15
    } else if (formData.modalidad === 'retiro-justificado') {
      // RETIRO JUSTIFICADO (iniciado por el empleado)
      // Indemnización: NINGUNA
      // Preaviso: 15 días
      indemnizacion = 0
      preaviso = salarioDiario * 15
    } else if (formData.modalidad === 'renuncia') {
      // RENUNCIA
      // Indemnización: NINGUNA
      // Preaviso: 15 días
      indemnizacion = 0
      preaviso = salarioDiario * 15
    }

    // Total devengado
    const totalDevengado = subtotalAntes + indemnizacion + preaviso

    // Cálculo de descuentos
    const descuentoAFP = formData.afiliadoAFP ? (totalDevengado * formData.porcentajeAFP) / 100 : 0
    const descuentoIPS = formData.afiliadoIPS ? (totalDevengado * formData.porcentajeIPS) / 100 : 0

    // Impuesto a la Renta (5%)
    const baseImpuesto = totalDevengado - descuentoAFP - descuentoIPS
    const impuestoRenta = baseImpuesto > 0 ? (baseImpuesto * 0.05) : 0

    const totalDescuentos = descuentoAFP + descuentoIPS + impuestoRenta
    const neto = totalDevengado - totalDescuentos

    const resultado = {
      // Devengos
      salarioDevengado: parseFloat(salarioDevengado.toFixed(2)),
      horasExtras: parseFloat(montoHorasExtras.toFixed(2)),
      decimotercera: parseFloat(decimoterceraProporcional.toFixed(2)),
      vacaciones: parseFloat(montoVacaciones.toFixed(2)),
      bonificaciones: parseFloat(formData.bonificaciones.toFixed(2)),
      subtotal: parseFloat(subtotalAntes.toFixed(2)),
      indemnizacion: parseFloat(indemnizacion.toFixed(2)),
      preaviso: parseFloat(preaviso.toFixed(2)),
      totalDevengado: parseFloat(totalDevengado.toFixed(2)),

      // Descuentos
      descuentoAFP: parseFloat(descuentoAFP.toFixed(2)),
      descuentoIPS: parseFloat(descuentoIPS.toFixed(2)),
      impuestoRenta: parseFloat(impuestoRenta.toFixed(2)),
      totalDescuentos: parseFloat(totalDescuentos.toFixed(2)),

      // Neto
      neto: parseFloat(neto.toFixed(2)),

      // Datos para el documento
      ...formData
    }

    setResultado(resultado)
  }

  const descargarExcel = async () => {
    if (!resultado) return

    try {
      setLoading(true)
      const token = localStorage.getItem('quaedra_token')
      const response = await axios.post(`${API_BASE_URL}/api/liquidacion/excel`, resultado, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Liquidacion_${resultado.nombreEmpleado}_${Date.now()}.xlsx`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Error al descargar el archivo Excel')
    } finally {
      setLoading(false)
    }
  }

  const descargarPDF = async () => {
    if (!resultado) return

    try {
      setLoading(true)
      const token = localStorage.getItem('quaedra_token')
      const response = await axios.post(`${API_BASE_URL}/api/liquidacion/pdf`, resultado, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Liquidacion_${resultado.nombreEmpleado}_${Date.now()}.pdf`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Error al descargar el archivo PDF')
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n) => parseFloat(n).toLocaleString('es-PY', { minimumFractionDigits: 2 })

  return (
    <div className="liquidacion-container">
      <div className="card">
        <h2>💰 Calculadora de Liquidación Salarial</h2>
        <p className="subtitle">Calcula liquidaciones de nómina según regulaciones de Paraguay</p>

        {error && <div className="error-message">{error}</div>}

        {!resultado ? (
          <form className="liquidacion-form">
            {/* Sección: Datos del Empleado */}
            <section className="form-section">
              <h3>👤 Datos del Empleado</h3>
              <div className="form-grid">
                <div>
                  <label>Nombre del Empleado *</label>
                  <input
                    type="text"
                    name="nombreEmpleado"
                    value={formData.nombreEmpleado}
                    onChange={handleChange}
                    placeholder="Ej: Juan García"
                    required
                  />
                </div>
                <div>
                  <label>Cédula de Identidad *</label>
                  <input
                    type="text"
                    name="cedula"
                    value={formData.cedula}
                    onChange={handleChange}
                    placeholder="Ej: 1234567"
                    required
                  />
                </div>
                <div>
                  <label>Cargo</label>
                  <input
                    type="text"
                    name="cargo"
                    value={formData.cargo}
                    onChange={handleChange}
                    placeholder="Ej: Gerente"
                  />
                </div>
              </div>
            </section>

            {/* Sección: Periodo de Liquidación */}
            <section className="form-section">
              <h3>📅 Período de Liquidación</h3>
              <div className="form-grid">
                <div>
                  <label>Salario Mensual *</label>
                  <input
                    type="number"
                    name="salarioMensual"
                    value={formData.salarioMensual}
                    onChange={handleChange}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label>Fecha de Ingreso</label>
                  <input
                    type="date"
                    name="fechaIngreso"
                    value={formData.fechaIngreso}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label>Fecha de Egreso</label>
                  <input
                    type="date"
                    name="fechaEgreso"
                    value={formData.fechaEgreso}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label>Días Trabajados</label>
                  <input
                    type="number"
                    name="diasTrabajados"
                    value={formData.diasTrabajados}
                    onChange={handleChange}
                    min="0"
                    max="31"
                  />
                </div>
                <div>
                  <label>Modalidad de Liquidación *</label>
                  <select
                    name="modalidad"
                    value={formData.modalidad}
                    onChange={handleChange}
                  >
                    <option value="renuncia">Renuncia</option>
                    <option value="retiro-justificado">Retiro Justificado</option>
                    <option value="despido-justificado">Despido Justificado</option>
                    <option value="despido-injustificado">Despido Injustificado</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Sección: Complementos */}
            <section className="form-section">
              <h3>➕ Complementos Salariales</h3>
              <div className="form-grid">
                <div>
                  <label>Horas Extras (cantidad)</label>
                  <input
                    type="number"
                    name="horasExtras"
                    value={formData.horasExtras}
                    onChange={handleChange}
                    min="0"
                  />
                </div>
                <div>
                  <label>Tasa de Hora Extra</label>
                  <select
                    name="tasaHoraExtra"
                    value={formData.tasaHoraExtra}
                    onChange={handleChange}
                  >
                    <option value="1.5">50% (1.5x)</option>
                    <option value="2">100% (2x)</option>
                  </select>
                </div>
                <div>
                  <label>Bonificaciones</label>
                  <input
                    type="number"
                    name="bonificaciones"
                    value={formData.bonificaciones}
                    onChange={handleChange}
                    min="0"
                  />
                </div>
                <div>
                  <label>Días de Vacaciones No Gozadas</label>
                  <input
                    type="number"
                    name="vacacionesNoGozadas"
                    value={formData.vacacionesNoGozadas}
                    onChange={handleChange}
                    min="0"
                  />
                </div>
              </div>
            </section>

            {/* Sección: Descuentos */}
            <section className="form-section">
              <h3>📉 Descuentos</h3>
              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="afiliadoAFP"
                    checked={formData.afiliadoAFP}
                    onChange={handleChange}
                  />
                  Afiliado a AFP ({formData.porcentajeAFP}%)
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="afiliadoIPS"
                    checked={formData.afiliadoIPS}
                    onChange={handleChange}
                  />
                  Afiliado a IPS ({formData.porcentajeIPS}%)
                </label>
              </div>
              <p className="info-text">Impuesto a la Renta: 5% aplicado automáticamente</p>
            </section>

            <button
              type="button"
              className="btn btn-primary"
              onClick={calcularLiquidacion}
            >
              🧮 Calcular Liquidación
            </button>
          </form>
        ) : (
          <div className="resultado-section">
            <h3>Resumen de Liquidación - {resultado.nombreEmpleado}</h3>
            <div className="resultado-grid">
              {/* Devengos */}
              <div className="resultado-card">
                <h4>Devengos</h4>
                <div className="resultado-item">
                  <span>Salario Devengado:</span>
                  <strong>₲ {fmt(resultado.salarioDevengado)}</strong>
                </div>
                {resultado.horasExtras > 0 && (
                  <div className="resultado-item">
                    <span>Horas Extras:</span>
                    <strong>₲ {fmt(resultado.horasExtras)}</strong>
                  </div>
                )}
                {resultado.decimotercera > 0 && (
                  <div className="resultado-item">
                    <span>Decimotercera Proporcional:</span>
                    <strong>₲ {fmt(resultado.decimotercera)}</strong>
                  </div>
                )}
                {resultado.vacaciones > 0 && (
                  <div className="resultado-item">
                    <span>Vacaciones No Gozadas:</span>
                    <strong>₲ {fmt(resultado.vacaciones)}</strong>
                  </div>
                )}
                {resultado.bonificaciones > 0 && (
                  <div className="resultado-item">
                    <span>Bonificaciones:</span>
                    <strong>₲ {fmt(resultado.bonificaciones)}</strong>
                  </div>
                )}
                <div className="resultado-divider"></div>
                {resultado.indemnizacion > 0 && (
                  <div className="resultado-item">
                    <span>Indemnización:</span>
                    <strong>₲ {fmt(resultado.indemnizacion)}</strong>
                  </div>
                )}
                {resultado.preaviso > 0 && (
                  <div className="resultado-item">
                    <span>Preaviso:</span>
                    <strong>₲ {fmt(resultado.preaviso)}</strong>
                  </div>
                )}
                <div className="resultado-item total">
                  <span>Total Devengado:</span>
                  <strong>₲ {fmt(resultado.totalDevengado)}</strong>
                </div>
              </div>

              {/* Descuentos */}
              <div className="resultado-card">
                <h4>Descuentos</h4>
                {resultado.descuentoAFP > 0 && (
                  <div className="resultado-item">
                    <span>Descuento AFP:</span>
                    <strong>₲ {fmt(resultado.descuentoAFP)}</strong>
                  </div>
                )}
                {resultado.descuentoIPS > 0 && (
                  <div className="resultado-item">
                    <span>Descuento IPS:</span>
                    <strong>₲ {fmt(resultado.descuentoIPS)}</strong>
                  </div>
                )}
                {resultado.impuestoRenta > 0 && (
                  <div className="resultado-item">
                    <span>Impuesto a la Renta:</span>
                    <strong>₲ {fmt(resultado.impuestoRenta)}</strong>
                  </div>
                )}
                <div className="resultado-divider"></div>
                <div className="resultado-item total">
                  <span>Total Descuentos:</span>
                  <strong>₲ {fmt(resultado.totalDescuentos)}</strong>
                </div>
              </div>

              {/* Neto */}
              <div className="resultado-card neto-card">
                <h4>Total a Pagar</h4>
                <div className="resultado-item total" style={{ fontSize: '24px' }}>
                  <span>Neto:</span>
                  <strong style={{ color: '#27ae60' }}>₲ {fmt(resultado.neto)}</strong>
                </div>
              </div>
            </div>

            <div className="button-group">
              <button
                className="btn btn-success"
                onClick={descargarExcel}
                disabled={loading}
              >
                📊 Descargar Excel
              </button>
              <button
                className="btn btn-danger"
                onClick={descargarPDF}
                disabled={loading}
              >
                📄 Descargar PDF
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setResultado(null)}
              >
                🔄 Nueva Liquidación
              </button>
            </div>

            <div className="leyes-footer">
              <p><strong>⚖️ Marco Legal:</strong></p>
              <ul className="leyes-list">
                <li>Código Laboral de Paraguay (Ley Nº 213/1993) - Artículos 65-67: Despido, Retiro Justificado y Renuncia</li>
                <li>Artículo 88: Decimotercera remuneración proporcional</li>
                <li>Artículos 80-87: Régimen de Vacaciones</li>
                <li>Ley de AFP Nº 1.860/2002: Descuentos obligatorios de aportaciones</li>
                <li>Ley de Impuesto a la Renta Nº 2.421/2004: Cálculo de retenciones e impuestos</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LiquidacionSalarial
