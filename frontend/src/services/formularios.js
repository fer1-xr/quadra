/**
 * QUADRA · Formularios de declaración jurada (DNIT)
 * Arma, a partir de los comprobantes y del Diario, los renglones de cada
 * formulario para cargarlo en Marangatu:
 *  - 120 IVA (mensual)
 *  - 515 IRP Rentas del Servicio Personal (anual)
 *  - 516 IRP Rentas y Ganancias del Capital (anual)
 *  - 500 IRE General (anual)
 *  - 501 IRE Simple (anual)
 * Cada renglón: { inc, concepto, vals: [..], clave? (dato que carga el usuario), tipo? }.
 * Son borradores de trabajo: no reemplazan la declaración presentada.
 */
import { TIPOS, TIPOS_FISCALES, MESES, totalesDe, n0 } from './contabilidad.js'
import { impuestosActivos, liquidacionIVA, saldosAl, saldosJerarquicos } from './informes.js'

export const FORMULARIOS = [
  { id: 'ct-form-120', numero: '120', nombre: 'IVA', impuesto: 'Impuesto al Valor Agregado', periodo: 'mensual', para: ['iva'] },
  { id: 'ct-form-515', numero: '515', nombre: 'IRP-RSP', impuesto: 'IRP · Rentas y Ganancias del Servicio Personal', periodo: 'anual', para: ['irp_rsp', 'irp'] },
  { id: 'ct-form-516', numero: '516', nombre: 'IRP-RGC', impuesto: 'IRP · Rentas y Ganancias del Capital', periodo: 'anual', para: ['irp_rgc', 'irp'] },
  { id: 'ct-form-500', numero: '500', nombre: 'IRE General', impuesto: 'Impuesto a la Renta Empresarial · Régimen General', periodo: 'anual', para: ['ire_general'] },
  { id: 'ct-form-501', numero: '501', nombre: 'IRE Simple', impuesto: 'Impuesto a la Renta Empresarial · Régimen Simple', periodo: 'anual', para: ['ire_simple'] }
]

export const formularioDe = (id) => FORMULARIOS.find((f) => f.id === id)

/**
 * Formularios que corresponden al contribuyente según los impuestos
 * configurados (o la actividad elegida al ingresar). Sin impuestos cargados se ven todos.
 */
export const formulariosPara = (contribuyente) => {
  const imps = impuestosActivos(contribuyente)
  if (!imps.length) return FORMULARIOS
  return FORMULARIOS.filter((f) => f.para.some((id) => imps.includes(id)))
}

/* ── sumas de comprobantes ──────────────────────────────────── */

/** totales por lado de los comprobantes fiscales cuyo fecha empieza con `prefijo` (AAAA o AAAA-MM) */
const sumarLado = (docs, lado, prefijo) => {
  const s = { g10: 0, g5: 0, ex: 0, base10: 0, base5: 0, iva10: 0, iva5: 0, ncBase: 0, ncIva: 0, ncEx: 0, n: 0 }
  docs.forEach((d) => {
    if (!TIPOS_FISCALES.includes(d.tipo) || d.anulado) return
    const t = TIPOS[d.tipo]
    if (t.lado !== lado || !String(d.fecha || '').startsWith(prefijo)) return
    const x = totalesDe(d)
    s.n++
    if (t.signo < 0) {
      s.ncBase += x.base10 + x.base5
      s.ncIva += x.iva10 + x.iva5
      s.ncEx += x.ex
      return
    }
    s.g10 += x.g10; s.g5 += x.g5; s.ex += x.ex
    s.base10 += x.base10; s.base5 += x.base5
    s.iva10 += x.iva10; s.iva5 += x.iva5
  })
  return s
}

/** importe neto del año: sin IVA si el contribuyente liquida IVA (el IVA no es ingreso ni gasto), con IVA si no */
const netoAnual = (s, conIva) => (conIva
  ? s.base10 + s.base5 + s.ex - s.ncBase - s.ncEx
  : s.g10 + s.g5 + s.ex - s.ncBase - s.ncIva - s.ncEx)

/* ── escalas ────────────────────────────────────────────────── */

