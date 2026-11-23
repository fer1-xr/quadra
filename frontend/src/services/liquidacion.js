/**
 * Liquidación laboral en Paraguay (Código del Trabajo, Ley 213/93 y Ley 496/95).
 *
 * Reglas, verificadas contra las calculadoras de Skilio y Layers:
 * - Salario diario = salario mensual ÷ 30 (art. 92: promedio de los últimos 6 meses).
 * - Preaviso (art. 87): 30 días hasta 1 año de antigüedad, 45 hasta 5, 60 hasta 10 y 90 desde ahí.
 *   Lo cobra el trabajador si lo despiden sin causa (o se retira con causa) y no se le dio el aviso.
 *   Si renuncia sin avisar, debe la mitad (art. 90).
 * - Indemnización (art. 91): 15 salarios diarios por año o fracción de más de 6 meses.
 *   Sólo en despido injustificado y retiro justificado.
 * - Aguinaldo (arts. 243-244): la doceava parte de lo ganado en el año. Se paga siempre.
 * - Vacaciones (art. 218): 12 días hasta 5 años, 18 hasta 10, 30 desde ahí.
 *   Las causadas y no gozadas se pagan (al doble si correspondía gozarlas, art. 221)
 *   y las del año en curso, en proporción.
 * - IPS: 9 % del trabajador sobre lo que es salario. No lo pagan el aguinaldo,
 *   el preaviso ni la indemnización. No hay AFP ni retención de renta en una liquidación.
 */

export const MODALIDADES = [
  { value: 'renuncia', label: 'Renuncia' },
  { value: 'despido-injustificado', label: 'Despido sin causa' },
  { value: 'despido-justificado', label: 'Despido con causa' },
  { value: 'retiro-justificado', label: 'Retiro con causa' }
]

export const TASA_IPS = 9

const DIA = 86400000

const aFecha = (s) => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** Años, meses y días entre dos fechas, contando el último día como trabajado. */
export function lapso(desde, hastaInclusive) {
  const fin = new Date(hastaInclusive.getTime() + DIA)
  let y = fin.getUTCFullYear() - desde.getUTCFullYear()
  let m = fin.getUTCMonth() - desde.getUTCMonth()
  let d = fin.getUTCDate() - desde.getUTCDate()
  if (d < 0) {
    m -= 1
    d += new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth(), 0)).getUTCDate()
  }
  if (m < 0) {
    y -= 1
    m += 12
  }
  return { y, m, d }
}

export const diasVacacionesDelAnio = (n) => (n <= 5 ? 12 : n <= 10 ? 18 : 30)

export const diasPreaviso = (meses) => (meses <= 12 ? 30 : meses <= 60 ? 45 : meses <= 120 ? 60 : 90)

const gs = (n) => Math.round(n).toLocaleString('es-PY')
const dias = (n) => `${Number.isInteger(n) ? n : n.toLocaleString('es-PY', { maximumFractionDigits: 2 })} ${n === 1 ? 'día' : 'días'}`

export function textoAntiguedad(a) {
  if (!a) return ''
  const partes = []
  if (a.y) partes.push(`${a.y} ${a.y === 1 ? 'año' : 'años'}`)
  if (a.m) partes.push(`${a.m} ${a.m === 1 ? 'mes' : 'meses'}`)
  if (a.d || !partes.length) partes.push(`${a.d} ${a.d === 1 ? 'día' : 'días'}`)
  return partes.join(', ')
}

