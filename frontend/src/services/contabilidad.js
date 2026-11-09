/**
 * QUADRA · Núcleo contable
 * Plan de cuentas base (rubros de la RG 49/2014), tipos de comprobante,
 * generación automática de asientos y cálculo de revalúo y depreciación.
 * Todo en guaraníes, sin decimales.
 */

/* ── plan de cuentas base (rubros RG 49/2014) ───────────────── */

const PLAN_BASE_RAW = [
  ['1', 'ACTIVO'],
  ['1.1', 'ACTIVO CORRIENTE'],
  ['1.1.01', 'Disponibilidades'],
  ['1.1.01.01', 'Caja'],
  ['1.1.01.02', 'Fondo fijo'],
  ['1.1.01.03', 'Bancos – cuenta corriente'],
  ['1.1.01.04', 'Bancos – caja de ahorro'],
  ['1.1.02', 'Inversiones temporales'],
  ['1.1.02.01', 'Depósitos a plazo fijo'],
  ['1.1.03', 'Créditos por ventas'],
  ['1.1.03.01', 'Deudores por ventas'],
  ['1.1.03.02', 'Documentos a cobrar'],
  ['1.1.03.03', '(−) Previsión para incobrables'],
  ['1.1.04', 'Otros créditos'],
  ['1.1.04.01', 'IVA crédito fiscal 10%'],
  ['1.1.04.02', 'IVA crédito fiscal 5%'],
  ['1.1.04.03', 'Retenciones de IVA recibidas'],
  ['1.1.04.04', 'Anticipos y retenciones de IRE'],
  ['1.1.04.05', 'Anticipo a proveedores'],
  ['1.1.04.06', 'Préstamos al personal'],
  ['1.1.05', 'Inventarios'],
  ['1.1.05.01', 'Mercaderías'],
  ['1.1.05.02', 'Materias primas'],
  ['1.1.05.03', 'Importaciones en curso'],
  ['1.1.06', 'Gastos pagados por adelantado'],
  ['1.1.06.01', 'Seguros pagados por adelantado'],
  ['1.1.06.02', 'Alquileres pagados por adelantado'],
  ['1.2', 'ACTIVO NO CORRIENTE'],
  ['1.2.01', 'Créditos a largo plazo'],
  ['1.2.01.01', 'Documentos a cobrar a largo plazo'],
  ['1.2.02', 'Inversiones permanentes'],
  ['1.2.02.01', 'Acciones y participaciones'],
  ['1.2.03', 'Propiedad, planta y equipo'],
  ['1.2.03.01', 'Terrenos'],
  ['1.2.03.02', 'Edificios'],
  ['1.2.03.03', 'Rodados'],
  ['1.2.03.04', 'Maquinarias y equipos'],
  ['1.2.03.05', 'Muebles y útiles'],
  ['1.2.03.06', 'Equipos de informática'],
  ['1.2.03.07', 'Herramientas'],
  ['1.2.03.08', '(−) Depreciación acumulada'],
  ['1.2.04', 'Activos intangibles'],
  ['1.2.04.01', 'Software y licencias'],
  ['1.2.04.02', 'Marcas y patentes'],
  ['1.2.04.03', '(−) Amortización acumulada'],
  ['2', 'PASIVO'],
  ['2.1', 'PASIVO CORRIENTE'],
  ['2.1.01', 'Acreedores comerciales'],
  ['2.1.01.01', 'Proveedores locales'],
  ['2.1.01.02', 'Proveedores del exterior'],
  ['2.1.01.03', 'Documentos a pagar'],
  ['2.1.02', 'Deudas financieras'],
  ['2.1.02.01', 'Préstamos bancarios'],
  ['2.1.02.02', 'Tarjetas de crédito'],
  ['2.1.02.03', 'Intereses a pagar'],
  ['2.1.03', 'Otras cuentas por pagar'],
  ['2.1.03.01', 'IVA débito fiscal 10%'],
  ['2.1.03.02', 'IVA débito fiscal 5%'],
  ['2.1.03.03', 'IVA a pagar'],
  ['2.1.03.04', 'Retenciones de IVA a ingresar'],
  ['2.1.03.05', 'IRE a pagar'],
  ['2.1.03.06', 'Sueldos a pagar'],
  ['2.1.03.07', 'IPS a pagar'],
  ['2.1.03.08', 'Anticipos de clientes'],
  ['2.1.04', 'Provisiones'],
  ['2.1.04.01', 'Provisión para aguinaldo'],
  ['2.1.04.02', 'Provisión para vacaciones'],
  ['2.2', 'PASIVO NO CORRIENTE'],
  ['2.2.01', 'Deudas financieras a largo plazo'],
  ['2.2.01.01', 'Préstamos bancarios a largo plazo'],
  ['3', 'PATRIMONIO NETO'],
  ['3.1', 'CAPITAL'],
  ['3.1.01', 'Capital integrado'],
  ['3.1.01.01', 'Capital social'],
  ['3.1.01.02', 'Aportes a capitalizar'],
  ['3.2', 'RESERVAS'],
  ['3.2.01', 'Reservas'],
  ['3.2.01.01', 'Reserva legal'],
  ['3.2.01.02', 'Reserva de revalúo'],
  ['3.2.01.03', 'Otras reservas'],
  ['3.3', 'RESULTADOS'],
  ['3.3.01', 'Resultados'],
  ['3.3.01.01', 'Resultados acumulados'],
  ['3.3.01.02', 'Resultado del ejercicio'],
  ['4', 'INGRESOS'],
  ['4.1', 'INGRESOS OPERATIVOS'],
  ['4.1.01', 'Ventas netas'],
  ['4.1.01.01', 'Ventas de mercaderías gravadas 10%'],
  ['4.1.01.02', 'Ventas de mercaderías gravadas 5%'],
  ['4.1.01.03', 'Ventas exentas'],
  ['4.1.01.04', 'Prestación de servicios'],
  ['4.1.01.05', '(−) Devoluciones y descuentos sobre ventas'],
  ['4.2', 'OTROS INGRESOS'],
  ['4.2.01', 'Ingresos no operativos'],
  ['4.2.01.01', 'Intereses ganados'],
  ['4.2.01.02', 'Diferencia de cambio positiva'],
  ['4.2.01.03', 'Resultado por venta de activo fijo'],
  ['4.2.01.04', 'Otros ingresos'],
  ['5', 'COSTOS Y GASTOS'],
  ['5.1', 'COSTO DE VENTAS'],
  ['5.1.01', 'Costo de ventas'],
  ['5.1.01.01', 'Costo de mercaderías vendidas'],
  ['5.1.01.02', 'Compras de mercaderías'],
  ['5.1.01.03', '(−) Devoluciones y descuentos sobre compras'],
  ['5.2', 'GASTOS DE VENTAS'],
  ['5.2.01', 'Gastos de ventas'],
  ['5.2.01.01', 'Publicidad y propaganda'],
  ['5.2.01.02', 'Comisiones sobre ventas'],
  ['5.2.01.03', 'Fletes'],
  ['5.3', 'GASTOS DE ADMINISTRACIÓN'],
  ['5.3.01', 'Gastos de administración'],
  ['5.3.01.01', 'Sueldos y jornales'],
  ['5.3.01.02', 'Aporte patronal IPS'],
  ['5.3.01.03', 'Aguinaldos'],
  ['5.3.01.04', 'Honorarios profesionales'],
  ['5.3.01.05', 'Alquileres'],
  ['5.3.01.06', 'Energía eléctrica, agua y teléfono'],
  ['5.3.01.07', 'Útiles de oficina'],
  ['5.3.01.08', 'Combustibles y lubricantes'],
  ['5.3.01.09', 'Mantenimiento y reparaciones'],
  ['5.3.01.10', 'Seguros'],
  ['5.3.01.11', 'Depreciaciones del ejercicio'],
  ['5.3.01.12', 'Impuestos, tasas y contribuciones'],
  ['5.3.01.13', 'Gastos varios'],
  ['5.4', 'RESULTADOS FINANCIEROS'],
  ['5.4.01', 'Gastos financieros'],
  ['5.4.01.01', 'Intereses pagados'],
  ['5.4.01.02', 'Comisiones y gastos bancarios'],
  ['5.4.01.03', 'Diferencia de cambio negativa'],
  ['5.5', 'IMPUESTO A LA RENTA'],
  ['5.5.01', 'Impuesto a la renta'],
  ['5.5.01.01', 'Impuesto a la Renta Empresarial (IRE)']
]

