/**
 * El avance de una meta no se carga a mano: se deriva de lo registrado.
 *  · Financiera: suma de los aportes / monto objetivo.
 *  · Educativa o profesional: pasos tildados / pasos totales.
 * Metas antiguas sin aportes ni pasos conservan su `progreso` guardado.
 */

const DIA = 86400000
const clamp = (v) => Math.max(0, Math.min(100, v))

export const gs = (n) => `Gs. ${Math.round(Number(n) || 0).toLocaleString('es-PY')}`

/** "1.500.000" → 1500000 */
export const parseMonto = (txt) => Number(String(txt ?? '').replace(/\D/g, '')) || 0

export const esFinanciera = (m) => m.tipo === 'financiero'

/** Un aporte cuenta si se ahorró de verdad; las cuotas programadas esperan a marcarse como pagadas. */
export const estaPagado = (x) => x.pagado !== false

export const ahorradoDe = (m) => (m.aportes || []).filter(estaPagado).reduce((a, x) => a + (Number(x.monto) || 0), 0)

/** Cuotas de un ahorro fijo mensual que todavía no se marcaron como pagadas, de la más antigua a la más nueva. */
export const cuotasPendientes = (m) =>
  (m.aportes || []).filter((x) => !estaPagado(x)).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))

/** Suma `k` meses a una fecha ISO, sin pasarse del último día del mes (31/01 + 1 → 28/02). */
export function sumarMeses(iso, k) {
  const [y, m, d] = iso.split('-').map(Number)
  const base = new Date(y, m - 1 + k, 1)
  const ultimo = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
  base.setDate(Math.min(d, ultimo))
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`
}

/** Genera `veces` cuotas mensuales de `monto` desde `inicio`; las ya vencidas pueden entrar como pagadas. */
export function generarCuotas({ monto, inicio, veces, pagarVencidas }) {
  const serie = nuevoId()
  const hoy = hoyISO()
  return Array.from({ length: veces }, (_, i) => {
    const fecha = sumarMeses(inicio, i)
    const pagado = pagarVencidas && fecha <= hoy
    return { id: `${serie}-${i + 1}`, serie, cuota: i + 1, de: veces, monto, fecha, pagado, ...(pagado ? { pagadoEn: new Date().toISOString() } : {}) }
  })
}

export function avanceDe(m) {
  if (esFinanciera(m)) {
    const objetivo = Number(m.montoFinanciero) || 0
    if (objetivo > 0) return clamp((ahorradoDe(m) / objetivo) * 100)
  } else if (m.pasos?.length) {
    return (m.pasos.filter((p) => p.hecho).length / m.pasos.length) * 100
  }
  return m.completada ? 100 : clamp(Number(m.progreso) || 0)
}

export const estaCompleta = (m) => avanceDe(m) >= 100

/** Copia el avance derivado a los campos guardados (para el PDF y datos viejos). */
export const conAvance = (m) => {
  const v = avanceDe(m)
  return { ...m, progreso: Math.round(v), completada: v >= 100 }
}

/** Fecha en que empezó la meta: creación guardada, id (Date.now()) o inicio del período. */
function inicioDe(meta, limite) {
  const t = Date.parse(meta.creadaEn || '')
  if (!Number.isNaN(t)) return t
  const id = Number(meta.id)
  if (id > 1e12 && id < limite) return id
  return limite - (meta.periodo === 'mensual' ? 30 : 365) * DIA
}

/** Cuánto debería llevar hecho hoy (0–100) según el tiempo transcurrido, o null sin fecha. */
export function esperadoHoy(meta, ahora = Date.now()) {
  if (!meta.fechaLimite) return null
  const limite = Date.parse(`${meta.fechaLimite}T23:59:59`)
  if (Number.isNaN(limite)) return null
  const inicio = inicioDe(meta, limite)
  if (limite <= inicio) return 100
  return clamp(((ahora - inicio) / (limite - inicio)) * 100)
}

export function estadoDe(meta, ahora = Date.now()) {
  const v = avanceDe(meta)
  if (v >= 100) return 'hecha'
  const e = esperadoHoy(meta, ahora)
  if (e === null) return 'al-dia'
  if (e >= 100) return 'vencida'
  return v + 5 >= e ? 'al-dia' : 'atrasada'
}

/** Lo que falta ahorrar y cuánto por mes hasta la fecha límite. */
export function planAhorro(meta, ahora = Date.now()) {
  const objetivo = Number(meta.montoFinanciero) || 0
  if (!objetivo) return null
  const ahorrado = ahorradoDe(meta)
  const falta = Math.max(0, objetivo - ahorrado)
  const limite = meta.fechaLimite ? Date.parse(`${meta.fechaLimite}T23:59:59`) : NaN
  const dias = Number.isNaN(limite) ? null : Math.ceil((limite - ahora) / DIA)
  const meses = dias === null ? null : Math.max(1, Math.ceil(dias / 30))
  return {
    objetivo,
    ahorrado,
    falta,
    vencida: dias !== null && dias <= 0,
    meses,
    porMes: meses ? falta / meses : null
  }
}

export const hoyISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const fechaPY = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-PY') : '')

export const nuevoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
