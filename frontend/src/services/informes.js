/**
 * QUADRA · Informes contables
 * Catálogo de libros (obligatorios y auxiliares), saldos jerárquicos,
 * Balance General, Estado de Resultados, libros de caja y bancos,
 * cuentas corrientes y liquidación mensual de IVA.
 * Todo se arma a partir de los comprobantes: nada se carga dos veces.
 */
import {
  TIPOS, TIPOS_FISCALES, CTA, totalesDe, n0, nivelDe, compararCodigos, armarDiario, armarMayor,
  saldoPersona, facturasPendientes, cuadroActivo, CATEGORIAS_ACTIVO, MESES
} from './contabilidad.js'

/* ── catálogo de libros ─────────────────────────────────────── */

/**
 * Libros contables en Paraguay.
 * - Ley 1034/83 «Del Comerciante»: Diario e Inventario, rubricados por el
 *   Registro Público de Comercio antes de usarse (art. 78); conservación 5 años.
 * - DNIT (Ley 6380/19, Dto. 3182/19, RG 90/21): Libro Mayor para contribuyentes
 *   del IRE General, registro de comprobantes de compras y ventas (IVA).
 * - Libros auxiliares: los elige el contribuyente; no se rubrican.
 */
export const LIBROS = [
  {
    id: 'ct-diario', nombre: 'Libro Diario', clase: 'obligatorio',
    base: 'Ley 1034/83 · rubricado',
    que: 'Todas las operaciones en orden cronológico, asiento por asiento.'
  },
  {
    id: 'ct-inventario', nombre: 'Libro Inventario y Balances', clase: 'obligatorio',
    base: 'Ley 1034/83 · rubricado',
    que: 'Al cierre: detalle de bienes, créditos y deudas, Balance General y Estado de Resultados.'
  },
  {
    id: 'ct-mayor', nombre: 'Libro Mayor', clase: 'obligatorio',
    base: 'DNIT · numerado y rubricado',
    que: 'Movimiento y saldo de cada cuenta, tomado del Diario.'
  },
  {
    id: 'ct-libro-compras', nombre: 'Libro IVA Compras', clase: 'obligatorio',
    base: 'DNIT · RG 90/21 (Marangatu)',
    que: 'Comprobantes de proveedores con el crédito fiscal del mes.'
  },
  {
    id: 'ct-libro-ventas', nombre: 'Libro IVA Ventas', clase: 'obligatorio',
    base: 'DNIT · RG 90/21 (Marangatu)',
    que: 'Comprobantes emitidos con el débito fiscal del mes.'
  },
  {
    id: 'ct-caja', nombre: 'Libro Caja', clase: 'auxiliar',
    base: 'Auxiliar · opcional',
    que: 'Entradas y salidas de efectivo con saldo corrido.'
  },
  {
    id: 'ct-bancos', nombre: 'Libro Bancos', clase: 'auxiliar',
    base: 'Auxiliar · opcional',
    que: 'Depósitos y pagos por cuenta bancaria, listo para conciliar con el extracto.'
  },
  {
    id: 'ct-ctacte-clientes', nombre: 'Cuentas corrientes de clientes', clase: 'auxiliar',
    base: 'Auxiliar · opcional',
    que: 'Lo que te debe cada cliente, factura por factura.'
  },
  {
    id: 'ct-ctacte-proveedores', nombre: 'Cuentas corrientes de proveedores', clase: 'auxiliar',
    base: 'Auxiliar · opcional',
    que: 'Lo que le debés a cada proveedor, factura por factura.'
  },
  {
    id: 'ct-revaluo', nombre: 'Cuadro de revalúo y depreciación', clase: 'auxiliar',
    base: 'DNIT · RG 49/14 (anexo de estados)',
    que: 'Valor revaluado, depreciación y valor neto de cada bien del activo fijo.'
  }
]

/* ── saldos ─────────────────────────────────────────────────── */

/** saldo de cada cuenta imputable al cierre (o hasta `hasta`), en su naturaleza */
export const saldosAl = (docs, ejercicio, hasta) => {
  const diario = armarDiario(docs, ejercicio).filter((a) => !hasta || a.fecha <= hasta)
  const mayor = armarMayor(diario)
  return { diario, mayor }
}

/**
 * Suma los saldos hacia arriba en el plan: cada rubro muestra el total de sus
 * subcuentas, en la naturaleza del rubro raíz (activo deudor, pasivo acreedor…).
 */