export const nivelDe = (codigo) => String(codigo).split('.').length
export const padreDe = (codigo) => String(codigo).split('.').slice(0, -1).join('.')

export const PLAN_BASE = PLAN_BASE_RAW.map(([codigo, nombre]) => ({
  codigo,
  nombre,
  base: true,
  imputable: nivelDe(codigo) === 4
}))

/** ordena códigos jerárquicos: 1.1.02 antes que 1.1.10 */
export const compararCodigos = (a, b) => {
  const pa = String(a).split('.').map(Number)
  const pb = String(b).split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? -1
    const y = pb[i] ?? -1
    if (x !== y) return x - y
  }
  return 0
}

/** plan base + cuentas propias del contribuyente */
export const armarPlan = (propias = []) => {
  const mapa = new Map(PLAN_BASE.map((c) => [c.codigo, c]))
  propias.forEach((c) => mapa.set(c.codigo, { ...c, base: false, imputable: c.imputable !== false && nivelDe(c.codigo) >= 4 }))
  return [...mapa.values()].sort((a, b) => compararCodigos(a.codigo, b.codigo))
}

/** naturaleza del saldo: activos y gastos son deudores; pasivo, patrimonio e ingresos, acreedores */
export const naturaleza = (codigo) => (['1', '5'].includes(String(codigo)[0]) ? 'deudora' : 'acreedora')