/** IRP (Ley 6380/19): 8 % hasta 50 millones, 9 % hasta 150 millones, 10 % sobre el excedente */
export const TRAMOS_IRP = [
  { hasta: 50000000, tasa: 0.08 },
  { hasta: 150000000, tasa: 0.09 },
  { hasta: Infinity, tasa: 0.10 }
]

export const impuestoIRP = (renta) => {
  let resto = Math.max(n0(renta), 0)
  let desde = 0
  const detalle = []
  TRAMOS_IRP.forEach((t) => {
    if (resto <= 0) return
    const tramo = Math.min(resto, t.hasta - desde)
    detalle.push({ desde, hasta: t.hasta, tasa: t.tasa, base: tramo, impuesto: Math.round(tramo * t.tasa) })
    resto -= tramo
    desde = t.hasta
  })
  return { total: detalle.reduce((s, d) => s + d.impuesto, 0), detalle }
}

/* ── armado de cada formulario ──────────────────────────────── */

const fila = (inc, concepto, valor, extra = {}) => ({ inc: String(inc), concepto, vals: [n0(valor)], ...extra })
const editable = (inc, concepto, clave, aj, extra = {}) => fila(inc, concepto, aj[clave], { clave, ...extra })

/** cierre común: impuesto − anticipos/retenciones − saldo a favor anterior */
const liquidar = (inc, impuesto, aj, conAnticipos = true) => {
  const filas = []
  let i = inc
  if (conAnticipos) filas.push(editable(i++, 'Anticipos ingresados a cuenta del impuesto', 'anticipos', aj))
  filas.push(editable(i++, 'Retenciones y percepciones sufridas', 'retenciones', aj))
  filas.push(editable(i++, 'Saldo a favor del ejercicio anterior', 'favorAnterior', aj))
  const creditos = (conAnticipos ? n0(aj.anticipos) : 0) + n0(aj.retenciones) + n0(aj.favorAnterior)
  const neto = impuesto - creditos
  filas.push(fila(i++, 'Saldo a pagar', Math.max(neto, 0), { tipo: 'total' }))
  filas.push(fila(i++, 'Saldo a favor del contribuyente', Math.max(-neto, 0), { tipo: 'total' }))
  return { filas, aPagar: Math.max(neto, 0), aFavor: Math.max(-neto, 0) }
}