export const saldosJerarquicos = (mayor) => {
  const tot = new Map()
  mayor.forEach((c) => {
    const partes = c.cuenta.split('.')
    for (let i = 1; i <= partes.length; i++) {
      const cod = partes.slice(0, i).join('.')
      tot.set(cod, (tot.get(cod) || 0) + c.saldo)
    }
  })
  return tot
}

/** resultado del ejercicio: ingresos − costos y gastos */
export const resultadoDe = (tot) => (tot.get('4') || 0) - (tot.get('5') || 0)

/**
 * Filas de un estado (Balance o Resultados) para los rubros `raices`,
 * hasta el nivel 4 y solo con saldo. Cada fila: { codigo, nombre, nivel, saldo }.
 */
export const filasEstado = (plan, tot, raices) => plan
  .filter((c) => raices.includes(c.codigo[0]) && tot.get(c.codigo))
  .sort((a, b) => compararCodigos(a.codigo, b.codigo))
  .map((c) => ({ codigo: c.codigo, nombre: c.nombre, nivel: nivelDe(c.codigo), saldo: tot.get(c.codigo) }))

/* ── libros de caja y bancos ────────────────────────────────── */

export const esCaja = (codigo) => codigo === CTA.CAJA || codigo === '1.1.01.02'
export const esBanco = (codigo) => codigo.startsWith('1.1.01.') && !esCaja(codigo)

/**
 * Movimientos de una cuenta de disponibilidad con la contrapartida de cada
 * asiento (la cuenta del otro lado), ingresos, egresos y saldo corrido.
 */
export const libroDisponibilidad = (diario, cuentas, nombreCuenta) => {
  const set = new Set(cuentas)
  const filas = []
  let saldo = 0
  diario.forEach((a) => {
    const propias = a.lineas.filter((l) => set.has(l.cuenta))
    if (!propias.length) return
    const otras = a.lineas.filter((l) => !set.has(l.cuenta))
    const contra = [...new Set(otras.map((l) => nombreCuenta(l.cuenta)))].slice(0, 2).join(' · ')
    propias.forEach((l) => {
      saldo += l.debe - l.haber
      filas.push({
        numero: a.numero, fecha: a.fecha, concepto: a.concepto, cuenta: l.cuenta, contra,
        persona: a.doc.personaNombre || '', ingreso: l.debe, egreso: l.haber, saldo, docId: a.doc.id
      })
    })
  })
  return filas
}

/* ── cuentas corrientes ─────────────────────────────────────── */

const hoyMs = () => Date.now()
export const diasDesde = (iso) => (iso ? Math.max(Math.floor((hoyMs() - new Date(`${iso}T12:00:00`).getTime()) / 86400000), 0) : 0)

/** resumen por persona: saldo, facturas pendientes y antigüedad de la deuda */
export const cuentasCorrientes = (docs, lado) => {
  const rucs = new Map()
  docs.forEach((d) => {
    const t = TIPOS[d.tipo]
    if (!t || t.lado !== lado || !d.personaRuc) return
    if (TIPOS_FISCALES.includes(d.tipo) && d.condicion !== 'credito') return
    if (!rucs.has(d.personaRuc)) rucs.set(d.personaRuc, d.personaNombre || d.personaRuc)
  })
  return [...rucs.entries()].map(([ruc, nombre]) => {
    const pend = facturasPendientes(docs, ruc, lado)
    const antigua = pend[0]?.fecha || ''
    const tramos = { corriente: 0, d30: 0, d60: 0, d90: 0 }
    pend.forEach((f) => {
      const dd = diasDesde(f.fecha)
      if (dd <= 30) tramos.corriente += f.saldo
      else if (dd <= 60) tramos.d30 += f.saldo
      else if (dd <= 90) tramos.d60 += f.saldo
      else tramos.d90 += f.saldo
    })
    return { ruc, nombre, saldo: saldoPersona(docs, ruc, lado), pendientes: pend, antigua, dias: diasDesde(antigua), tramos }
  }).sort((a, b) => b.saldo - a.saldo)
}