export const CTA = {
  CAJA: '1.1.01.01',
  BANCO: '1.1.01.03',
  DEUDORES: '1.1.03.01',
  IVA_CF10: '1.1.04.01',
  IVA_CF5: '1.1.04.02',
  RET_IVA_RECIBIDAS: '1.1.04.03',
  DEP_ACUMULADA: '1.2.03.08',
  PROVEEDORES: '2.1.01.01',
  IVA_DF10: '2.1.03.01',
  IVA_DF5: '2.1.03.02',
  RET_IVA_A_INGRESAR: '2.1.03.04',
  RESERVA_REVALUO: '3.2.01.02',
  VENTAS: '4.1.01.01',
  DEV_VENTAS: '4.1.01.05',
  COMPRAS: '5.1.01.02',
  DEV_COMPRAS: '5.1.01.03',
  DEP_EJERCICIO: '5.3.01.11'
}

/* ── tipos de comprobante ───────────────────────────────────── */

export const TIPOS = {
  compra: { label: 'Factura de compra', corto: 'Factura', lado: 'compra', signo: 1, cuenta: CTA.COMPRAS, emitido: false },
  'nd-compra': { label: 'Nota de débito por compra', corto: 'N. débito', lado: 'compra', signo: 1, cuenta: CTA.COMPRAS, emitido: false, asociado: true },
  'nc-compra': { label: 'Nota de crédito por compra', corto: 'N. crédito', lado: 'compra', signo: -1, cuenta: CTA.DEV_COMPRAS, emitido: false, asociado: true },
  venta: { label: 'Factura de venta', corto: 'Factura', lado: 'venta', signo: 1, cuenta: CTA.VENTAS, emitido: true, timbradoTipo: 'factura' },
  'nd-venta': { label: 'Nota de débito por venta', corto: 'N. débito', lado: 'venta', signo: 1, cuenta: CTA.VENTAS, emitido: true, asociado: true, timbradoTipo: 'nota-debito' },
  'nc-venta': { label: 'Nota de crédito por venta', corto: 'N. crédito', lado: 'venta', signo: -1, cuenta: CTA.DEV_VENTAS, emitido: true, asociado: true, timbradoTipo: 'nota-credito' },
  'recibo-cobro': { label: 'Recibo de cobro', corto: 'Recibo', lado: 'venta', emitido: true, timbradoTipo: 'recibo' },
  'recibo-pago': { label: 'Recibo de pago', corto: 'Recibo', lado: 'compra', emitido: false },
  'ret-recibida': { label: 'Retención de IVA recibida', corto: 'Retención', lado: 'venta', emitido: false },
  'ret-emitida': { label: 'Retención de IVA emitida', corto: 'Retención', lado: 'compra', emitido: true, timbradoTipo: 'retencion' },
  asiento: { label: 'Asiento manual', corto: 'Asiento' },
  depreciacion: { label: 'Revalúo y depreciación', corto: 'Activo fijo' }
}

