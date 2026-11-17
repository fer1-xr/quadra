import * as XLSX from 'xlsx'
import { TIPOS, CTA, formatearNumero, numeroValido, analizarRuc, fechaRapida, dvRuc } from './contabilidad.js'

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/* ── importación (Marangatu / Excel propio) ─────────────────── */

const toNum = (v) => {
  if (typeof v === 'number') return Math.round(v)
  let s = String(v ?? '').replace(/[^\d.,-]/g, '')
  if (!s) return 0
  if (s.includes('.') && s.includes(',')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  else if (/^-?\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, '')
  else s = s.replace(',', '.')
  return Math.round(Number(s) || 0)
}

const fechaCelda = (v) => {
  if (v instanceof Date) return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : ''
  }
  return fechaRapida(String(v || '').trim().split(' ')[0], '', '')
}

const nh = (v) => normalizar(v).replace(/[^a-z0-9]+/g, ' ').trim()

/** detecta columnas por sinónimos: sirve para el registro de Marangatu (RG90) y para planillas propias */
const columnas = (hs) => {
  const busca = (...tests) => {
    for (const tst of tests) {
      const i = hs.findIndex(tst)
      if (i >= 0) return i
    }
    return -1
  }
  return {
    fecha: busca((h) => h.includes('fecha de emision'), (h) => h.startsWith('fecha')),
    tipo: busca((h) => h === 'tipo de comprobante', (h) => h.includes('tipo de comprobante'), (h) => h === 'tipo' || h === 'tipo doc'),
    timbrado: busca((h) => h.includes('timbrado')),
    numero: busca((h) => h === 'numero de comprobante', (h) => h === 'documento', (h) => h === 'factura' || h === 'numero', (h) => h.includes('comprobante') && !h.includes('tipo') && !h.includes('total')),
    ruc: busca((h) => h.includes('identificacion del informado'), (h) => h === 'ruc', (h) => h.startsWith('ruc ') && !h.includes('informante')),
    dv: busca((h) => h === 'dv' || h === 'd v'),
    nombre: busca((h) => h.includes('razon social del informado'), (h) => h.includes('razon social'), (h) => h.includes('nombre'), (h) => h === 'proveedor' || h === 'cliente'),
    g10: busca((h) => (h.includes('gravad') || h.includes('grav ')) && h.includes('10')),
    iva10: busca((h) => h === 'iva 10' || h === 'iva 10 '),
    g5: busca((h) => (h.includes('gravad') || h.includes('grav ')) && h.includes('5') && !h.includes('10')),
    iva5: busca((h) => h === 'iva 5'),
    ex: busca((h) => h.includes('no gravado'), (h) => h.startsWith('exent')),
    total: busca((h) => h === 'total comprobante', (h) => h.includes('monto total'), (h) => h === 'total'),
    cond: busca((h) => h.includes('condicion')),
    cdc: busca((h) => h === 'cdc' || h.includes('cdc')),
    cuenta: busca((h) => h === 'cuenta' || h.includes('cuenta contable')),
    moneda: busca((h) => h === 'moneda'),
    cambio: busca((h) => h.includes('cambio') || h === 'tc'),
    // columnas propias del registro RG 90 de Marangatu
    registro: busca((h) => h === 'tipo de registro'),
    informante: busca((h) => h === 'ruc del informante'),
    asociado: busca((h) => h === 'numero de comprobante asociado'),
    imputaIva: busca((h) => h === 'imputa iva'),
    imputaIre: busca((h) => h === 'imputa ire'),
    imputaIrp: busca((h) => h === 'imputa irp'),
    noImputar: busca((h) => h === 'no imputar')
  }
}

/** un monto gravado que viene sin IVA (base) se reconoce porque es ~10 o ~20 veces el IVA */
const gravadoConIva = (grav, iva, divisor) => {
  if (grav && iva && Math.abs(grav - iva * (divisor - 1)) <= 2) return grav + iva
  return grav || (iva ? iva * divisor : 0)
}

/** «COMPRAS» / «VENTAS» de la columna Tipo de Registro; ingresos y egresos (IRP) no van a los libros IVA */
const ladoRegistro = (txt) => {
  const t = nh(txt)
  if (t.startsWith('compra')) return 'compra'
  if (t.startsWith('venta')) return 'venta'
  return t ? null : undefined
}

/**
 * Lee un registro de comprobantes (Marangatu RG 90 o planilla propia).
 * Si el archivo trae la columna «Tipo de Registro» (RG 90) cada fila va a su
 * libro: COMPRAS al Libro Compras y VENTAS al Libro Ventas; `lado` queda como
 * libro por defecto para las filas sin registro.
 */