function form120({ docs, ejercicio, mes, aj, saldoInicialIva }) {
  const pref = `${ejercicio}-${mes}`
  const v = sumarLado(docs, 'venta', pref)
  const c = sumarLado(docs, 'compra', pref)
  const df = v.iva10 + v.iva5 - v.ncIva
  const cf = c.iva10 + c.iva5 - c.ncIva
  // saldo a favor anterior: arrastre de la liquidación anual, salvo que el usuario lo corrija
  const meses = liquidacionIVA(docs, ejercicio, saldoInicialIva)
  const m = meses[Number(mes) - 1]
  const anteriorAuto = m ? m.anterior : 0
  const anterior = aj.favorAnterior === '' || aj.favorAnterior == null ? anteriorAuto : n0(aj.favorAnterior)
  const ret = aj.retenciones === '' || aj.retenciones == null ? (m ? m.ret : 0) : n0(aj.retenciones)
  const neto = df - cf - anterior - ret
  const cols = ['Monto imponible', 'Impuesto']
  return {
    rubros: [
      {
        titulo: 'Rubro 1 · Operaciones de venta (débito fiscal)', cols,
        filas: [
          { inc: '10', concepto: 'Ventas gravadas al 10 %', vals: [v.base10, v.iva10] },
          { inc: '11', concepto: 'Ventas gravadas al 5 %', vals: [v.base5, v.iva5] },
          { inc: '12', concepto: 'Ventas exentas', vals: [v.ex, null] },
          { inc: '13', concepto: 'Notas de crédito emitidas (devoluciones y descuentos)', vals: [-(v.ncBase + v.ncEx), -v.ncIva] },
          { inc: '14', concepto: 'Total débito fiscal', vals: [v.base10 + v.base5 + v.ex - v.ncBase - v.ncEx, df], tipo: 'total' }
        ]
      },
      {
        titulo: 'Rubro 2 · Operaciones de compra (crédito fiscal)', cols,
        filas: [
          { inc: '20', concepto: 'Compras gravadas al 10 %', vals: [c.base10, c.iva10] },
          { inc: '21', concepto: 'Compras gravadas al 5 %', vals: [c.base5, c.iva5] },
          { inc: '22', concepto: 'Compras exentas o no gravadas', vals: [c.ex, null] },
          { inc: '23', concepto: 'Notas de crédito recibidas', vals: [-(c.ncBase + c.ncEx), -c.ncIva] },
          { inc: '24', concepto: 'Total crédito fiscal del mes', vals: [c.base10 + c.base5 + c.ex - c.ncBase - c.ncEx, cf], tipo: 'total' }
        ]
      },
      {
        titulo: 'Rubro 3 · Determinación del impuesto', cols: ['Importe'],
        filas: [
          fila(30, 'Débito fiscal del mes', df),
          fila(31, 'Crédito fiscal del mes', cf),
          fila(32, 'Saldo a favor del mes anterior', anterior, { clave: 'favorAnterior', auto: anteriorAuto }),
          fila(33, 'Retenciones de IVA recibidas', ret, { clave: 'retenciones', auto: m ? m.ret : 0 }),
          fila(34, 'Saldo a pagar', Math.max(neto, 0), { tipo: 'total' }),
          fila(35, 'Saldo a favor para el mes siguiente', Math.max(-neto, 0), { tipo: 'total' })
        ]
      }
    ],
    cifras: [
      { label: 'Débito fiscal', valor: df },
      { label: 'Crédito fiscal', valor: cf },
      neto > 0 ? { label: 'IVA a pagar', valor: neto, tono: 'err' } : { label: 'Saldo a favor', valor: -neto, tono: 'ok' }
    ],
    comprobantes: v.n + c.n,
    notas: ['El saldo a favor del mes anterior y las retenciones salen de la Liquidación de IVA; podés corregirlos si difieren de Marangatu.']
  }
}

function formIRP({ docs, ejercicio, aj, conIva }, tipo) {
  const v = sumarLado(docs, 'venta', String(ejercicio))
  const c = sumarLado(docs, 'compra', String(ejercicio))
  const ingresos = netoAnual(v, conIva) + n0(aj.otrosIngresos)
  const egresos = netoAnual(c, conIva) + n0(aj.otrosEgresos)
  const renta = Math.max(ingresos - egresos, 0)
  const rsp = tipo === 'rsp'
  const imp = rsp ? impuestoIRP(renta) : { total: Math.round(renta * 0.08), detalle: [] }
  const liq = liquidar(9, imp.total, aj, false)
  const sinIva = conIva ? ' (sin IVA)' : ''
  return {
    rubros: [
      {
        titulo: rsp ? 'Rubro 1 · Ingresos por servicios personales' : 'Rubro 1 · Rentas y ganancias del capital', cols: ['Importe'],
        filas: [
          fila(1, `${rsp ? 'Ingresos gravados por servicios personales' : 'Ingresos por ventas y enajenaciones'} del ejercicio${sinIva}`, netoAnual(v, conIva)),
          editable(2, rsp ? 'Otros ingresos gravados (sueldos, honorarios sin factura…)' : 'Intereses, alquileres, dividendos y otras rentas del capital', 'otrosIngresos', aj),
          fila(3, 'Total de ingresos gravados', ingresos, { tipo: 'total' })
        ]
      },
      {
        titulo: rsp ? 'Rubro 2 · Gastos y egresos deducibles' : 'Rubro 2 · Costos y gastos', cols: ['Importe'],
        filas: [
          fila(4, `Compras y gastos documentados del ejercicio${sinIva}`, netoAnual(c, conIva)),
          editable(5, rsp ? 'Otros deducibles (aportes IPS, salud, educación…)' : 'Otros costos de adquisición y mejoras', 'otrosEgresos', aj),
          fila(6, 'Total de egresos', egresos, { tipo: 'total' })
        ]
      },
      {
        titulo: 'Rubro 3 · Liquidación del impuesto', cols: ['Importe'],
        filas: [
          fila(7, rsp ? 'Renta neta gravada' : 'Ganancia neta gravada', renta),
          fila(8, rsp ? 'Impuesto liquidado (escala 8 %, 9 % y 10 %)' : 'Impuesto liquidado (8 %)', imp.total, { tipo: 'subtotal' }),
          ...liq.filas
        ]
      }
    ],
    escala: rsp ? imp.detalle : null,
    cifras: [
      { label: 'Ingresos', valor: ingresos },
      { label: rsp ? 'Renta neta' : 'Ganancia neta', valor: renta },
      liq.aPagar || !liq.aFavor ? { label: 'Saldo a pagar', valor: liq.aPagar, tono: liq.aPagar ? 'err' : undefined } : { label: 'Saldo a favor', valor: liq.aFavor, tono: 'ok' }
    ],
    comprobantes: v.n + c.n,
    notas: [
      conIva ? 'El IVA de las facturas no se suma: se liquida aparte en el Formulario 120.' : 'Los importes incluyen el IVA facturado, porque el contribuyente no lo liquida.',
      rsp ? 'Escala del IRP (Ley 6380/19): 8 % hasta Gs. 50.000.000, 9 % hasta Gs. 150.000.000 y 10 % sobre el excedente.' : 'Tasa del IRP sobre rentas y ganancias del capital: 8 % (Ley 6380/19). Los dividendos tienen su propio régimen.'
    ]
  }
}