/** extracto de una persona: cada comprobante que mueve su cuenta, con saldo corrido */
export const extractoPersona = (docs, ruc, lado) => {
  let saldo = 0
  return docs
    .filter((d) => d.personaRuc === ruc && TIPOS[d.tipo]?.lado === lado)
    .filter((d) => (TIPOS_FISCALES.includes(d.tipo) ? d.condicion === 'credito' : ['recibo-cobro', 'recibo-pago', 'ret-recibida', 'ret-emitida'].includes(d.tipo) && !d.anulado))
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || (a.creadoEn || '').localeCompare(b.creadoEn || ''))
    .map((d) => {
      const t = TIPOS[d.tipo]
      const importe = TIPOS_FISCALES.includes(d.tipo) ? t.signo * totalesDe(d).total : -n0(d.monto)
      saldo += importe
      return { id: d.id, fecha: d.fecha, tipo: d.tipo, label: t.label, numero: d.numero, cargo: importe > 0 ? importe : 0, abono: importe < 0 ? -importe : 0, saldo }
    })
}

/* ── liquidación mensual de IVA ─────────────────────────────── */

/**
 * Débito fiscal − crédito fiscal − retenciones recibidas, mes a mes,
 * arrastrando el saldo a favor al mes siguiente (como en el Formulario 120).
 */
export const liquidacionIVA = (docs, ejercicio, saldoInicial = 0) => {
  const meses = MESES.map((nombre, i) => ({ mes: String(i + 1).padStart(2, '0'), nombre, df10: 0, df5: 0, cf10: 0, cf5: 0, ret: 0 }))
  docs.forEach((d) => {
    if (!String(d.fecha || '').startsWith(String(ejercicio))) return
    const m = meses[Number(d.fecha.slice(5, 7)) - 1]
    if (!m) return
    if (TIPOS_FISCALES.includes(d.tipo)) {
      const t = TIPOS[d.tipo]
      const x = totalesDe(d)
      if (t.lado === 'venta') { m.df10 += t.signo * x.iva10; m.df5 += t.signo * x.iva5 } else { m.cf10 += t.signo * x.iva10; m.cf5 += t.signo * x.iva5 }
    } else if (d.tipo === 'ret-recibida' && !d.anulado) m.ret += n0(d.monto)
  })
  let favor = n0(saldoInicial)
  return meses.map((m) => {
    const df = m.df10 + m.df5
    const cf = m.cf10 + m.cf5
    const anterior = favor
    const neto = df - cf - m.ret - anterior
    favor = neto < 0 ? -neto : 0
    return { ...m, df, cf, anterior, aPagar: neto > 0 ? neto : 0, aFavor: favor, movimiento: df || cf || m.ret }
  })
}

/* ── inventario de cierre ───────────────────────────────────── */

/** detalle que respalda el saldo de algunas cuentas en el Libro Inventario */
export const detallesInventario = ({ docs, activos, ejercicio, existencias }) => {
  const det = new Map()
  const agregar = (cuenta, fila) => {
    if (!det.has(cuenta)) det.set(cuenta, [])
    det.get(cuenta).push(fila)
  }
  cuentasCorrientes(docs, 'venta').filter((c) => c.saldo).forEach((c) => agregar(CTA.DEUDORES, { detalle: `${c.nombre} · RUC ${c.ruc}`, importe: c.saldo }))
  cuentasCorrientes(docs, 'compra').filter((c) => c.saldo).forEach((c) => agregar(CTA.PROVEEDORES, { detalle: `${c.nombre} · RUC ${c.ruc}`, importe: c.saldo }))
  activos.forEach((a) => {
    const f = cuadroActivo(a, ejercicio)
    if (!f) return
    const cuenta = a.cuenta || CATEGORIAS_ACTIVO.find((c) => c.id === a.categoria)?.cuenta || '1.2.03.04'
    agregar(cuenta, { detalle: `${a.descripcion || a.nombre || 'Bien'} · valor revaluado`, importe: f.valorRevaluado })
    if (f.depCierre) agregar(CTA.DEP_ACUMULADA, { detalle: a.descripcion || a.nombre || 'Bien', importe: -f.depCierre })
  })
  ;(existencias?.items || []).forEach((it) => {
    const importe = Math.round(Number(it.cantidad || 0) * n0(it.costo))
    if (importe) agregar(it.cuenta || '1.1.05.01', { detalle: `${it.descripcion} · ${Number(it.cantidad).toLocaleString('es-PY')} ${it.unidad || 'u.'} × ${n0(it.costo).toLocaleString('es-PY')}`, importe })
  })
  return det
}