export const TIPOS_FISCALES = ['compra', 'nd-compra', 'nc-compra', 'venta', 'nd-venta', 'nc-venta']

export const TIPOS_TIMBRADO = [
  { id: 'factura', label: 'Factura' },
  { id: 'nota-credito', label: 'Nota de crédito' },
  { id: 'nota-debito', label: 'Nota de débito' },
  { id: 'recibo', label: 'Recibo' },
  { id: 'retencion', label: 'Comprobante de retención' },
  { id: 'autofactura', label: 'Autofactura' },
  { id: 'remision', label: 'Nota de remisión' }
]

/* ── utilidades ─────────────────────────────────────────────── */

export const nuevoId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const hoyISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const gs = (n) => Math.round(Number(n) || 0).toLocaleString('es-PY')
export const fechaCorta = (iso) => (iso ? iso.split('-').reverse().join('/') : '')
export const n0 = (v) => Math.round(Number(v) || 0)

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

/** IVA incluido en el monto gravado (liquidación paraguaya: 10% → /11, 5% → /21) */
export const ivaDe = (g10, g5) => ({ iva10: Math.round(n0(g10) / 11), iva5: Math.round(n0(g5) / 21) })

export const totalesDe = (doc) => {
  const g10 = n0(doc.gravada10)
  const g5 = n0(doc.gravada5)
  const ex = n0(doc.exenta)
  const { iva10, iva5 } = ivaDe(g10, g5)
  return { g10, g5, ex, iva10, iva5, base10: g10 - iva10, base5: g5 - iva5, total: g10 + g5 + ex }
}

/** dígito verificador del RUC (módulo 11, SET) */
export const dvRuc = (base) => {
  const digitos = String(base).replace(/\D/g, '')
  if (!digitos) return null
  let total = 0
  let k = 2
  for (let i = digitos.length - 1; i >= 0; i--) {
    if (k > 11) k = 2
    total += Number(digitos[i]) * k
    k++
  }
  const r = total % 11
  return r > 1 ? 11 - r : 0
}

/** '80012345-6' → { base, dv, valido } */
export const analizarRuc = (ruc) => {
  const limpio = String(ruc || '').trim()
  const m = limpio.match(/^(\d{3,9})-(\d)$/)
  if (!m) return { base: limpio.replace(/\D/g, ''), dv: null, formato: false, valido: false }
  const esperado = dvRuc(m[1])
  return { base: m[1], dv: Number(m[2]), esperado, formato: true, valido: esperado === Number(m[2]) }
}

/** 0010010000123 / 1-1-123 → 001-001-0000123 */
export const formatearNumero = (txt) => {
  const s = String(txt || '').trim()
  const partes = s.split('-')
  if (partes.length === 3 && partes.every((p) => /^\d+$/.test(p))) {
    return `${partes[0].padStart(3, '0').slice(-3)}-${partes[1].padStart(3, '0').slice(-3)}-${partes[2].padStart(7, '0').slice(-7)}`
  }
  const d = s.replace(/\D/g, '')
  if (d.length === 13) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return s
}

export const numeroValido = (n) => /^\d{3}-\d{3}-\d{7}$/.test(n || '')
export const timbradoValido = (t) => /^\d{8}$/.test(String(t || ''))

/** siguiente número disponible para un timbrado propio */
export const siguienteNumero = (timbrado, docs) => {
  if (!timbrado) return ''
  const prefijo = `${String(timbrado.establecimiento || '001').padStart(3, '0')}-${String(timbrado.punto || '001').padStart(3, '0')}-`
  const usados = docs
    .filter((d) => String(d.timbrado) === String(timbrado.numero) && String(d.numero || '').startsWith(prefijo))
    .map((d) => Number(String(d.numero).slice(8)) || 0)
  const sig = usados.length ? Math.max(...usados) + 1 : Number(timbrado.desde) || 1
  return `${prefijo}${String(sig).padStart(7, '0')}`
}

export const timbradoVigente = (t, fecha = hoyISO()) => (!t.inicio || t.inicio <= fecha) && (!t.fin || t.fin >= fecha)

/* ── asientos automáticos ───────────────────────────────────── */

const linea = (cuenta, debe, haber, glosa) => ({ cuenta, debe: n0(debe), haber: n0(haber), glosa })

const contrapartida = (doc, lado) => {
  if (doc.condicion === 'contado') return doc.cuentaPago || CTA.CAJA
  return lado === 'venta' ? CTA.DEUDORES : CTA.PROVEEDORES
}

export const conceptoDe = (doc) => {
  const t = TIPOS[doc.tipo]
  if (!t) return doc.concepto || ''
  if (doc.tipo === 'asiento' || doc.tipo === 'depreciacion') return doc.concepto || t.label
  const quien = doc.personaNombre ? ` · ${doc.personaNombre}` : ''
  return `${t.label}${doc.numero ? ` ${doc.numero}` : ''}${quien}`
}

/** líneas del asiento que genera cada comprobante */
export const lineasDe = (doc) => {
  if (doc.tipo === 'asiento' || doc.tipo === 'depreciacion') {
    return (doc.lineas || []).filter((l) => n0(l.debe) || n0(l.haber)).map((l) => linea(l.cuenta, l.debe, l.haber, l.glosa))
  }

  const t = TIPOS[doc.tipo]
  if (!t) return []

  if (TIPOS_FISCALES.includes(doc.tipo)) {
    const x = totalesDe(doc)
    const neto = x.base10 + x.base5 + x.ex
    const cuenta = doc.cuenta || t.cuenta
    const contra = contrapartida(doc, t.lado)
    // el neto puede repartirse en varias cuentas (imputaciones); si no, va a la cuenta principal
    const reparto = (doc.imputaciones || []).filter((i) => i.cuenta && n0(i.monto))
    const usaReparto = reparto.length > 0 && reparto.reduce((s, i) => s + n0(i.monto), 0) === neto
    const netos = (debe) => (usaReparto ? reparto : [{ cuenta, monto: neto }])
      .filter((i) => n0(i.monto))
      .map((i) => (debe ? linea(i.cuenta, i.monto, 0) : linea(i.cuenta, 0, i.monto)))
    const out = []
    if (t.lado === 'compra' && t.signo > 0) {
      // compra / nota de débito recibida: gasto + IVA CF contra proveedor o caja
      out.push(...netos(true))
      if (x.iva10) out.push(linea(CTA.IVA_CF10, x.iva10, 0))
      if (x.iva5) out.push(linea(CTA.IVA_CF5, x.iva5, 0))
      out.push(linea(contra, 0, x.total))
    } else if (t.lado === 'compra') {
      // nota de crédito recibida: revierte la compra
      out.push(linea(contra, x.total, 0))
      out.push(...netos(false))
      if (x.iva10) out.push(linea(CTA.IVA_CF10, 0, x.iva10))
      if (x.iva5) out.push(linea(CTA.IVA_CF5, 0, x.iva5))
    } else if (t.signo > 0) {
      // venta / nota de débito emitida
      out.push(linea(contra, x.total, 0))
      out.push(...netos(false))
      if (x.iva10) out.push(linea(CTA.IVA_DF10, 0, x.iva10))
      if (x.iva5) out.push(linea(CTA.IVA_DF5, 0, x.iva5))
    } else {
      // nota de crédito emitida: revierte la venta
      out.push(...netos(true))
      if (x.iva10) out.push(linea(CTA.IVA_DF10, x.iva10, 0))
      if (x.iva5) out.push(linea(CTA.IVA_DF5, x.iva5, 0))
      out.push(linea(contra, 0, x.total))
    }
    return out
  }

  const monto = n0(doc.monto)
  if (!monto) return []
  switch (doc.tipo) {
    case 'recibo-cobro':
      return [linea(doc.cuentaPago || CTA.CAJA, monto, 0), linea(doc.cuenta || CTA.DEUDORES, 0, monto)]
    case 'recibo-pago':
      return [linea(doc.cuenta || CTA.PROVEEDORES, monto, 0), linea(doc.cuentaPago || CTA.CAJA, 0, monto)]
    case 'ret-recibida':
      return [linea(CTA.RET_IVA_RECIBIDAS, monto, 0), linea(doc.cuenta || CTA.DEUDORES, 0, monto)]
    case 'ret-emitida':
      return [linea(doc.cuenta || CTA.PROVEEDORES, monto, 0), linea(CTA.RET_IVA_A_INGRESAR, 0, monto)]
    default:
      return []
  }
}

/** Libro Diario: todos los comprobantes del ejercicio, numerados en orden cronológico */
export const armarDiario = (docs, ejercicio) => {
  const delEjercicio = docs
    .filter((d) => !ejercicio || String(d.fecha || '').startsWith(String(ejercicio)))
    .slice()
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || (a.creadoEn || '').localeCompare(b.creadoEn || ''))
  let n = 0
  return delEjercicio
    .map((doc) => ({ doc, lineas: lineasDe(doc) }))
    .filter((a) => a.lineas.length)
    .map((a) => ({ ...a, numero: ++n, fecha: a.doc.fecha, concepto: conceptoDe(a.doc) }))
}

/** Libro Mayor: movimientos por cuenta con saldo corrido */
export const armarMayor = (diario) => {
  const cuentas = new Map()
  diario.forEach((as) => {
    as.lineas.forEach((l) => {
      if (!cuentas.has(l.cuenta)) cuentas.set(l.cuenta, { cuenta: l.cuenta, debe: 0, haber: 0, movimientos: [] })
      const c = cuentas.get(l.cuenta)
      c.debe += l.debe
      c.haber += l.haber
      c.movimientos.push({ numero: as.numero, fecha: as.fecha, concepto: as.concepto, debe: l.debe, haber: l.haber, docId: as.doc.id })
    })
  })
  cuentas.forEach((c) => {
    const deudora = naturaleza(c.cuenta) === 'deudora'
    let saldo = 0
    c.movimientos.forEach((m) => {
      saldo += deudora ? m.debe - m.haber : m.haber - m.debe
      m.saldo = saldo
    })
    c.saldo = saldo
  })
  return cuentas
}

export const sumas = (lineas) => lineas.reduce((t, l) => ({ debe: t.debe + n0(l.debe), haber: t.haber + n0(l.haber) }), { debe: 0, haber: 0 })

/* ── factura electrónica (SIFEN) ────────────────────────────── */

const TIPO_DE_CDC = { 1: 'factura', 4: 'autofactura', 5: 'nota-credito', 6: 'nota-debito', 7: 'remision' }

/**
 * Lee el CDC de 44 dígitos: tipo de documento, RUC y DV del emisor,
 * establecimiento, punto, número y fecha de emisión.
 */
export const leerCDC = (texto) => {
  const d = String(texto || '').replace(/\D/g, '')
  if (d.length !== 44) return null
  const rucBase = d.slice(2, 10).replace(/^0+/, '')
  const fecha = `${d.slice(25, 29)}-${d.slice(29, 31)}-${d.slice(31, 33)}`
  return {
    cdc: d,
    tipoDoc: TIPO_DE_CDC[Number(d.slice(0, 2))] || 'factura',
    ruc: `${rucBase}-${d[10]}`,
    numero: `${d.slice(11, 14)}-${d.slice(14, 17)}-${d.slice(17, 24)}`,
    fecha: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(fecha) ? fecha : ''
  }
}

export const formatearCDC = (d) => String(d || '').replace(/\D/g, '').slice(0, 44).replace(/(\d{4})(?=\d)/g, '$1 ')

/**
 * Fecha escrita rápido: «5» → día 5 del mes de referencia, «5/10» → 5 de octubre,
 * «05102026» o «5/10/26» → fecha completa. Devuelve ISO o ''.
 */
export const fechaRapida = (texto, anio, mesRef) => {
  const s = String(texto || '').trim()
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  let d
  let m
  let y
  const partes = s.split(/[/.\-\s]+/).filter(Boolean)
  if (partes.length === 1 && /^\d{6,8}$/.test(partes[0])) {
    d = partes[0].slice(0, 2); m = partes[0].slice(2, 4); y = partes[0].slice(4)
  } else {
    [d, m, y] = partes
  }
  m = m || mesRef
  y = y || anio
  if (String(y).length === 2) y = `20${y}`
  if (!/^\d+$/.test(`${d}${m}${y}`)) return ''
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const dt = new Date(`${iso}T00:00:00Z`)
  return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === iso ? iso : ''
}

/** saldo pendiente con una persona (cuenta corriente de clientes o proveedores) */
export const saldoPersona = (docs, ruc, lado) => {
  let saldo = 0
  docs.filter((d) => d.personaRuc === ruc).forEach((d) => {
    const t = TIPOS[d.tipo]
    if (!t || t.lado !== lado) return
    if (TIPOS_FISCALES.includes(d.tipo)) {
      if (d.condicion !== 'credito') return
      saldo += t.signo * totalesDe(d).total
    } else if (['recibo-cobro', 'recibo-pago', 'ret-recibida', 'ret-emitida'].includes(d.tipo)) {
      saldo -= n0(d.monto)
    }
  })
  return saldo
}

/* ── activo fijo: revalúo y depreciación ────────────────────── */

export const CATEGORIAS_ACTIVO = [
  { id: 'terrenos', label: 'Terrenos', cuenta: '1.2.03.01', vida: 0 },
  { id: 'edificios', label: 'Edificios', cuenta: '1.2.03.02', vida: 40 },
  { id: 'rodados', label: 'Rodados', cuenta: '1.2.03.03', vida: 5 },
  { id: 'maquinarias', label: 'Maquinarias y equipos', cuenta: '1.2.03.04', vida: 10 },
  { id: 'muebles', label: 'Muebles y útiles', cuenta: '1.2.03.05', vida: 10 },
  { id: 'informatica', label: 'Equipos de informática', cuenta: '1.2.03.06', vida: 4 },
  { id: 'herramientas', label: 'Herramientas', cuenta: '1.2.03.07', vida: 5 }
]

/**
 * Cuadro de revalúo y depreciación al cierre de `ejercicio`.
 * Cada año: el valor y la depreciación acumulada al inicio se multiplican por el
 * coeficiente de revalúo de ese ejercicio; la cuota es el valor residual revaluado
 * repartido entre los meses de vida útil que faltan (el primer año, desde el mes de alta).
 */
export const cuadroActivo = (activo, ejercicio) => {
  const alta = activo.fechaAlta || `${ejercicio}-01-01`
  const anioAlta = Number(alta.slice(0, 4))
  const mesAlta = Number(alta.slice(5, 7)) || 1
  const vidaMeses = Math.round((Number(activo.vidaUtil) || 0) * 12)
  const coefs = activo.coeficientes || {}

  let valor = n0(activo.valorOrigen)
  let depAcum = 0
  let mesesUsados = 0
  let fila = null

  if (ejercicio < anioAlta) return null
  if (activo.fechaBaja && Number(activo.fechaBaja.slice(0, 4)) < ejercicio) return null

  for (let y = anioAlta; y <= ejercicio; y++) {
    const coef = Number(coefs[y]) > 0 ? Number(coefs[y]) : 1
    const valorInicio = valor
    const depInicio = depAcum
    const valorRev = Math.round(valorInicio * coef)
    const depRev = Math.round(depInicio * coef)
    const mesesAnio = y === anioAlta ? 13 - mesAlta : 12
    const restantes = Math.max(vidaMeses - mesesUsados, 0)
    const mesesDep = vidaMeses ? Math.min(mesesAnio, restantes) : 0
    const residual = valorRev - depRev
    const cuota = mesesDep && restantes ? Math.round((residual * mesesDep) / restantes) : 0

    fila = {
      anio: y,
      coef,
      valorInicio,
      valorRevaluado: valorRev,
      revaluoValor: valorRev - valorInicio,
      depInicio,
      depRevaluada: depRev,
      revaluoDep: depRev - depInicio,
      cuota,
      depCierre: depRev + cuota,
      neto: valorRev - depRev - cuota,
      mesesDep
    }
    valor = valorRev
    depAcum = depRev + cuota
    mesesUsados += mesesDep
  }
  return fila
}

/** asiento de cierre del activo fijo para un ejercicio */
export const asientoActivos = (activos, ejercicio) => {
  const porCuenta = new Map()
  let depTotal = 0
  let revDepTotal = 0
  activos.forEach((a) => {
    const f = cuadroActivo(a, ejercicio)
    if (!f) return
    const cuenta = a.cuenta || CATEGORIAS_ACTIVO.find((c) => c.id === a.categoria)?.cuenta || '1.2.03.04'
    porCuenta.set(cuenta, (porCuenta.get(cuenta) || 0) + f.revaluoValor)
    depTotal += f.cuota
    revDepTotal += f.revaluoDep
  })
  const lineas = []
  let revaluoNeto = 0
  porCuenta.forEach((monto, cuenta) => {
    if (monto) {
      lineas.push(linea(cuenta, monto, 0, 'Revalúo del ejercicio'))
      revaluoNeto += monto
    }
  })
  if (revaluoNeto) lineas.push(linea(CTA.RESERVA_REVALUO, 0, revaluoNeto, 'Revalúo del ejercicio'))
  if (revDepTotal) {
    lineas.push(linea(CTA.RESERVA_REVALUO, revDepTotal, 0, 'Revalúo de la depreciación acumulada'))
    lineas.push(linea(CTA.DEP_ACUMULADA, 0, revDepTotal, 'Revalúo de la depreciación acumulada'))
  }
  if (depTotal) {
    lineas.push(linea(CTA.DEP_EJERCICIO, depTotal, 0, 'Depreciación del ejercicio'))
    lineas.push(linea(CTA.DEP_ACUMULADA, 0, depTotal, 'Depreciación del ejercicio'))
  }
  return lineas
}