function form500({ docs, ejercicio, aj }) {
  const { mayor } = saldosAl(docs, ejercicio)
  const tot = saldosJerarquicos(mayor)
  const ingresos = tot.get('4') || 0
  const costos = tot.get('5') || 0
  const resultado = ingresos - costos
  const ajustada = resultado + n0(aj.noDeducibles) - n0(aj.noGravados)
  // quebrantos: se compensan hasta el 20 % de la renta neta del ejercicio (art. 18, Ley 6380/19)
  const tope = Math.max(Math.round(ajustada * 0.2), 0)
  const quebranto = Math.min(n0(aj.quebrantos), tope)
  const renta = Math.max(ajustada - quebranto, 0)
  const impuesto = Math.round(renta * 0.1)
  const liq = liquidar(11, impuesto, aj)
  return {
    rubros: [
      {
        titulo: 'Rubro 1 · Resultado contable del ejercicio', cols: ['Importe'],
        filas: [
          fila(1, 'Ingresos del ejercicio (cuentas de ingresos)', ingresos),
          fila(2, 'Costos y gastos del ejercicio (cuentas de egresos)', costos),
          fila(3, resultado >= 0 ? 'Utilidad contable' : 'Pérdida contable', resultado, { tipo: 'total' })
        ]
      },
      {
        titulo: 'Rubro 2 · Ajustes fiscales y renta neta', cols: ['Importe'],
        filas: [
          editable(4, 'Más: gastos no deducibles', 'noDeducibles', aj),
          editable(5, 'Menos: ingresos no gravados o exonerados', 'noGravados', aj),
          fila(6, 'Renta neta antes de quebrantos', ajustada, { tipo: 'subtotal' }),
          editable(7, `Menos: quebrantos de ejercicios anteriores (tope 20 %: ${n0(tope).toLocaleString('es-PY')})`, 'quebrantos', aj, { aplicado: quebranto }),
          fila(8, 'Renta neta imponible', renta, { tipo: 'total' })
        ]
      },
      {
        titulo: 'Rubro 3 · Liquidación del impuesto', cols: ['Importe'],
        filas: [
          fila(9, 'Tasa general', null, { texto: '10 %' }),
          fila(10, 'Impuesto liquidado', impuesto, { tipo: 'subtotal' }),
          ...liq.filas
        ]
      }
    ],
    cifras: [
      { label: 'Resultado contable', valor: resultado, tono: resultado < 0 ? 'err' : undefined },
      { label: 'Renta neta imponible', valor: renta },
      liq.aPagar || !liq.aFavor ? { label: 'Saldo a pagar', valor: liq.aPagar, tono: liq.aPagar ? 'err' : undefined } : { label: 'Saldo a favor', valor: liq.aFavor, tono: 'ok' }
    ],
    comprobantes: mayor.length,
    notas: [
      'Los ingresos y egresos salen del Diario (comprobantes, asientos manuales, depreciaciones), igual que el Estado de Resultados.',
      `Anticipos del ejercicio ${ejercicio + 1}: 4 cuotas de ${Math.round(impuesto * 0.25).toLocaleString('es-PY')} (25 % del impuesto liquidado cada una).`
    ]
  }
}

