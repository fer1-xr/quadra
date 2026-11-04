import React, { useState } from 'react'
import PageHead, { Figures } from './PageHead'
import axios from 'axios'
import { Card, CardBody, CardHeader, Button, Input, Select, SelectItem, Checkbox, Spinner, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react'
import { Download } from 'lucide-react'
import { Var, MoneyInput, IntInput, SetChoice, TermToggle, Step, F, fmtGs } from './MathInputs'
import '../styles/LiquidacionSalarial.css'

const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://quadra-45d6.onrender.com'

/** Cálculo de la liquidación (Código Laboral, Ley 213/93). Puro: sirve para la vista previa y el resultado. */
function liquidar(formData) {
  // Cálculos
  const salarioDiario = formData.salarioMensual / 30
  const salarioDevengado = salarioDiario * formData.diasTrabajados

  // Horas extras
  const extrasPorMes = formData.horasExtras
  const salarioHora = formData.salarioMensual / 240 // 30 días * 8 horas
  const montoHorasExtras = salarioHora * extrasPorMes * (Number(formData.tasaHoraExtra) === 2 ? 2 : 1.5)

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

  return {
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
}

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

    setResultado(liquidar(formData))
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

  const set = (name) => (value) => setFormData((prev) => ({ ...prev, [name]: value }))
  const vista = liquidar(formData)
  const S = formData.salarioMensual
  const sd = S / 30
  const k = Number(formData.tasaHoraExtra) === 2 ? 2 : 1.5
  const diasIndem = Math.min(15 + Math.floor(formData.diasTrabajados / 365), 30)
  const g = (n) => fmtGs(n)
  const MODALIDADES = [
    { value: 'renuncia', label: 'Renuncia' },
    { value: 'retiro-justificado', label: 'Retiro justificado' },
    { value: 'despido-justificado', label: 'Despido justificado' },
    { value: 'despido-injustificado', label: 'Despido injustificado' }
  ]

  return (
    <div className="liquidacion-container">
      <PageHead
        title="Liquidación Salarial"
        lede="Calcula liquidaciones de nómina según regulaciones de Paraguay."
        equation={[{ v: 'Neto' }, { op: '=' }, { v: 'Haberes' }, { op: '−' }, { v: 'Deducciones' }]}
        caption="liquidación por empleado"
      />
      <div className="card">

        {error && <div className="error-message">{error}</div>}

        {!resultado ? (
          <form className="qm" onSubmit={(e) => { e.preventDefault(); calcularLiquidacion() }}>
            <div className="qm-vars">
              <section className="qm-block">
                <h3 className="qm-legend">Empleado</h3>
                <div className="qm-ident">
                  <label className="qm-ident__f qm-ident__f--grow">
                    <span>Nombre y apellido</span>
                    <input className="qm-in" type="text" name="nombreEmpleado" value={formData.nombreEmpleado} onChange={handleChange} placeholder="Juan García" autoComplete="off" required />
                  </label>
                  <label className="qm-ident__f">
                    <span>Cédula de identidad</span>
                    <input className="qm-in qm-in--num" type="text" inputMode="numeric" name="cedula" value={formData.cedula} onChange={handleChange} placeholder="1234567" autoComplete="off" required />
                  </label>
                  <label className="qm-ident__f">
                    <span>Cargo</span>
                    <input className="qm-in" type="text" name="cargo" value={formData.cargo} onChange={handleChange} placeholder="Gerente" autoComplete="off" />
                  </label>
                </div>
              </section>

              <section className="qm-block">
                <h3 className="qm-legend">Período</h3>
                <Var sym="S" label="Salario mensual" htmlFor="liq-S" unit="₲">
                  <MoneyInput id="liq-S" value={formData.salarioMensual} onChange={set('salarioMensual')} />
                </Var>
                <Var sym="d" label="Días trabajados" hint="0 – 31" htmlFor="liq-d" unit="días">
                  <IntInput id="liq-d" value={formData.diasTrabajados} onChange={set('diasTrabajados')} min={0} max={31} />
                </Var>
                <Var sym="t" sub="0" label="Fecha de ingreso" htmlFor="liq-t0">
                  <input id="liq-t0" className="qm-in qm-in--num qm-in--date" type="date" name="fechaIngreso" value={formData.fechaIngreso} onChange={handleChange} />
                </Var>
                <Var sym="t" sub="1" label="Fecha de egreso" htmlFor="liq-t1">
                  <input id="liq-t1" className="qm-in qm-in--num qm-in--date" type="date" name="fechaEgreso" value={formData.fechaEgreso} onChange={handleChange} />
                </Var>
                <Var sym="m" label="Modalidad" op="∈" wide>
                  <SetChoice name="liq-m" label="Modalidad de liquidación" value={formData.modalidad} options={MODALIDADES} onChange={set('modalidad')} />
                </Var>
              </section>

              <section className="qm-block">
                <h3 className="qm-legend">Complementos</h3>
                <Var sym="h" label="Horas extras" htmlFor="liq-h" unit="h">
                  <IntInput id="liq-h" value={formData.horasExtras} onChange={set('horasExtras')} />
                </Var>
                <Var sym="k" label="Recargo por hora extra" op="∈">
                  <SetChoice name="liq-k" label="Recargo por hora extra" value={k} options={[{ value: 1.5, label: '× 1,5' }, { value: 2, label: '× 2' }]} onChange={(v) => set('tasaHoraExtra')(Number(v))} />
                </Var>
                <Var sym="B" label="Bonificaciones" htmlFor="liq-B" unit="₲">
                  <MoneyInput id="liq-B" value={formData.bonificaciones} onChange={set('bonificaciones')} />
                </Var>
                <Var sym="v" label="Vacaciones no gozadas" htmlFor="liq-v" unit="días">
                  <IntInput id="liq-v" value={formData.vacacionesNoGozadas} onChange={set('vacacionesNoGozadas')} />
                </Var>
              </section>

              <section className="qm-block">
                <h3 className="qm-legend">Deducciones</h3>
                <div className="qm-terms">
                  <TermToggle id="liq-afp" checked={formData.afiliadoAFP} onChange={set('afiliadoAFP')}>
                    <span className="qm-sym"><i>α</i></span> AFP <span className="qm-terms__rate">{fmtGs(formData.porcentajeAFP, 0)} %</span>
                  </TermToggle>
                  <TermToggle id="liq-ips" checked={formData.afiliadoIPS} onChange={set('afiliadoIPS')}>
                    <span className="qm-sym"><i>β</i></span> IPS <span className="qm-terms__rate">{fmtGs(formData.porcentajeIPS, 3)} %</span>
                  </TermToggle>
                  <span className="qm-toggle is-fixed">
                    <span className="qm-sym"><i>ρ</i></span> Impuesto a la Renta <span className="qm-terms__rate">5 %</span>
                  </span>
                </div>
              </section>
            </div>

            <aside className="qm-deriv" aria-label="Derivación">
              <h3 className="qm-legend">Derivación</h3>
              <Step value={g(sd)}><F t={[{ v: 'S', sub: 'd' }, { op: '=' }, { v: 'S' }, { op: '÷' }, { n: '30' }]} /></Step>
              <Step value={g(vista.salarioDevengado)}><F t={[{ v: 'S', sub: 'd' }, { op: '×' }, { v: 'd' }]} /></Step>
              <Step value={g(vista.decimotercera)}><F t={[{ w: 'Aguinaldo' }, { op: '=' }, { v: 'S' }, { op: '÷' }, { n: '360' }, { op: '×' }, { v: 'd' }]} /></Step>
              {formData.horasExtras > 0 && <Step value={g(vista.horasExtras)}><F t={[{ v: 'S' }, { op: '÷' }, { n: '240' }, { op: '×' }, { v: 'h' }, { op: '×' }, { n: k === 2 ? '2' : '1,5' }]} /></Step>}
              {formData.vacacionesNoGozadas > 0 && <Step value={g(vista.vacaciones)}><F t={[{ v: 'S', sub: 'd' }, { op: '×' }, { v: 'v' }]} /></Step>}
              {formData.bonificaciones > 0 && <Step value={g(vista.bonificaciones)}><F t={[{ v: 'B' }]} /></Step>}
              {vista.indemnizacion > 0 && <Step value={g(vista.indemnizacion)}><F t={[{ w: 'Indemnización' }, { op: '=' }, { v: 'S', sub: 'd' }, { op: '×' }, { n: String(diasIndem) }]} /></Step>}
              {vista.preaviso > 0 && <Step value={g(vista.preaviso)}><F t={formData.modalidad === 'despido-injustificado' ? [{ w: 'Preaviso' }, { op: '=' }, { v: 'S' }] : [{ w: 'Preaviso' }, { op: '=' }, { v: 'S', sub: 'd' }, { op: '×' }, { n: '15' }]} /></Step>}
              <Step kind="sum" value={g(vista.totalDevengado)}><F t={[{ v: 'H' }, { op: '=' }, { op: 'Σ' }, { w: 'haberes' }]} /></Step>
              <Step value={'− ' + g(vista.descuentoAFP + vista.descuentoIPS)}><F t={[{ v: 'H' }, { op: '×' }, { op: '(' }, { v: 'α' }, { op: '+' }, { v: 'β' }, { op: ')' }]} /></Step>
              <Step value={'− ' + g(vista.impuestoRenta)}><F t={[{ v: 'ρ' }, { op: '×' }, { op: '(' }, { v: 'H' }, { op: '−' }, { w: 'aportes' }, { op: ')' }]} /></Step>
              <Step kind="total" value={<>{g(vista.neto)} <small>₲</small></>}><F t={[{ v: 'Neto' }, { op: '=' }, { v: 'H' }, { op: '−' }, { v: 'D' }]} /></Step>
              <p className="qm-deriv__note">{S ? 'Vista previa en vivo. El resumen y los archivos se generan al calcular.' : 'Ingresa el salario mensual para ver la derivación.'}</p>
              <button type="submit" className="btn btn-primary qm-deriv__go">Calcular liquidación</button>
            </aside>
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
                Descargar Excel
              </button>
              <button
                className="btn btn-danger"
                onClick={descargarPDF}
                disabled={loading}
              >
                Descargar PDF
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setResultado(null)}
              >
                Nueva Liquidación
              </button>
            </div>

            <div className="leyes-footer">
              <p><strong>Marco Legal:</strong></p>
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
