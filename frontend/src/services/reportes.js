/**
 * QUADRA · Reportes para el contador
 * Facturas pendientes de cobro y de pago a una fecha de corte, y
 * Resumen general de IVA de un período con histórico de cinco años.
 * Funciones puras: reciben los comprobantes y devuelven filas listas para
 * la pantalla, el PDF y el Excel.
 */
import { TIPOS, TIPOS_FISCALES, MESES, totalesDe, n0, facturasPendientes } from './contabilidad.js'

/** impuestos con los que el cliente ve Documentos e Informes auxiliares */
export const IMPUESTOS_REPORTES = ['iva', 'irp', 'irp_rsp', 'irp_rgc']

export const tieneReportes = (contribuyente) => {
  const imps = Array.isArray(contribuyente?.impuestos) ? contribuyente.impuestos : []
  return imps.some((id) => IMPUESTOS_REPORTES.includes(id))
}

const diasEntre = (desde, hasta) => {
  if (!desde || !hasta) return 0
  const ms = new Date(`${hasta}T12:00:00`).getTime() - new Date(`${desde}T12:00:00`).getTime()
  return Math.max(Math.floor(ms / 86400000), 0)
}

/* ── facturas pendientes ────────────────────────────────────── */

export const TRAMOS = [
  { id: 'corriente', label: 'Hasta 30 días' },
  { id: 'd30', label: '31 a 60 días' },
  { id: 'd60', label: '61 a 90 días' },
  { id: 'd90', label: 'Más de 90 días' }
]

const tramoDe = (dias) => (dias <= 30 ? 'corriente' : dias <= 60 ? 'd30' : dias <= 90 ? 'd60' : 'd90')

/**
 * Facturas a crédito con saldo a la fecha de corte, agrupadas por persona.
 * lado 'compra' → pendientes de pago a proveedores; 'venta' → de cobro a clientes.
 * Solo cuentan comprobantes, recibos y retenciones con fecha hasta el corte.
 */
export const pendientesAl = (docs, lado, corte) => {
  const hasta = docs.filter((d) => !corte || (d.fecha || '') <= corte)
  const rucs = new Map()
  hasta.forEach((d) => {
    if (TIPOS[d.tipo]?.lado !== lado || !d.personaRuc) return
    if (TIPOS_FISCALES.includes(d.tipo) && d.condicion === 'credito' && !rucs.has(d.personaRuc)) rucs.set(d.personaRuc, d.personaNombre || d.personaRuc)
  })
  const personas = [...rucs.entries()].map(([ruc, nombre]) => {
    const facturas = facturasPendientes(hasta, ruc, lado)
      .filter((f) => f.saldo > 0)
      .map((f) => {
        const dias = diasEntre(f.fecha, corte)
        return { ...f, label: TIPOS[f.tipo].label, dias, tramo: tramoDe(dias) }
      })
    const tramos = Object.fromEntries(TRAMOS.map((t) => [t.id, 0]))
    facturas.forEach((f) => { tramos[f.tramo] += f.saldo })
    return {
      ruc,
      nombre,
      facturas,
      total: facturas.reduce((s, f) => s + f.total, 0),
      saldo: facturas.reduce((s, f) => s + f.saldo, 0),
      tramos,
      maxDias: facturas.reduce((m, f) => Math.max(m, f.dias), 0)
    }
  }).filter((p) => p.facturas.length)
  const tramos = Object.fromEntries(TRAMOS.map((t) => [t.id, personas.reduce((s, p) => s + p.tramos[t.id], 0)]))
  return {
    personas,
    tramos,
    saldo: personas.reduce((s, p) => s + p.saldo, 0),
    facturas: personas.reduce((s, p) => s + p.facturas.length, 0)
  }
}

export const ORDEN_PENDIENTES = {
  saldo: (a, b) => b.saldo - a.saldo,
  nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
  antiguedad: (a, b) => b.maxDias - a.maxDias
}

/* ── resumen general de IVA ─────────────────────────────────── */

const claveMes = (iso) => String(iso || '').slice(0, 7)
export const nombreMes = (clave) => `${MESES[Number(clave.slice(5, 7)) - 1] || ''} ${clave.slice(0, 4)}`
export const mesCorto = (i) => MESES[i].slice(0, 3)

/** meses ('2026-01') entre dos fechas, inclusive */
export const mesesEntre = (desde, hasta) => {
  const out = []
  if (!desde || !hasta || desde > hasta) return out
  let y = Number(desde.slice(0, 4))
  let m = Number(desde.slice(5, 7))
  const fin = claveMes(hasta)
  while (`${y}-${String(m).padStart(2, '0')}` <= fin && out.length < 240) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) { m = 1; y += 1 }
  }
  return out
}