function form501({ docs, ejercicio, aj, conIva }) {
  const v = sumarLado(docs, 'venta', String(ejercicio))
  const c = sumarLado(docs, 'compra', String(ejercicio))
  const ingresos = netoAnual(v, conIva) + n0(aj.otrosIngresos)
  const egresos = netoAnual(c, conIva) + n0(aj.depreciacion) + n0(aj.otrosEgresos)
  const renta = Math.max(ingresos - egresos, 0)
  const impuesto = Math.round(renta * 0.1)
  const liq = liquidar(11, impuesto, aj)
  const sinIva = conIva ? ' (sin IVA)' : ''
  return {
    rubros: [
      {
        titulo: 'Rubro 1 · Ingresos', cols: ['Importe'],
        filas: [
          fila(1, `Ventas y servicios del ejercicio${sinIva}`, netoAnual(v, conIva)),
          editable(2, 'Otros ingresos gravados', 'otrosIngresos', aj),
          fila(3, 'Total de ingresos', ingresos, { tipo: 'total' })
        ]
      },
      {
        titulo: 'Rubro 2 · Costos y gastos', cols: ['Importe'],
        filas: [
          fila(4, `Compras y gastos documentados${sinIva}`, netoAnual(c, conIva)),
          editable(5, 'Depreciación de bienes del activo fijo', 'depreciacion', aj),
          editable(6, 'Otros gastos deducibles (sueldos, aportes IPS…)', 'otrosEgresos', aj),
          fila(7, 'Total de costos y gastos', egresos, { tipo: 'total' })
        ]
      },
      {
        titulo: 'Rubro 3 · Liquidación del impuesto', cols: ['Importe'],
        filas: [
          fila(8, 'Renta neta imponible', renta, { tipo: 'subtotal' }),
          fila(9, 'Tasa', null, { texto: '10 %' }),
          fila(10, 'Impuesto liquidado', impuesto, { tipo: 'subtotal' }),
          ...liq.filas
        ]
      }
    ],
    cifras: [
      { label: 'Ingresos', valor: ingresos },
      { label: 'Renta neta', valor: renta },
      liq.aPagar || !liq.aFavor ? { label: 'Saldo a pagar', valor: liq.aPagar, tono: liq.aPagar ? 'err' : undefined } : { label: 'Saldo a favor', valor: liq.aFavor, tono: 'ok' }
    ],
    comprobantes: v.n + c.n,
    notas: [conIva ? 'El IVA de las facturas no se suma: se liquida aparte en el Formulario 120.' : 'Los importes incluyen el IVA facturado, porque el contribuyente no lo liquida.']
  }
}

/**
 * Renglones del formulario `id` para el período.
 * datos: { docs, ejercicio, mes ('01'…'12', solo 120), aj (datos cargados por el usuario), conIva, saldoInicialIva }
 */
export const armarFormulario = (id, datos) => {
  const aj = datos.aj || {}
  const d = { ...datos, aj }
  switch (id) {
    case 'ct-form-120': return form120(d)
    case 'ct-form-515': return formIRP(d, 'rsp')
    case 'ct-form-516': return formIRP(d, 'rgc')
    case 'ct-form-500': return form500(d)
    case 'ct-form-501': return form501(d)
    default: return null
  }
}

export const periodoTexto = (f, ejercicio, mes) => (f.periodo === 'mensual' ? `${MESES[Number(mes) - 1]} ${ejercicio}` : `Ejercicio fiscal ${ejercicio}`)