export const leerLibro = async (file, { lado, tipos, ejercicio, existentes, recordarCuenta }) => {
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true })
  let hoja = null
  for (const name of wb.SheetNames) {
    const filas = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: true })
    const i = filas.slice(0, 30).findIndex((f) => {
      const hs = f.map(nh)
      return hs.some((h) => h === 'ruc' || h.includes('identificacion del informado')) && hs.some((h) => h.includes('comprobante') || h === 'documento' || h === 'factura' || h === 'numero')
    })
    if (i >= 0) { hoja = { filas, i }; break }
  }
  if (!hoja) throw new Error('No encontré los títulos de columnas (RUC, número de comprobante, importes). Usá el archivo de Marangatu o el modelo de Quadra.')

  const c = columnas(hoja.filas[hoja.i].map(nh))
  const docs = []
  const errores = []
  let duplicados = 0
  let informante = ''
  const omitidos = {}
  const omitir = (motivo) => { omitidos[motivo] = (omitidos[motivo] || 0) + 1 }
  const vistos = new Set(existentes.map((d) => `${d.tipo}|${d.numero}|${d.personaRuc}`))
  hoja.filas.slice(hoja.i + 1).forEach((f, k) => {
    const fila = hoja.i + k + 2
    const val = (i) => (i >= 0 ? f[i] : '')
    if (!String(val(c.ruc)).trim() && !String(val(c.numero)).trim()) return
    if (!informante && c.informante >= 0) informante = String(val(c.informante)).replace(/\D/g, '')
    const reg = c.registro >= 0 ? ladoRegistro(val(c.registro)) : undefined
    if (reg === null) { omitir(`registro ${String(val(c.registro)).trim().toLowerCase()}`); return }
    const ladoFila = reg || lado
    const tipoTxt = nh(val(c.tipo))
    if (tipoTxt && /(retencion|recibo|remision|autofactura|boleta)/.test(tipoTxt)) { omitir(String(val(c.tipo)).trim().toLowerCase()); return }
    const tipo = tipoTxt.includes('credito') ? `nc-${ladoFila}` : tipoTxt.includes('debito') ? `nd-${ladoFila}` : ladoFila
    if (!tipos.includes(tipo)) { omitir(TIPOS[tipo]?.label.toLowerCase() || tipo); return }

    let ruc = String(val(c.ruc)).trim().replace(/\s/g, '')
    const dvCelda = String(val(c.dv)).replace(/\D/g, '')
    if (/^\d+$/.test(ruc)) ruc = `${ruc.replace(/^0+/, '')}-${dvCelda || dvRuc(ruc)}`
    const numero = formatearNumero(String(val(c.numero)).trim())
    const fecha = fechaCelda(val(c.fecha))
    const iva10 = Math.abs(toNum(val(c.iva10)))
    const iva5 = Math.abs(toNum(val(c.iva5)))
    let g10 = gravadoConIva(Math.abs(toNum(val(c.g10))), iva10, 11)
    let g5 = gravadoConIva(Math.abs(toNum(val(c.g5))), iva5, 21)
    const ex = Math.abs(toNum(val(c.ex)))
    if (!g10 && !g5 && !ex && c.total >= 0) g10 = Math.abs(toNum(val(c.total)))
    const moneda = String(val(c.moneda) || '').toUpperCase().includes('USD') ? 'USD' : 'PYG'
    const cambio = moneda === 'PYG' ? 1 : toNum(val(c.cambio)) || 0
    if (moneda !== 'PYG' && cambio) { g10 *= cambio; g5 *= cambio }

    const ref = `Fila ${fila}`
    if (!analizarRuc(ruc).formato) { errores.push(`${ref}: RUC «${val(c.ruc)}» no válido.`); return }
    if (!numeroValido(numero)) { errores.push(`${ref}: número «${val(c.numero)}» no tiene el formato 001-001-0000001.`); return }
    if (!fecha || !fecha.startsWith(String(ejercicio))) { errores.push(`${ref}: fecha fuera del ejercicio ${ejercicio}.`); return }
    if (!g10 && !g5 && !ex) { errores.push(`${ref}: sin importes.`); return }
    const clave = `${tipo}|${numero}|${ruc}`
    if (vistos.has(clave)) { duplicados++; return }
    vistos.add(clave)
    const timbrado = String(val(c.timbrado)).replace(/\D/g, '')
    const cdc = String(val(c.cdc)).replace(/\D/g, '')
    const cuentaArchivo = String(val(c.cuenta)).trim()
    const si = (i) => (i >= 0 ? nh(val(i)) === 'si' : undefined)
    const asociado = String(val(c.asociado)).trim()
    const imputa = c.imputaIva >= 0 ? { iva: si(c.imputaIva), ire: si(c.imputaIre), irp: si(c.imputaIrp), ninguno: si(c.noImputar) } : null
    docs.push({
      tipo,
      fecha,
      numero,
      timbrado: timbrado.length === 8 ? timbrado : '',
      tipoTimbrado: cdc.length === 44 ? 'electronico' : 'preimpreso',
      cdc: cdc.length === 44 ? cdc : '',
      personaRuc: ruc,
      personaNombre: String(val(c.nombre)).trim() || ruc,
      condicion: nh(val(c.cond)).includes('credito') ? 'credito' : 'contado',
      cuentaPago: CTA.CAJA,
      gravada10: g10,
      gravada5: g5,
      exenta: ex,
      moneda: 'PYG',
      cambio: 1,
      cuenta: cuentaArchivo || recordarCuenta(ruc, tipo) || TIPOS[tipo].cuenta,
      concepto: '',
      ...(TIPOS[tipo].asociado && asociado ? { asociado: formatearNumero(asociado) } : {}),
      ...(imputa ? { imputa } : {}),
      importado: file.name
    })
  })
  return { docs, errores, duplicados, omitidos, rg90: c.registro >= 0, informante }
}