/** Cálculo completo. Puro: sirve para la vista previa y para el resultado. */
export function liquidar(f) {
  const S = Number(f.salarioMensual) || 0
  const sd = S / 30
  const ingreso = aFecha(f.fechaIngreso)
  const egreso = aFecha(f.fechaEgreso)
  const fechasOk = Boolean(ingreso && egreso && egreso >= ingreso)

  const antiguedad = fechasOk ? lapso(ingreso, egreso) : null
  const mesesTotales = antiguedad ? antiguedad.y * 12 + antiguedad.m + antiguedad.d / 30 : 0
  const enPrueba = antiguedad ? antiguedad.y === 0 && antiguedad.m === 0 : false
  const aniosIndemnizacion = antiguedad
    ? antiguedad.y + (antiguedad.m > 6 || (antiguedad.m === 6 && antiguedad.d > 0) ? 1 : 0)
    : 0
  const diasDePreaviso = antiguedad ? diasPreaviso(mesesTotales) : 0

  const conIndemnizacion = f.modalidad === 'despido-injustificado' || f.modalidad === 'retiro-justificado'

  const haberes = []
  const descuentos = []
  const add = (lista, key, concepto, detalle, monto, ips = false) => {
    const m = Math.round(monto)
    if (m > 0) lista.push({ key, concepto, detalle, monto: m, ips })
  }

  // Salario de los días trabajados que todavía no se cobraron
  const diasPend = Number(f.diasPendientes) || 0
  add(haberes, 'salario', 'Salario pendiente', `${dias(diasPend)} × ${gs(sd)}`, sd * diasPend, true)

  // Horas extras pendientes
  const recargo = Number(f.tasaHoraExtra) === 2 ? 2 : 1.5
  const horas = Number(f.horasExtras) || 0
  add(haberes, 'horas', 'Horas extras', `${horas} h × ${gs((S / 240) * recargo)} (hora + ${recargo === 2 ? '100' : '50'} %)`, (S / 240) * recargo * horas, true)

  // Otros haberes pendientes
  add(haberes, 'otros', 'Otros haberes', 'Comisiones, bonos', Number(f.bonificaciones) || 0, true)

  // Aguinaldo proporcional: lo ganado en el año ÷ 12
  let mesesAnio = 0
  if (fechasOk) {
    const enero = new Date(Date.UTC(egreso.getUTCFullYear(), 0, 1))
    const l = lapso(ingreso > enero ? ingreso : enero, egreso)
    mesesAnio = Math.min(12, l.y * 12 + l.m + l.d / 30)
  }
  const extrasAnio = Number(f.extrasDelAnio) || 0
  const mesesTxt = mesesAnio.toLocaleString('es-PY', { maximumFractionDigits: 2 })
  add(
    haberes,
    'aguinaldo',
    'Aguinaldo proporcional',
    `(${gs(S)} × ${mesesTxt} ${mesesAnio === 1 ? 'mes' : 'meses'}${extrasAnio ? ` + ${gs(extrasAnio)}` : ''}) ÷ 12`,
    (S * mesesAnio + extrasAnio) / 12
  )

  // Vacaciones
  const vacPend = Number(f.vacacionesPendientes) || 0
  const doble = Boolean(f.vacacionesDobles)
  add(haberes, 'vac-pend', 'Vacaciones no gozadas', `${dias(vacPend)} × ${gs(sd)}${doble ? ' × 2' : ''}`, vacPend * sd * (doble ? 2 : 1), true)

  let diasVacProp = 0
  if (antiguedad && f.vacacionesProporcionales) {
    const diasAnio = diasVacacionesDelAnio(antiguedad.y + 1)
    diasVacProp = (diasAnio * (antiguedad.m + antiguedad.d / 30)) / 12
    add(haberes, 'vac-prop', 'Vacaciones proporcionales', `${dias(Math.round(diasVacProp * 100) / 100)} × ${gs(sd)}`, diasVacProp * sd, true)
  }

  // Preaviso e indemnización
  if (antiguedad && !enPrueba && conIndemnizacion) {
    const pagaPreaviso = f.modalidad === 'retiro-justificado' || !f.preavisoOtorgado
    if (pagaPreaviso) add(haberes, 'preaviso', 'Preaviso', `${diasDePreaviso} días × ${gs(sd)}`, diasDePreaviso * sd)
    add(haberes, 'indemnizacion', 'Indemnización', `15 días × ${aniosIndemnizacion} ${aniosIndemnizacion === 1 ? 'año' : 'años'} × ${gs(sd)}`, 15 * aniosIndemnizacion * sd)
  }

  // Descuentos
  const baseIPS = haberes.filter((h) => h.ips).reduce((s, h) => s + h.monto, 0)
  if (f.afiliadoIPS) add(descuentos, 'ips', 'Aporte IPS', `${TASA_IPS} % de ${gs(baseIPS)}`, (baseIPS * TASA_IPS) / 100)
  if (antiguedad && !enPrueba && f.modalidad === 'renuncia' && !f.renunciaConPreaviso) {
    add(descuentos, 'preaviso-renuncia', 'Preaviso no cumplido', `Mitad de ${diasDePreaviso} días × ${gs(sd)}`, (diasDePreaviso * sd) / 2)
  }

  const totalDevengado = haberes.reduce((s, h) => s + h.monto, 0)
  const totalDescuentos = descuentos.reduce((s, h) => s + h.monto, 0)

  return {
    ...f,
    salarioDiario: Math.round(sd),
    antiguedad,
    fechasOk,
    enPrueba,
    estabilidad: Boolean(antiguedad && antiguedad.y >= 10),
    diasPreaviso: diasDePreaviso,
    aniosIndemnizacion,
    haberes,
    descuentos,
    totalDevengado,
    totalDescuentos,
    neto: totalDevengado - totalDescuentos
  }
}

/** Liquidaciones guardadas con la versión anterior: se muestran con sus conceptos de entonces. */
export function conceptosDe(r) {
  if (!r) return { haberes: [], descuentos: [] }
  if (Array.isArray(r.haberes)) return { haberes: r.haberes, descuentos: r.descuentos || [] }
  const h = [
    ['Salario devengado', r.salarioDevengado],
    ['Horas extras', r.horasExtras],
    ['Aguinaldo proporcional', r.decimotercera],
    ['Vacaciones no gozadas', r.vacaciones],
    ['Bonificaciones', r.bonificaciones],
    ['Indemnización', r.indemnizacion],
    ['Preaviso', r.preaviso]
  ]
  const d = [
    ['Descuento AFP', r.descuentoAFP],
    ['Descuento IPS', r.descuentoIPS],
    ['Impuesto a la Renta', r.impuestoRenta]
  ]
  const lista = (xs) => xs.filter(([, m]) => m > 0).map(([concepto, monto]) => ({ concepto, monto, detalle: '' }))
  return { haberes: lista(h), descuentos: lista(d) }
}
