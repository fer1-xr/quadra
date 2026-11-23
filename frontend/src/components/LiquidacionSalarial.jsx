import React, { useState } from 'react'
import PageHead from './PageHead'
import axios from 'axios'
import { Var, MoneyInput, IntInput, SetChoice, TermToggle, Step, fmtGs } from './MathInputs'
import GuardarEnNube from './GuardarEnNube'
import { API_BASE_URL, authHeaders } from '../services/api'
import { liquidar, conceptosDe, textoAntiguedad, MODALIDADES, TASA_IPS } from '../services/liquidacion'
import '../styles/LiquidacionSalarial.css'

function LiquidacionSalarial({ restaurar = null }) {
  const [formData, setFormData] = useState({
    // Datos del empleado
    nombreEmpleado: '',
    cedula: '',
    cargo: '',

    // Relación laboral
    salarioMensual: 0,
    fechaIngreso: '',
    fechaEgreso: '',
    modalidad: 'despido-injustificado',
    preavisoOtorgado: false,
    renunciaConPreaviso: true,

    // Pendiente de cobro
    diasPendientes: 0,
    horasExtras: 0,
    tasaHoraExtra: 1.5,
    bonificaciones: 0,

    // Vacaciones y aguinaldo
    vacacionesPendientes: 0,
    vacacionesProporcionales: true,
    vacacionesDobles: false,
    extrasDelAnio: 0,

    // Descuentos
    afiliadoIPS: true
  })

  const [resultado, setResultado] = useState(restaurar)
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

    if (!formData.nombreEmpleado || !formData.cedula || !formData.salarioMensual) {
      setError('Completá los datos del empleado: nombre, cédula y salario.')
      return
    }
    if (!formData.fechaIngreso || !formData.fechaEgreso) {
      setError('Ingresá la fecha de ingreso y el último día trabajado: de ellas salen la antigüedad, el preaviso y la indemnización.')
      return
    }
    if (formData.fechaEgreso < formData.fechaIngreso) {
      setError('El último día trabajado es anterior a la fecha de ingreso.')
      return
    }

    setResultado(liquidar(formData))
  }

  const descargar = async (tipo) => {
    if (!resultado) return

    try {
      setLoading(true)
      const auth = await authHeaders()
      const response = await axios.post(`${API_BASE_URL}/api/liquidacion/${tipo}`, { ...resultado, ...conceptosDe(resultado) }, {
        responseType: 'blob',
        headers: { ...auth }
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Liquidacion_${resultado.nombreEmpleado}_${Date.now()}.${tipo === 'excel' ? 'xlsx' : 'pdf'}`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(`Error al descargar el archivo ${tipo === 'excel' ? 'Excel' : 'PDF'}`)
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n) => (Number(n) || 0).toLocaleString('es-PY', { maximumFractionDigits: 0 })

  const set = (name) => (value) => setFormData((prev) => ({ ...prev, [name]: value }))
  const vista = liquidar(formData)
  const S = formData.salarioMensual
  const g = (n) => fmtGs(n)
  const esDespidoSinCausa = formData.modalidad === 'despido-injustificado'
  const esRetiro = formData.modalidad === 'retiro-justificado'
  const esRenuncia = formData.modalidad === 'renuncia'
  const conceptos = conceptosDe(resultado)

  return (
    <div className="liquidacion-container">
      <PageHead
        title="Liquidación Salarial"
        lede="Calcula la liquidación de un empleado según el Código del Trabajo de Paraguay."
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
                <h3 className="qm-legend">Relación laboral</h3>
                <Var label="Salario mensual" hint="Si varía, el promedio de los últimos 6 meses" htmlFor="liq-S" unit="₲">
                  <MoneyInput id="liq-S" value={formData.salarioMensual} onChange={set('salarioMensual')} />
                </Var>
                <Var label="Fecha de ingreso" htmlFor="liq-t0">
                  <input id="liq-t0" className="qm-in qm-in--num qm-in--date" type="date" name="fechaIngreso" value={formData.fechaIngreso} onChange={handleChange} />
                </Var>
                <Var label="Último día trabajado" hint={vista.antiguedad ? `Antigüedad: ${textoAntiguedad(vista.antiguedad)}` : undefined} htmlFor="liq-t1">
                  <input id="liq-t1" className="qm-in qm-in--num qm-in--date" type="date" name="fechaEgreso" value={formData.fechaEgreso} onChange={handleChange} />
                </Var>
                <Var label="Cómo termina la relación" wide>
                  <SetChoice name="liq-m" label="Cómo termina la relación" value={formData.modalidad} options={MODALIDADES} onChange={set('modalidad')} />
                </Var>
                {esDespidoSinCausa && (
                  <div className="qm-terms">
                    <TermToggle id="liq-preaviso" plain checked={formData.preavisoOtorgado} onChange={set('preavisoOtorgado')}>
                      El empleador dio el preaviso completo
                    </TermToggle>
                  </div>
                )}
                {esRenuncia && (
                  <div className="qm-terms">
                    <TermToggle id="liq-renuncia-preaviso" plain checked={formData.renunciaConPreaviso} onChange={set('renunciaConPreaviso')}>
                      El empleado avisó con el preaviso completo
                    </TermToggle>
                  </div>
                )}
              </section>

              <section className="qm-block">
                <h3 className="qm-legend">Pendiente de cobro</h3>
                <Var label="Días trabajados sin cobrar" hint="Del último mes" htmlFor="liq-d" unit="días">
                  <IntInput id="liq-d" value={formData.diasPendientes} onChange={set('diasPendientes')} min={0} max={31} />
                </Var>
                <Var label="Horas extras sin cobrar" htmlFor="liq-h" unit="h">
                  <IntInput id="liq-h" value={formData.horasExtras} onChange={set('horasExtras')} />
                </Var>
                {formData.horasExtras > 0 && (
                  <Var label="Recargo de las horas extras" wide>
                    <SetChoice
                      name="liq-k"
                      label="Recargo de las horas extras"
                      value={Number(formData.tasaHoraExtra) === 2 ? 2 : 1.5}
                      options={[{ value: 1.5, label: '50 % (diurnas)' }, { value: 2, label: '100 % (nocturnas o feriados)' }]}
                      onChange={(v) => set('tasaHoraExtra')(Number(v))}
                    />
                  </Var>
                )}
                <Var label="Otros haberes sin cobrar" hint="Comisiones, bonos" htmlFor="liq-B" unit="₲">
                  <MoneyInput id="liq-B" value={formData.bonificaciones} onChange={set('bonificaciones')} />
                </Var>
              </section>

              <section className="qm-block">
                <h3 className="qm-legend">Vacaciones y aguinaldo</h3>
                <Var label="Días de vacaciones no gozadas" hint="De años ya cumplidos" htmlFor="liq-v" unit="días">
                  <IntInput id="liq-v" value={formData.vacacionesPendientes} onChange={set('vacacionesPendientes')} />
                </Var>
                <Var label="Horas extras y comisiones cobradas este año" hint="Suman al aguinaldo" htmlFor="liq-x" unit="₲">
                  <MoneyInput id="liq-x" value={formData.extrasDelAnio} onChange={set('extrasDelAnio')} />
                </Var>
                <div className="qm-terms">
                  <TermToggle id="liq-vprop" plain checked={formData.vacacionesProporcionales} onChange={set('vacacionesProporcionales')}>
                    Pagar vacaciones proporcionales del año en curso
                  </TermToggle>
                  {formData.vacacionesPendientes > 0 && (
                    <TermToggle id="liq-vdoble" plain checked={formData.vacacionesDobles} onChange={set('vacacionesDobles')}>
                      Pagar las no gozadas al doble (art. 221)
                    </TermToggle>
                  )}
                </div>
              </section>

              <section className="qm-block">
                <h3 className="qm-legend">Descuentos</h3>
                <div className="qm-terms">
                  <TermToggle id="liq-ips" plain checked={formData.afiliadoIPS} onChange={set('afiliadoIPS')}>
                    Aporte IPS <span className="qm-terms__rate">{TASA_IPS} %</span>
                  </TermToggle>
                </div>
              </section>
            </div>

            <aside className="qm-deriv qm-deriv--plain" aria-label="Detalle del cálculo">
              <h3 className="qm-legend">Detalle</h3>
              {vista.antiguedad && (
                <Step value={textoAntiguedad(vista.antiguedad)}>
                  Antigüedad
                  {!vista.enPrueba && (esDespidoSinCausa || esRetiro) && (
                    <small>Preaviso {vista.diasPreaviso} días · indemnización {vista.aniosIndemnizacion} {vista.aniosIndemnizacion === 1 ? 'año' : 'años'}</small>
                  )}
                  {!vista.enPrueba && esRenuncia && <small>Preaviso {vista.diasPreaviso} días</small>}
                </Step>
              )}
              {S > 0 && <Step value={g(vista.salarioDiario)}>Salario diario<small>{g(S)} ÷ 30</small></Step>}
              {vista.haberes.map((h) => (
                <Step key={h.key} value={g(h.monto)}>{h.concepto}<small>{h.detalle}</small></Step>
              ))}
              <Step kind="sum" value={g(vista.totalDevengado)}>Total haberes</Step>
              {vista.descuentos.map((d) => (
                <Step key={d.key} tone="neg" value={'− ' + g(d.monto)}>{d.concepto}<small>{d.detalle}</small></Step>
              ))}
              <Step kind="total" value={<>{g(vista.neto)} <small>₲</small></>}>Neto a cobrar</Step>
              {vista.enPrueba && <p className="qm-warn">Menos de un mes de antigüedad: período de prueba, sin preaviso ni indemnización (art. 60).</p>}
              {vista.estabilidad && esDespidoSinCausa && (
                <p className="qm-warn">Con 10 años o más rige la estabilidad laboral (art. 94): el despido requiere causa probada ante un juez y, si no hay reintegro, la indemnización es doble. Este cálculo muestra la simple.</p>
              )}
              <p className="qm-deriv__note">
                {!S
                  ? 'Ingresá el salario mensual para ver el cálculo.'
                  : !vista.fechasOk
                    ? 'Ingresá las fechas para calcular antigüedad, aguinaldo, preaviso e indemnización.'
                    : 'Vista previa en vivo. El resumen y los archivos se generan al calcular.'}
              </p>
              <button type="submit" className="btn btn-primary qm-deriv__go">Calcular liquidación</button>
            </aside>
          </form>
        ) : (
          <div className="resultado-section">
            <h3>Resumen de Liquidación - {resultado.nombreEmpleado}</h3>
            {resultado.antiguedad && (
              <p className="resultado-meta">
                {MODALIDADES.find((m) => m.value === resultado.modalidad)?.label || resultado.modalidad} · Antigüedad: {textoAntiguedad(resultado.antiguedad)} · Salario diario: ₲ {fmt(resultado.salarioDiario)}
              </p>
            )}
            <div className="resultado-grid">
              <div className="resultado-card">
                <h4>Haberes</h4>
                {conceptos.haberes.map((h) => (
                  <div className="resultado-item" key={h.concepto}>
                    <span>{h.concepto}{h.detalle && <small className="resultado-detalle">{h.detalle}</small>}</span>
                    <strong>₲ {fmt(h.monto)}</strong>
                  </div>
                ))}
                <div className="resultado-divider"></div>
                <div className="resultado-item total">
                  <span>Total haberes:</span>
                  <strong>₲ {fmt(resultado.totalDevengado)}</strong>
                </div>
              </div>

              <div className="resultado-card">
                <h4>Descuentos</h4>
                {conceptos.descuentos.length === 0 && (
                  <div className="resultado-item"><span>Sin descuentos</span><strong>₲ 0</strong></div>
                )}
                {conceptos.descuentos.map((d) => (
                  <div className="resultado-item" key={d.concepto}>
                    <span>{d.concepto}{d.detalle && <small className="resultado-detalle">{d.detalle}</small>}</span>
                    <strong>₲ {fmt(d.monto)}</strong>
                  </div>
                ))}
                <div className="resultado-divider"></div>
                <div className="resultado-item total">
                  <span>Total descuentos:</span>
                  <strong>₲ {fmt(resultado.totalDescuentos)}</strong>
                </div>
              </div>

              <div className="resultado-card neto-card">
                <h4>Total a Pagar</h4>
                <div className="resultado-item total" style={{ fontSize: '24px' }}>
                  <span>Neto:</span>
                  <strong style={{ color: '#27ae60' }}>₲ {fmt(resultado.neto)}</strong>
                </div>
              </div>
            </div>

            <div className="button-group">
              <GuardarEnNube
                modulo="liquidacion"
                titulo={`Liquidación · ${resultado.nombreEmpleado || 'Empleado'}`}
                resumen={{ 'Total haberes': resultado.totalDevengado, Descuentos: resultado.totalDescuentos, Neto: resultado.neto }}
                datos={resultado}
              />
              <button className="btn btn-success" onClick={() => descargar('excel')} disabled={loading}>
                Descargar Excel
              </button>
              <button className="btn btn-danger" onClick={() => descargar('pdf')} disabled={loading}>
                Descargar PDF
              </button>
              <button className="btn btn-secondary" onClick={() => setResultado(null)}>
                Nueva Liquidación
              </button>
            </div>

            <div className="leyes-footer">
              <p><strong>Marco legal (Código del Trabajo, Ley 213/93 y Ley 496/95):</strong></p>
              <ul className="leyes-list">
                <li>Art. 87 y 90: preaviso de 30, 45, 60 o 90 días según antigüedad; quien renuncia sin avisar debe la mitad</li>
                <li>Art. 91 y 92: indemnización de 15 días de salario por año o fracción de más de 6 meses</li>
                <li>Art. 218 a 221: vacaciones de 12, 18 o 30 días; las no gozadas se pagan</li>
                <li>Art. 243 y 244: aguinaldo, la doceava parte de lo ganado en el año</li>
                <li>IPS: aporte del trabajador del 9 % sobre lo que es salario; no aplica al aguinaldo, preaviso ni indemnización</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LiquidacionSalarial
