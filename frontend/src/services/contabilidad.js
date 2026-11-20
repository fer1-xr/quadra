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
  depreciacion: { label: 'Revalúo y depreciación', corto: 'Activo fijo' },
  // recuento físico de existencias al cierre: respalda el Libro Inventario, no genera asiento
  inventario: { label: 'Inventario de existencias', corto: 'Inventario' }
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

/**
 * Quién emite cada timbrado, aprendido de lo ya cargado para todos los clientes del estudio:
 * las compras dicen el timbrado de cada proveedor; las ventas y los timbrados del catastro,
 * el del propio cliente (que puede ser proveedor de otro cliente).
 * Devuelve una función: timbrado → { ruc, nombre, usos, otros } | null.
 * (La DNIT no ofrece una consulta pública timbrado → RUC: sus consultas piden el RUC y un captcha.)
 */
export const indiceTimbrados = ({ comprobantes = [], timbrados = [], clientes = [] }) => {
  const porCliente = new Map(clientes.filter((c) => c.ruc).map((c) => [String(c.id), { ruc: c.ruc, nombre: c.razonSocial || '' }]))
  const mapa = new Map() // timbrado → Map(ruc → { ruc, nombre, usos, fecha })
  const sumar = (timbrado, ruc, nombre, fecha = '') => {
    if (!timbradoValido(timbrado) || !analizarRuc(ruc).formato) return
    if (!mapa.has(timbrado)) mapa.set(timbrado, new Map())
    const m = mapa.get(timbrado)
    const p = m.get(ruc) || { ruc, nombre: '', usos: 0, fecha: '' }
    p.usos += 1
    // el nombre más reciente gana (corrige razones sociales mal escritas)
    if (nombre && (!p.nombre || fecha >= p.fecha)) { p.nombre = String(nombre).trim(); p.fecha = fecha }
    m.set(ruc, p)
  }
  comprobantes.forEach((d) => {
    const lado = TIPOS[d.tipo]?.lado
    if (!lado || !d.timbrado) return
    if (lado === 'compra' && !TIPOS[d.tipo].emitido) sumar(String(d.timbrado), d.personaRuc, d.personaNombre, d.fecha)
    else if (TIPOS[d.tipo].emitido) {
      const c = porCliente.get(String(d.clienteId))
      if (c) sumar(String(d.timbrado), c.ruc, c.nombre, d.fecha)
    }
  })
  timbrados.forEach((t) => {
    const c = porCliente.get(String(t.clienteId))
    if (c) sumar(String(t.numero), c.ruc, c.nombre, t.inicio || '')
  })
  return (timbrado) => {
    const m = mapa.get(String(timbrado || ''))
    if (!m) return null
    const lista = [...m.values()].filter((p) => p.nombre).sort((a, b) => b.usos - a.usos || b.fecha.localeCompare(a.fecha))
    if (!lista.length) return null
    return { ...lista[0], otros: lista.slice(1) }
  }
}

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

  if (doc.anulado) return []
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
      if (!d.anulado) saldo -= n0(d.monto)
    }
  })
  return saldo
}

/**
 * Facturas a crédito de una persona con su saldo pendiente.
 * Los recibos y retenciones se aplican primero a las facturas que nombran
 * (aplicaciones o número de factura); lo que no nombra ninguna factura,
 * y las notas de crédito sin factura asociada, cancelan las más antiguas primero.
 * `excluirId` deja afuera el recibo que se está editando.
 */
export const facturasPendientes = (docs, ruc, lado, excluirId) => {
  if (!ruc) return []
  const tipos = lado === 'venta' ? ['venta', 'nd-venta'] : ['compra', 'nd-compra']
  const nc = lado === 'venta' ? 'nc-venta' : 'nc-compra'
  const deLaPersona = docs.filter((d) => d.personaRuc === ruc && d.id !== excluirId)
  const facturas = deLaPersona
    .filter((d) => tipos.includes(d.tipo) && d.condicion === 'credito')
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || (a.numero || '').localeCompare(b.numero || ''))
    .map((d) => ({ id: d.id, tipo: d.tipo, numero: d.numero, fecha: d.fecha, timbrado: d.timbrado, total: totalesDe(d).total, saldo: totalesDe(d).total }))
  const porNumero = new Map(facturas.map((f) => [f.numero, f]))
  const porId = new Map(facturas.map((f) => [f.id, f]))
  let suelto = 0
  const aplicar = (f, monto) => {
    if (!f) { suelto += monto; return }
    const m = Math.min(f.saldo, monto)
    f.saldo -= m
    suelto += monto - m
  }

  deLaPersona.forEach((d) => {
    if (d.anulado) return
    if (d.tipo === nc) {
      const total = totalesDe(d).total
      const filas = (d.facturas || []).filter((r) => r.factura)
      if (filas.length) {
        const tc = d.moneda && d.moneda !== 'PYG' ? Number(d.cambio) || 1 : 1
        let usado = 0
        filas.forEach((r) => {
          const m = Math.round((n0(r.g10) + n0(r.g5) + n0(r.ex)) * tc)
          usado += m
          aplicar(porNumero.get(r.factura), m)
        })
        if (total > usado) suelto += total - usado
      } else aplicar(d.asociado ? porNumero.get(d.asociado) : null, total)
      return
    }
    if (!['recibo-cobro', 'recibo-pago', 'ret-recibida', 'ret-emitida'].includes(d.tipo) || TIPOS[d.tipo].lado !== lado) return
    const monto = n0(d.monto)
    if (d.aplicaciones?.length) {
      let usado = 0
      d.aplicaciones.forEach((a) => {
        usado += n0(a.monto)
        aplicar(porId.get(a.facturaId) || porNumero.get(a.numero), n0(a.monto))
      })
      if (monto > usado) suelto += monto - usado
    } else {
      const refs = String(d.facturaRef || '').split(/[,;\s]+/).map((x) => porNumero.get(formatearNumero(x))).filter(Boolean)
      let resto = monto
      refs.forEach((f) => { const m = Math.min(f.saldo, resto); f.saldo -= m; resto -= m })
      suelto += resto
    }
  })

  // lo que no nombra factura cancela las más antiguas
  facturas.forEach((f) => {
    if (suelto <= 0) return
    const m = Math.min(f.saldo, suelto)
    f.saldo -= m
    suelto -= m
  })
  return facturas.filter((f) => f.saldo > 0)
}

/** importe en letras, para imprimir recibos («un millón doscientos mil») */
export const enLetras = (n) => {
  const U = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve']
  const D = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
  const C = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']
  const cientos = (x) => {
    if (x === 100) return 'cien'
    const c = Math.floor(x / 100)
    const r = x % 100
    const dec = r < 30 ? U[r] : `${D[Math.floor(r / 10)]}${r % 10 ? ` y ${U[r % 10]}` : ''}`
    return [C[c], dec].filter(Boolean).join(' ')
  }
  // «uno» se apocopa delante de mil / millones: veintiún mil, un millón
  const apocope = (txt) => txt.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un')
  const miles = (x) => {
    const m = Math.floor(x / 1000)
    const r = x % 1000
    const pre = m === 0 ? '' : m === 1 ? 'mil' : `${apocope(cientos(m))} mil`
    return [pre, cientos(r)].filter(Boolean).join(' ')
  }
  let v = Math.round(Math.abs(Number(n) || 0))
  if (!v) return 'cero'
  const mill = Math.floor(v / 1e6)
  v %= 1e6
  const pre = mill === 0 ? '' : mill === 1 ? 'un millón' : `${apocope(miles(mill))} millones`
  return [pre, miles(v)].filter(Boolean).join(' ')
}

/* ── activo fijo: depreciación (Ley 6380/19, Dto. 3182/19, RG 77/20) ── */

/** grupos del cuadro: cada uno con su cuenta del activo y su clase por defecto */
export const CATEGORIAS_ACTIVO = [
  { id: 'terrenos', label: 'Terrenos', cuenta: '1.2.03.01', vida: 0, prefijo: 'TE', clase: 'terrenos' },
  { id: 'edificios', label: 'Edificios, construcciones e instalaciones', cuenta: '1.2.03.02', vida: 30, prefijo: 'ED', clase: 'construcciones' },
  { id: 'rodados', label: 'Rodados y transporte', cuenta: '1.2.03.03', vida: 5, prefijo: 'RO', clase: 'vehiculos' },
  { id: 'maquinarias', label: 'Maquinarias e implementos', cuenta: '1.2.03.04', vida: 10, prefijo: 'MQ', clase: 'maquinarias' },
  { id: 'muebles', label: 'Muebles y útiles', cuenta: '1.2.03.05', vida: 5, prefijo: 'MU', clase: 'muebles_general' },
  { id: 'informatica', label: 'Equipos informáticos', cuenta: '1.2.03.06', vida: 2, prefijo: 'IN', clase: 'informatica' },
  { id: 'herramientas', label: 'Herramientas y equipos', cuenta: '1.2.03.07', vida: 5, prefijo: 'HE', clase: 'herramientas' }
]

/**
 * Clasificación de los bienes del activo fijo · Decreto 3182/2019 Art. 31:
 * años de vida útil y porcentaje de valor residual de cada clase.
 */
export const CLASES_AVU = [
  { id: 'terrenos', grupo: 'terrenos', inciso: '—', label: 'Terrenos (no se deprecian)', vida: 0, residual: 0 },
  { id: 'construcciones', grupo: 'edificios', inciso: '1.g.I', label: 'Construcciones y mejoras de inmuebles urbanos y rurales', vida: 30, residual: 0.2 },
  { id: 'silos', grupo: 'edificios', inciso: '1.g.II', label: 'Silos, almacenes y galpones', vida: 20, residual: 0.2 },
  { id: 'tanques', grupo: 'edificios', inciso: '1.g.III', label: 'Tanques de agua, bebederos y similares', vida: 5, residual: 0.1 },
  { id: 'canales', grupo: 'edificios', inciso: '1.g.IV', label: 'Canales de regadío, tajamares y pozos', vida: 15, residual: 0.2 },
  { id: 'alambrados', grupo: 'edificios', inciso: '1.g.V', label: 'Alambrados, tranqueras y corrales', vida: 10, residual: 0.2 },
  { id: 'construcciones_terceros', grupo: 'edificios', inciso: '1.g.VI', label: 'Construcciones en propiedad de terceros', vida: 20, residual: 0 },
  { id: 'mejoras_terceros', grupo: 'edificios', inciso: '1.g.VII', label: 'Mejoras en propiedad de terceros', vida: 10, residual: 0 },
  { id: 'electrificacion', grupo: 'edificios', inciso: '1.g.VIII', label: 'Instalaciones de electrificación', vida: 10, residual: 0.1 },
  { id: 'caminos', grupo: 'edificios', inciso: '1.g.IX', label: 'Caminos internos', vida: 15, residual: 0.2 },
  { id: 'instalaciones', grupo: 'edificios', inciso: '1.g.X', label: 'Instalaciones eléctricas, contra incendios, mamparas y otras incorporadas a construcciones', vida: 10, residual: 0.2 },
  { id: 'construcciones_otros', grupo: 'edificios', inciso: '1.g.XI', label: 'Otros bienes de construcción', vida: 5, residual: 0.2 },
  { id: 'vehiculos', grupo: 'rodados', inciso: '1.c.I', label: 'Vehículos automotores', vida: 5, residual: 0.2 },
  { id: 'motos', grupo: 'rodados', inciso: '1.c.II', label: 'Motocicletas, motonetas, cuatriciclos, triciclos y bicicletas', vida: 2, residual: 0.1 },
  { id: 'transporte_publico', grupo: 'rodados', inciso: '1.c.III', label: 'Transporte público de pasajeros y vehículos utilitarios', vida: 10, residual: 0.2 },
  { id: 'transporte_otros', grupo: 'rodados', inciso: '1.c.IV', label: 'Otros bienes de transporte terrestre', vida: 5, residual: 0.2 },
  { id: 'aeronaves', grupo: 'rodados', inciso: '1.d.I', label: 'Aviones y demás aeronaves', vida: 20, residual: 0.2 },
  { id: 'material_vuelo', grupo: 'rodados', inciso: '1.d.II', label: 'Material de vuelo', vida: 2, residual: 0.1 },
  { id: 'embarcaciones_comerciales', grupo: 'rodados', inciso: '1.e.I', label: 'Embarcaciones motorizadas para explotación comercial y barcazas', vida: 20, residual: 0.2 },
  { id: 'embarcaciones', grupo: 'rodados', inciso: '1.e.II', label: 'Embarcaciones motorizadas en general (lanchas y similares)', vida: 10, residual: 0.2 },
  { id: 'canoas', grupo: 'rodados', inciso: '1.e.III', label: 'Canoas, botes y otras embarcaciones', vida: 5, residual: 0.1 },
  { id: 'ferroviario', grupo: 'rodados', inciso: '1.f.I', label: 'Locomotoras, vagones y material rodante ferroviario', vida: 20, residual: 0.2 },
  { id: 'vias', grupo: 'rodados', inciso: '1.f.II', label: 'Construcción de vías y demás bienes ferroviarios', vida: 10, residual: 0.2 },
  { id: 'maquinarias', grupo: 'maquinarias', inciso: '1.b.I', label: 'Maquinarias e implementos', vida: 10, residual: 0.2 },
  { id: 'muebles_general', grupo: 'muebles', inciso: '1.a.I', label: 'Muebles y equipos en general', vida: 5, residual: 0.1 },
  { id: 'muebles_vivienda', grupo: 'muebles', inciso: '1.a.II', label: 'Muebles y enseres en viviendas para el personal', vida: 2, residual: 0.1 },
  { id: 'utiles_rurales', grupo: 'muebles', inciso: '1.a.III', label: 'Útiles de trabajo rural para el personal', vida: 2, residual: 0.1 },
  { id: 'utiles_enseres', grupo: 'muebles', inciso: '1.a.IV', label: 'Útiles y enseres en general', vida: 2, residual: 0.1 },
  { id: 'informatica', grupo: 'informatica', inciso: '1.b.III', label: 'Equipos de informática', vida: 2, residual: 0.1 },
  { id: 'herramientas', grupo: 'herramientas', inciso: '1.b.II', label: 'Herramientas y equipos', vida: 5, residual: 0.1 }
]

/** primer ejercicio del régimen de la Ley 6380/19 */
export const ANIO_LEY_6380 = 2020

/** clase del Art. 31 del bien (los cargados antes la toman de su grupo) */
export const claseDe = (a) =>
  CLASES_AVU.find((c) => c.id === a?.claseAvu) ||
  CLASES_AVU.find((c) => c.id === CATEGORIAS_ACTIVO.find((g) => g.id === a?.categoria)?.clase) ||
  CLASES_AVU.find((c) => c.id === 'maquinarias')

/** porcentaje de valor residual fiscal del bien (0 a 0,2) */
export const residualPctDe = (a) => {
  const p = Number(a?.residualPct)
  return Number.isFinite(p) && a?.residualPct !== '' && a?.residualPct != null ? p : claseDe(a).residual
}

/** siguiente código libre del grupo: RO-001, RO-002… */
export const siguienteCodigoActivo = (activos, categoria) => {
  const pre = CATEGORIAS_ACTIVO.find((c) => c.id === categoria)?.prefijo || 'AF'
  const usados = activos
    .map((a) => String(a.codigo || ''))
    .filter((c) => c.startsWith(`${pre}-`))
    .map((c) => Number(c.slice(pre.length + 1)))
    .filter((n) => Number.isInteger(n) && n > 0)
  return `${pre}-${String((usados.length ? Math.max(...usados) : 0) + 1).padStart(3, '0')}`
}

/** primer ejercicio en que el bien se deprecia: el de la compra o el siguiente */
export const inicioDepreciacion = (activo) => {
  const anio = Number((activo.fechaAlta || '').slice(0, 4)) || 0
  return activo.computarDesde === 'siguiente' ? anio + 1 : anio
}

/** bien comprado antes de la Ley 6380/19: arranca en 2020 con el valor fiscal neto al cierre de 2019 */
export const esAnterior6380 = (activo) => (Number((activo.fechaAlta || '').slice(0, 4)) || 0) < ANIO_LEY_6380
const tieneVfn2019 = (a) => a.vfn2019 !== '' && a.vfn2019 != null && Number.isFinite(Number(a.vfn2019))

/**
 * Cuadro de depreciación de un bien, ejercicio por ejercicio, hasta `hasta`,
 * con las columnas del modelo de la RG 77/20:
 *   residual (6)   = costo × % residual  (bienes anteriores a 2020: VFN al 31/12/2019 × %)
 *   base (10)      = (VFN del ejercicio anterior − residual) × coeficiente de revalúo (si lo hay)
 *   cuota (11)     = base ÷ (años de vida útil restantes al cierre + 1)
 *   VFN cierre (13) = base + residual − cuota
 * La cuota se calcula entera desde el ejercicio de compra o el siguiente; en el ejercicio
 * de venta o baja se prorratea por los meses transcurridos.
 */
export const cuadroActivoAnios = (activo, hasta) => {
  const anioAlta = Number((activo.fechaAlta || '').slice(0, 4)) || hasta
  const fechaBaja = activo.fechaBaja || ''
  const anioBaja = fechaBaja ? Number(fechaBaja.slice(0, 4)) : Infinity
  const mesBaja = fechaBaja ? Number(fechaBaja.slice(5, 7)) || 12 : 12
  const coefs = activo.coeficientes || {}
  const pct = residualPctDe(activo)
  const costo = n0(activo.valorOrigen)
  const vida = Math.max(Math.round(Number(activo.vidaUtil) || 0), 0)
  const inicio = inicioDepreciacion(activo)
  const fin = inicio + vida - 1

  // contable: por defecto igual al fiscal
  const costoCont = n0(activo.costoContable) || costo
  const vidaCont = Math.max(Math.round(Number(activo.vidaUtilContable) || vida), 0)
  const finCont = inicio + vidaCont - 1

  // bienes anteriores a la Ley 6380/19: el cuadro arranca en 2020 con los valores al 31/12/2019
  const desde2019 = anioAlta < ANIO_LEY_6380 && tieneVfn2019(activo)
  const primerAnio = desde2019 ? ANIO_LEY_6380 : anioAlta
  const vfnUltimoIracis = desde2019 ? n0(activo.vfn2019) : null
  const depAnterior = desde2019 ? n0(activo.depAcum2019) : 0
  const residual = Math.round((desde2019 ? vfnUltimoIracis : costo) * pct)
  const residualCont = Math.round((desde2019 ? vfnUltimoIracis : costoCont) * pct)

  let vfn = desde2019 ? vfnUltimoIracis : costo // valor fiscal neto del ejercicio anterior
  let depAcum = depAnterior
  let vcn = desde2019 ? vfnUltimoIracis : costoCont // valor contable neto del ejercicio anterior
  let depAcumCont = depAnterior
  let bruto = desde2019 ? vfnUltimoIracis + depAnterior : costo // valor de origen más revalúos
  const filas = []

  for (let y = primerAnio; y <= Math.min(hasta, anioBaja); y++) {
    const coef = Number(coefs[y]) > 0 ? Number(coefs[y]) : 1
    const proporcion = y === anioBaja ? mesBaja / 12 : 1

    const restantes = vida ? Math.min(Math.max(fin - y, 0), vida) : 0
    const base = Math.round((vfn - residual) * coef)
    const cuotaEntera = vida && y >= inicio && y <= fin ? Math.round(base / (restantes + 1)) : 0
    const cuota = Math.round(cuotaEntera * proporcion)
    const revaluo = base - (vfn - residual)

    const restantesCont = vidaCont ? Math.min(Math.max(finCont - y, 0), vidaCont) : 0
    const baseCont = Math.round((vcn - residualCont) * coef)
    const cuotaContEntera = vidaCont && y >= inicio && y <= finCont ? Math.round(baseCont / (restantesCont + 1)) : 0
    const cuotaCont = Math.round(cuotaContEntera * proporcion)

    bruto += revaluo
    const fila = {
      anio: y,
      alta: y === anioAlta,
      baja: y === anioBaja,
      proporcion,
      // columnas del modelo RG 77/20
      costo, // 2
      vfnUltimoIracis, // 2b
      coef, // 4
      conRevaluo: coef !== 1,
      residualPct: pct, // 5
      residual, // 6
      vida, // 7
      restantes, // 8
      vfnAnterior: vfn, // 9
      base, // 10
      cuota, // 11
      cuotaEntera,
      depAnterior: depAcum, // 12a
      depCierre: depAcum + cuota, // 12
      neto: base + residual - cuota, // 13
      residualCont, // 14
      vidaCont, // 15
      restantesCont, // 16
      vcnAnterior: vcn, // 17
      baseCont, // 18
      cuotaCont, // 19
      noDeducible: Math.max(cuotaCont - cuota, 0), // 20
      depCierreCont: depAcumCont + cuotaCont, // 21
      netoCont: baseCont + residualCont - cuotaCont, // 22
      // para el balance y el asiento de cierre
      revaluoValor: revaluo,
      revaluoDep: 0,
      valorInicio: vfn,
      depInicio: depAcum,
      depRevaluada: depAcum,
      valorRevaluado: bruto,
      mesesDep: cuota ? Math.round(12 * proporcion) : 0
    }
    filas.push(fila)
    vfn = fila.neto
    depAcum = fila.depCierre
    vcn = fila.netoCont
    depAcumCont = fila.depCierreCont
  }
  return filas
}

/** bienes comprados antes de 2020 a los que les falta el valor fiscal neto al 31/12/2019 */
export const faltaVfn2019 = (activo) => esAnterior6380(activo) && !tieneVfn2019(activo)

/** fila del cuadro al cierre de `ejercicio` (null si el bien no existía o ya se dio de baja) */
export const cuadroActivo = (activo, ejercicio) => {
  const filas = cuadroActivoAnios(activo, ejercicio)
  const f = filas[filas.length - 1]
  return f && f.anio === ejercicio ? f : null
}

/**
 * Cuadro completo de todos los bienes, desde el primer ejercicio con valores hasta `hasta`:
 * un resumen por ejercicio (VFN inicial, revalúo, depreciación, VFN al cierre)
 * con el detalle de cada bien.
 */
export const cuadroGeneral = (activos, hasta) => {
  const porAnio = new Map()
  activos.forEach((a) => {
    cuadroActivoAnios(a, hasta).forEach((f) => {
      if (!porAnio.has(f.anio)) porAnio.set(f.anio, [])
      porAnio.get(f.anio).push({ a, f })
    })
  })
  return [...porAnio.keys()].sort((x, y) => y - x).map((anio) => {
    const filas = porAnio.get(anio).sort((x, y) => (x.a.fechaAlta || '').localeCompare(y.a.fechaAlta || ''))
    const t = filas.reduce((s, { f }) => ({
      altas: s.altas + (f.alta ? f.costo : 0),
      vfnInicial: s.vfnInicial + f.vfnAnterior,
      residual: s.residual + f.residual,
      revaluo: s.revaluo + f.revaluoValor,
      depreciacion: s.depreciacion + f.cuota,
      depCierre: s.depCierre + f.depCierre,
      vfnFinal: s.vfnFinal + f.neto,
      noDeducible: s.noDeducible + f.noDeducible
    }), { altas: 0, vfnInicial: 0, residual: 0, revaluo: 0, depreciacion: 0, depCierre: 0, vfnFinal: 0, noDeducible: 0 })
    return { anio, filas, ...t }
  })
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