/** importe con signo de un comprobante fiscal: ingresos (ventas) o gastos (compras) */
const importes = (d) => {
  const t = TIPOS[d.tipo]
  const x = totalesDe(d)
  return { lado: t.lado, total: t.signo * x.total, iva: t.signo * (x.iva10 + x.iva5) }
}

/**
 * Mes a mes entre `desde` y `hasta`: ingresos y gastos (totales con IVA),
 * diferencia, débito y crédito fiscal, retenciones recibidas y saldo de IVA.
 */
export const resumenIVA = (docs, desde, hasta) => {
  const meses = mesesEntre(desde, hasta)
  const filas = new Map(meses.map((k) => [k, { mes: k, nombre: nombreMes(k), ingresos: 0, gastos: 0, df: 0, cf: 0, ret: 0, n: 0 }]))
  docs.forEach((d) => {
    if (d.anulado) return
    const f = d.fecha || ''
    if (f < desde || f > hasta) return
    const fila = filas.get(claveMes(f))
    if (!fila) return
    if (TIPOS_FISCALES.includes(d.tipo)) {
      const x = importes(d)
      if (x.lado === 'venta') { fila.ingresos += x.total; fila.df += x.iva } else { fila.gastos += x.total; fila.cf += x.iva }
      fila.n += 1
    } else if (d.tipo === 'ret-recibida') fila.ret += n0(d.monto)
  })
  const lista = [...filas.values()].map((m) => ({ ...m, dif: m.ingresos - m.gastos, saldoIva: m.df - m.cf - m.ret }))
  const tot = lista.reduce((t, m) => {
    ['ingresos', 'gastos', 'df', 'cf', 'ret', 'n', 'dif', 'saldoIva'].forEach((k) => { t[k] += m[k] })
    return t
  }, { ingresos: 0, gastos: 0, df: 0, cf: 0, ret: 0, n: 0, dif: 0, saldoIva: 0 })
  const conVentas = lista.filter((m) => m.ingresos > 0)
  const conGastos = lista.filter((m) => m.gastos > 0)
  return {
    meses: lista,
    tot,
    mayorVenta: conVentas.reduce((a, m) => (!a || m.ingresos > a.ingresos ? m : a), null),
    mayorGasto: conGastos.reduce((a, m) => (!a || m.gastos > a.gastos ? m : a), null)
  }
}

/**
 * Ventas y gastos de cada mes en los últimos `n` años hasta `anioFin`
 * (un año por línea en el gráfico histórico).
 */
export const historico = (docs, anioFin, n = 5) => {
  const anios = Array.from({ length: n }, (_, i) => anioFin - n + 1 + i)
  const datos = new Map(anios.map((a) => [a, { anio: a, ventas: Array(12).fill(0), gastos: Array(12).fill(0) }]))
  docs.forEach((d) => {
    if (d.anulado || !TIPOS_FISCALES.includes(d.tipo)) return
    const a = datos.get(Number(String(d.fecha || '').slice(0, 4)))
    if (!a) return
    const m = Number(d.fecha.slice(5, 7)) - 1
    if (m < 0 || m > 11) return
    const x = importes(d)
    if (x.lado === 'venta') a.ventas[m] += x.total
    else a.gastos[m] += x.total
  })
  // meses que todavía no pasaron: sin valor, para que la línea del año en curso no caiga a cero
  const hoy = new Date()
  const futuro = (anio, m) => anio > hoy.getFullYear() || (anio === hoy.getFullYear() && m > hoy.getMonth())
  return [...datos.values()].map((a) => {
    const ventas = a.ventas.reduce((s, v) => s + v, 0)
    const gastos = a.gastos.reduce((s, v) => s + v, 0)
    const iV = a.ventas.indexOf(Math.max(...a.ventas))
    const iG = a.gastos.indexOf(Math.max(...a.gastos))
    return {
      ...a,
      ventas: a.ventas.map((v, m) => (futuro(a.anio, m) ? null : v)),
      gastos: a.gastos.map((v, m) => (futuro(a.anio, m) ? null : v)),
      totalVentas: ventas,
      totalGastos: gastos,
      dif: ventas - gastos,
      mesMayorVenta: ventas ? MESES[iV] : '',
      mesMayorGasto: gastos ? MESES[iG] : '',
      conDatos: ventas !== 0 || gastos !== 0
    }
  })
}

/* ── colores (paleta categórica validada, modo claro) ───────── */

export const COLOR_INGRESOS = '#2a78d6'
export const COLOR_GASTOS = '#eb6834'
/** un color por año, en orden fijo: el año más reciente siempre es el primero */
export const COLORES_ANIO = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4']
