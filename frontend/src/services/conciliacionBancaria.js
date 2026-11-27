/**
 * QUADRA · Conciliación bancaria (carga de archivos)
 *
 * El usuario sube dos archivos:
 *  1. el libro mayor / libro bancos que exporta su sistema (Excel o CSV), y
 *  2. el extracto del banco en PDF (también acepta Excel o CSV).
 *
 * Quadra lee los movimientos de cada uno, los cruza por importe y sentido
 * (entrada con entrada, salida con salida) eligiendo la fecha más cercana,
 * y devuelve un Excel con el resumen y el detalle de lo que no coincide:
 *
 *   saldo según el banco
 *   más   depósitos del libro que el banco todavía no acreditó
 *   menos cheques y pagos del libro que el banco todavía no debitó
 *   menos créditos del banco que faltan registrar en el libro
 *   más   débitos del banco (comisiones, impuestos) que faltan registrar
 *   = saldo ajustado, que debe ser igual al saldo según el libro
 */
import * as XLSX from 'xlsx'

/* ── utilidades ─────────────────────────────────────────────── */

const nh = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100
let seq = 0
const nuevoId = (p) => `${p}${++seq}`

/** importe como lo exportan bancos y sistemas: 1.250.000 · 1.250.000,50 · 1,250,000.50 · (35.000) · 35.000- · -35000 */
export const leerImporte = (v) => {
  if (typeof v === 'number') return v
  let s = String(v ?? '').replace(/gs\.?|₲|pyg|usd|us\$|\$|\s/gi, '')
  if (!s) return 0
  let signo = 1
  if (/^\(.*\)$/.test(s)) { signo = -1; s = s.slice(1, -1) }
  if (s.endsWith('-')) { signo = -1; s = s.slice(0, -1) }
  if (s.startsWith('-')) { signo = -signo; s = s.slice(1) }
  s = s.replace(/^\+/, '')
  const coma = s.lastIndexOf(',')
  const punto = s.lastIndexOf('.')
  if (coma >= 0 && punto >= 0) {
    s = coma > punto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (coma >= 0) {
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.')
  } else if (punto >= 0) {
    s = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s
  }
  const n = Number(s)
  return Number.isFinite(n) ? signo * n : NaN
}

/** fecha de una celda o texto: Date, serie de Excel, dd/mm/aaaa, dd-mm-aa, aaaa-mm-dd o dd/mm (con `anio`) */
export const leerFecha = (v, anio) => {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
  }
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = XLSX.SSF.parse_date_code(v)
    return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : ''
  }
  const s = String(v ?? '').trim().split(/[ T]/)[0]
  let m = s.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/)
  if (m) {
    const a = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${a}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})$/)
  if (m && anio) return `${anio}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return ''
}

const valida = (f) => {
  if (!f) return false
  const [a, m, d] = f.split('-').map(Number)
  return a > 1990 && a < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31
}

const dias = (a, b) => Math.abs((new Date(`${a}T12:00:00`) - new Date(`${b}T12:00:00`)) / 86400000)

/* ── lectura de planillas (libro, o extracto en Excel) ──────── */

/**
 * Títulos que se buscan en cada planilla. En el libro, Debe es lo que entra a la
 * cuenta; en el extracto del banco, Crédito es lo que entra. Por eso `entra` y
 * `sale` cambian según de qué archivo se trate.
 */
const TITULOS = {
  libro: {
    entra: ['debe', 'debito', 'debitos', 'ingreso', 'ingresos', 'entrada', 'entradas', 'deposito', 'depositos'],
    sale: ['haber', 'credito', 'creditos', 'egreso', 'egresos', 'salida', 'salidas', 'retiro', 'retiros', 'pago', 'pagos']
  },
  banco: {
    entra: ['credito', 'creditos', 'haber', 'abono', 'abonos', 'ingreso', 'ingresos', 'deposito', 'depositos', 'entrada', 'entradas'],
    sale: ['debito', 'debitos', 'debe', 'cargo', 'cargos', 'egreso', 'egresos', 'retiro', 'retiros', 'salida', 'salidas']
  }
}
const esFecha = (h) => h === 'fecha' || h.startsWith('fecha') || h === 'fec.' || h === 'fec' || h === 'date'
const esConcepto = (h) => ['concepto', 'descripcion', 'detalle', 'glosa', 'referencia', 'movimiento', 'transaccion', 'operacion', 'explicacion'].some((x) => h.startsWith(x))
const esNumero = (h) => ['asiento', 'comprobante', 'nro', 'numero', 'n°', 'cheque', 'documento', 'doc'].some((x) => h.startsWith(x))
const esImporte = (h) => ['importe', 'monto', 'valor'].some((x) => h.startsWith(x))
const esSaldo = (h) => h.startsWith('saldo')
const empieza = (lista) => (h) => lista.some((x) => h === x || h.startsWith(`${x} `) || h.startsWith(`${x}(`) || h.startsWith(`${x}.`))

const esSaldoInicial = (t) => /saldo\s*(anterior|inicial|de apertura|al inicio|transportado|que viene)|saldo al \d/i.test(nh(t))
const esTotal = (t) => /^(total|totales|sumas|saldo final|saldo actual|saldo al cierre)/i.test(nh(t))

/**
 * Lee una planilla Excel o CSV con Fecha, Concepto y Debe/Haber (o Débito/Crédito,
 * o un Importe con signo), más Saldo opcional. `lado` es 'libro' o 'banco'.
 * Devuelve { filas, saldoInicial, saldoFinal, avisos }.
 * Cada fila: { id, fecha, numero, concepto, entra, sale }.
 */
export const leerPlanilla = async (file, lado) => {
  const wb = /\.(csv|txt)$/i.test(file.name)
    ? XLSX.read(await file.text(), { type: 'string', raw: true })
    : XLSX.read(await file.arrayBuffer(), { cellDates: true })
  const hoja = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: true })
  const T = TITULOS[lado]
  let iCab = -1
  let col = {}
  for (let i = 0; i < Math.min(hoja.length, 40); i++) {
    const hs = hoja[i].map(nh)
    const busca = (fn) => hs.findIndex((h) => h && fn(h))
    const c = {
      fecha: busca(esFecha),
      concepto: busca(esConcepto),
      numero: busca(esNumero),
      entra: busca(empieza(T.entra)),
      sale: busca(empieza(T.sale)),
      importe: busca(esImporte),
      saldo: busca(esSaldo)
    }
    if (c.fecha >= 0 && ((c.entra >= 0 && c.sale >= 0) || c.importe >= 0)) { iCab = i; col = c; break }
  }
  const nombre = lado === 'libro' ? 'El libro' : 'El extracto'
  if (iCab < 0) {
    throw new Error(`${nombre} no tiene una fila de títulos que Quadra reconozca. Tiene que tener Fecha, Concepto y ${lado === 'libro' ? 'Debe y Haber' : 'Débito y Crédito'} (o un Importe con signo). El Saldo es opcional.`)
  }

  const filas = []
  const avisos = []
  let saldoInicial = null
  let ultimoSaldo = null
  hoja.slice(iCab + 1).forEach((f, k) => {
    const nFila = iCab + k + 2
    const texto = f.map((x) => String(x ?? '')).join(' ')
    const concepto = col.concepto >= 0 ? String(f[col.concepto] ?? '').replace(/\s+/g, ' ').trim() : ''
    const numero = col.numero >= 0 ? String(f[col.numero] ?? '').trim() : ''
    let entra = 0
    let sale = 0
    if (col.entra >= 0 && col.sale >= 0) {
      entra = Math.abs(leerImporte(f[col.entra]))
      sale = Math.abs(leerImporte(f[col.sale]))
    } else {
      const imp = leerImporte(f[col.importe])
      if (imp < 0) sale = -imp
      else entra = imp
    }
    const celdaSaldo = col.saldo >= 0 ? f[col.saldo] : ''
    const saldo = String(celdaSaldo ?? '').trim() !== '' ? leerImporte(celdaSaldo) : null
    if (esSaldoInicial(texto)) {
      if (saldo != null && !Number.isNaN(saldo)) saldoInicial = saldo
      else if (entra || sale) saldoInicial = entra - sale
      return
    }
    if (esTotal(concepto || texto)) return
    const fecha = leerFecha(f[col.fecha])
    if (!String(f[col.fecha] ?? '').trim() && !entra && !sale) return
    if (!valida(fecha)) { if (entra || sale) avisos.push(`${nombre}, fila ${nFila}: no se entiende la fecha «${f[col.fecha]}»; la fila no se tomó.`); return }
    if (Number.isNaN(entra) || Number.isNaN(sale)) { avisos.push(`${nombre}, fila ${nFila}: el importe no es un número; la fila no se tomó.`); return }
    if (saldo != null && !Number.isNaN(saldo)) ultimoSaldo = saldo
    if (!entra && !sale) return
    filas.push({ id: nuevoId(lado[0]), fecha, numero, concepto: concepto || 'Sin concepto', entra: r2(entra), sale: r2(sale) })
  })
  return cerrarSaldos(filas, saldoInicial, ultimoSaldo, avisos, nombre)
}

const cerrarSaldos = (filas, saldoInicial, ultimoSaldo, avisos, nombre) => {
  const neto = filas.reduce((s, f) => s + f.entra - f.sale, 0)
  let ini = saldoInicial
  let fin = ultimoSaldo
  if (fin == null && ini == null) {
    ini = 0
    fin = r2(neto)
    avisos.push(`${nombre} no trae saldos: se calculó el saldo final sumando los movimientos desde cero.`)
  } else if (fin == null) {
    fin = r2(ini + neto)
  } else if (ini == null) {
    ini = r2(fin - neto)
  }
  return { filas, saldoInicial: r2(ini), saldoFinal: r2(fin), avisos }
}

/* ── lectura del extracto en PDF ────────────────────────────── */

const RX_FECHA = /^(\d{1,2}[/.-]\d{1,2}([/.-](\d{2}|\d{4}))?|\d{4}-\d{2}-\d{2})$/
// importes con separador de miles o con decimales: 1.250.000 · 1.250.000,50 · 35,00 · (35.000) · 35.000-
const RX_IMPORTE = /^\(?[-+]?(\d{1,3}([.,]\d{3})+([.,]\d{1,2})?|\d+[.,]\d{2})\)?-?$/
const RX_ENTERO = /^\(?[-+]?\d+\)?-?$/

/** palabras del PDF agrupadas en renglones, con su posición horizontal */
const renglonesDelPdf = async (file) => {
  const pdfjs = await import('pdfjs-dist')
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const paginas = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const { items } = await page.getTextContent()
    const palabras = []
    items.forEach((it) => {
      const str = String(it.str || '')
      if (!str.trim()) return
      const x0 = it.transform[4]
      const y = it.transform[5]
      const ancho = it.width || str.length * 5
      // un mismo trozo puede traer varias columnas separadas por espacios
      const partes = str.split(/(\s{2,})/)
      let off = 0
      partes.forEach((t) => {
        if (t.trim()) {
          const x = x0 + (ancho * off) / str.length
          const w = (ancho * t.length) / str.length
          t.trim().split(/\s+/).length && palabras.push({ t: t.trim(), x, w, y })
        }
        off += t.length
      })
    })
    // renglones: misma altura con un margen de 3 puntos
    palabras.sort((a, b) => b.y - a.y || a.x - b.x)
    const renglones = []
    palabras.forEach((w) => {
      const r = renglones.find((x) => Math.abs(x.y - w.y) <= 3)
      if (r) r.palabras.push(w)
      else renglones.push({ y: w.y, palabras: [w] })
    })
    renglones.forEach((r) => r.palabras.sort((a, b) => a.x - b.x))
    paginas.push(renglones)
  }
  return paginas
}

/** separa los tokens de un renglón: un trozo "PAGO CHEQUE 123" queda en palabras */
const tokensDe = (renglon) => renglon.palabras.flatMap((w) => {
  const ps = w.t.split(/\s+/)
  if (ps.length === 1) return [{ t: w.t, x: w.x + w.w / 2, x0: w.x }]
  let off = 0
  return ps.map((p) => {
    const i = w.t.indexOf(p, off)
    off = i + p.length
    const x0 = w.x + (w.w * i) / w.t.length
    return { t: p, x: x0 + (w.w * p.length) / w.t.length / 2, x0 }
  })
})

const columnasDelTitulo = (tokens) => {
  const c = {}
  tokens.forEach((k) => {
    const h = nh(k.t).replace(/[.:]/g, '')
    if (c.sale == null && TITULOS.banco.sale.includes(h)) c.sale = k.x
    else if (c.entra == null && TITULOS.banco.entra.includes(h)) c.entra = k.x
    else if (c.saldo == null && h === 'saldo') c.saldo = k.x
  })
  return c.sale != null && c.entra != null ? c : null
}

/**
 * Lee el extracto bancario de un PDF con texto (el que descargás de la banca web).
 * Busca los renglones que empiezan con una fecha; ubica cada importe en la
 * columna Débito, Crédito o Saldo según dónde está el título. Si no encuentra
 * los títulos, toma el último importe del renglón como saldo y deduce si el
 * movimiento entra o sale por cómo cambia el saldo.
 */
export const leerExtractoPdf = async (file) => {
  let paginas
  try {
    paginas = await renglonesDelPdf(file)
  } catch (e) {
    if (/password/i.test(e?.name || e?.message || '')) throw new Error('El PDF del extracto está protegido con contraseña. Abrilo, guardalo sin contraseña y volvé a cargarlo.')
    throw new Error('No se pudo abrir el PDF del extracto. Revisá que el archivo no esté dañado.')
  }
  const todo = paginas.flat().map((r) => r.palabras.map((w) => w.t).join(' ')).join('\n')
  if (todo.replace(/\s/g, '').length < 40) {
    throw new Error('El PDF del extracto no tiene texto: parece una imagen escaneada. Descargá el extracto desde la banca web (PDF original) o en Excel, y volvé a cargarlo.')
  }
  const anios = (todo.match(/\b20\d{2}\b/g) || []).reduce((m, a) => m.set(a, (m.get(a) || 0) + 1), new Map())
  const anio = [...anios.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

  const filas = []
  const avisos = []
  let saldoInicial = null
  let saldoPrevio = null
  let ultimoSaldo = null
  let cols = null
  let sinColumnas = 0

  paginas.forEach((renglones) => {
    renglones.forEach((r) => {
      const tokens = tokensDe(r)
      if (!tokens.length) return
      const titulo = columnasDelTitulo(tokens)
      if (titulo) { cols = titulo; return }
      const texto = tokens.map((k) => k.t).join(' ')

      // importes del renglón
      const importes = []
      const resto = []
      let fecha = ''
      tokens.forEach((k, i) => {
        if (!fecha && i < 3 && RX_FECHA.test(k.t) && valida(leerFecha(k.t, anio))) { fecha = leerFecha(k.t, anio); return }
        if (RX_FECHA.test(k.t) && i < 4 && valida(leerFecha(k.t, anio))) return // fecha valor
        if (RX_IMPORTE.test(k.t) || (cols && RX_ENTERO.test(k.t) && k.x0 > Math.min(cols.entra, cols.sale) - 60)) {
          const v = leerImporte(k.t)
          if (!Number.isNaN(v)) { importes.push({ v, x: k.x }); return }
        }
        resto.push(k.t)
      })

      if (esSaldoInicial(texto)) {
        if (importes.length) { saldoInicial = importes[importes.length - 1].v; saldoPrevio = saldoInicial }
        return
      }
      if (!fecha) {
        // segunda línea del concepto de un movimiento
        if (!importes.length && filas.length && resto.length && !esTotal(texto) && r.palabras[0].x > 40) {
          const ult = filas[filas.length - 1]
          if (ult._pag === paginas.indexOf(renglones) && ult.concepto.length < 160) ult.concepto += ` ${resto.join(' ')}`
        }
        return
      }
      if (esTotal(resto.join(' '))) return
      if (!importes.length) return

      let entra = 0
      let sale = 0
      let saldo = null
      if (cols) {
        importes.forEach((imp) => {
          const d = [['entra', cols.entra], ['sale', cols.sale], ['saldo', cols.saldo]]
            .filter(([, x]) => x != null)
            .map(([k, x]) => [k, Math.abs(imp.x - x)])
            .sort((a, b) => a[1] - b[1])[0]
          if (d[0] === 'entra') entra += Math.abs(imp.v)
          else if (d[0] === 'sale') sale += Math.abs(imp.v)
          else saldo = imp.v
        })
      } else {
        sinColumnas++
        if (importes.length >= 3) {
          const [a, b, c] = importes.slice(-3)
          sale = Math.abs(a.v); entra = Math.abs(b.v); saldo = c.v
        } else if (importes.length === 2) {
          const mov = importes[0].v
          saldo = importes[1].v
          if (saldoPrevio != null) {
            if (r2(saldoPrevio + Math.abs(mov)) === r2(saldo)) entra = Math.abs(mov)
            else if (r2(saldoPrevio - Math.abs(mov)) === r2(saldo)) sale = Math.abs(mov)
            else if (mov < 0) sale = -mov
            else entra = mov
          } else if (mov < 0) sale = -mov
          else entra = mov
        } else {
          const mov = importes[0].v
          if (mov < 0) sale = -mov
          else entra = mov
        }
      }
      if (saldo != null) { saldoPrevio = saldo; ultimoSaldo = saldo }
      if (!entra && !sale) return
      filas.push({ id: nuevoId('b'), fecha, numero: '', concepto: resto.join(' ').replace(/\s+/g, ' ').trim() || 'Sin concepto', entra: r2(entra), sale: r2(sale), _pag: paginas.indexOf(renglones) })
    })
  })

  if (!filas.length) {
    throw new Error('No se encontraron movimientos en el PDF del extracto. Si el banco permite descargarlo en Excel, probá con ese archivo.')
  }
  if (!cols && sinColumnas) {
    avisos.push('En el PDF no se encontraron los títulos Débito y Crédito: se dedujo si cada movimiento entra o sale por cómo cambia el saldo. Revisá la hoja «Extracto leído».')
  }
  filas.forEach((f) => { delete f._pag })
  return cerrarSaldos(filas, saldoInicial, ultimoSaldo, avisos, 'El extracto')
}

export const leerExtracto = (file) => (/\.pdf$/i.test(file.name) ? leerExtractoPdf(file) : leerPlanilla(file, 'banco'))
export const leerLibro = (file) => leerPlanilla(file, 'libro')

/* ── cruce y resultado ──────────────────────────────────────── */

const neto = (f) => r2(f.entra - f.sale)

/**
 * Cruza libro y extracto: mismo importe y mismo sentido, con la fecha más cercana
 * (hasta `tolerancia` días; después, cualquier fecha). Cada movimiento se usa una sola vez.
 */
export const conciliar = (libro, banco, tolerancia = 10) => {
  const candidatos = []
  libro.filas.forEach((l) => {
    banco.filas.forEach((b) => {
      if (neto(l) !== neto(b)) return
      candidatos.push({ l, b, d: dias(l.fecha, b.fecha) })
    })
  })
  candidatos.sort((a, b) => (a.d > tolerancia) - (b.d > tolerancia) || a.d - b.d || a.l.fecha.localeCompare(b.l.fecha))
  const usL = new Set()
  const usB = new Set()
  const pares = []
  candidatos.forEach(({ l, b, d }) => {
    if (usL.has(l.id) || usB.has(b.id)) return
    usL.add(l.id)
    usB.add(b.id)
    pares.push({ l, b, d })
  })
  pares.sort((a, b) => a.b.fecha.localeCompare(b.b.fecha))
  const libroPend = libro.filas.filter((l) => !usL.has(l.id))
  const bancoPend = banco.filas.filter((b) => !usB.has(b.id))
  const depositos = libroPend.filter((l) => neto(l) > 0)
  const cheques = libroPend.filter((l) => neto(l) < 0)
  const creditos = bancoPend.filter((b) => neto(b) > 0)
  const debitos = bancoPend.filter((b) => neto(b) < 0)
  const suma = (xs) => r2(xs.reduce((s, x) => s + Math.abs(neto(x)), 0))
  const t = { depositos: suma(depositos), cheques: suma(cheques), creditos: suma(creditos), debitos: suma(debitos) }
  const ajustado = r2(banco.saldoFinal + t.depositos - t.cheques - t.creditos + t.debitos)
  return {
    libro, banco, pares, depositos, cheques, creditos, debitos, totales: t,
    saldoAjustado: ajustado,
    diferencia: r2(libro.saldoFinal - ajustado)
  }
}

/* ── Excel ──────────────────────────────────────────────────── */

const GS = '#,##0;[Red]-#,##0'
const FINO = { style: 'thin', color: { argb: 'FFBFBFBF' } }
const BORDES = { top: FINO, left: FINO, bottom: FINO, right: FINO }
const CAB = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7ECEF' } }
const aFecha = (f) => (f ? new Date(`${f}T12:00:00`) : null)

const hojaDetalle = (wb, nombre, explicacion, columnas, filas) => {
  const ws = wb.addWorksheet(nombre)
  ws.columns = columnas.map((c) => ({ width: c.w }))
  ws.addRow([explicacion]).font = { italic: true, color: { argb: 'FF555555' } }
  ws.mergeCells(1, 1, 1, columnas.length)
  ws.addRow([])
  const cab = ws.addRow(columnas.map((c) => c.t))
  cab.font = { bold: true }
  cab.eachCell((c) => { c.fill = CAB; c.border = BORDES; c.alignment = { vertical: 'middle', wrapText: true } })
  filas.forEach((f) => {
    const row = ws.addRow(columnas.map((c) => c.v(f)))
    row.eachCell({ includeEmpty: true }, (cell, i) => {
      cell.border = BORDES
      const c = columnas[i - 1]
      if (c?.fmt) cell.numFmt = c.fmt
    })
  })
  if (!filas.length) ws.addRow(['Sin movimientos en esta hoja.']).font = { italic: true }
  ws.views = [{ state: 'frozen', ySplit: 3 }]
  return ws
}

const COL_MOV = [
  { t: 'Fecha', w: 12, v: (f) => aFecha(f.fecha), fmt: 'dd/mm/yyyy' },
  { t: 'N° / Asiento', w: 14, v: (f) => f.numero || '' },
  { t: 'Concepto', w: 52, v: (f) => f.concepto },
  { t: 'Entra', w: 16, v: (f) => f.entra || null, fmt: GS },
  { t: 'Sale', w: 16, v: (f) => f.sale || null, fmt: GS }
]

export const armarExcel = (ExcelJS, r, { libroNombre, extractoNombre, cliente } = {}) => {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Quadra'
  wb.created = new Date()

  /* Resumen */
  const ws = wb.addWorksheet('Resumen')
  ws.columns = [{ width: 70 }, { width: 20 }, { width: 14 }]
  ws.addRow(['Conciliación bancaria']).font = { bold: true, size: 14 }
  if (cliente) ws.addRow([cliente])
  ws.addRow([`Libro: ${libroNombre || ''}`]).font = { color: { argb: 'FF555555' } }
  ws.addRow([`Extracto: ${extractoNombre || ''}`]).font = { color: { argb: 'FF555555' } }
  ws.addRow([`Generado el ${new Date().toLocaleString('es-PY')}`]).font = { color: { argb: 'FF555555' } }
  ws.addRow([])
  const cab = ws.addRow(['Concepto', 'Importe', 'Movimientos'])
  cab.font = { bold: true }
  cab.eachCell((c) => { c.fill = CAB; c.border = BORDES })
  const linea = (txt, imp, cant, bold) => {
    const row = ws.addRow([txt, imp, cant ?? null])
    row.getCell(2).numFmt = GS
    row.eachCell({ includeEmpty: true }, (c) => { c.border = BORDES })
    if (bold) row.font = { bold: true }
    return row
  }
  const t = r.totales
  linea('Saldo final según el banco (extracto)', r.banco.saldoFinal, null, true)
  linea('Más: depósitos anotados en el libro que el banco todavía no acreditó', t.depositos, r.depositos.length)
  linea('Menos: cheques y pagos anotados en el libro que el banco todavía no debitó', t.cheques, r.cheques.length)
  linea('Menos: créditos del banco que todavía no están en el libro', t.creditos, r.creditos.length)
  linea('Más: débitos del banco (comisiones, impuestos, otros) que todavía no están en el libro', t.debitos, r.debitos.length)
  linea('Saldo del banco ajustado', r.saldoAjustado, null, true)
  linea('Saldo final según el libro', r.libro.saldoFinal, null, true)
  const dif = linea('Diferencia sin explicar', r.diferencia, null, true)
  dif.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: r.diferencia === 0 ? 'FFD8F0DD' : 'FFF8D7D7' } }
  ws.addRow([])
  ws.addRow([r.diferencia === 0
    ? 'La conciliación cierra: todas las diferencias entre el banco y el libro están explicadas.'
    : 'La conciliación no cierra. Revisá las hojas «Falta en el banco» y «Falta en el libro», y que el libro y el extracto sean del mismo período.'
  ]).font = { bold: true, color: { argb: r.diferencia === 0 ? 'FF1E7B34' : 'FFB3261E' } }
  ws.addRow([`Movimientos que coinciden en los dos: ${r.pares.length}`])
  ws.addRow([`Saldo inicial del libro: ${r.libro.saldoInicial.toLocaleString('es-PY')} · saldo inicial del banco: ${r.banco.saldoInicial.toLocaleString('es-PY')}`])
  const avisos = [...r.libro.avisos, ...r.banco.avisos]
  if (avisos.length) {
    ws.addRow([])
    ws.addRow(['Avisos de la lectura']).font = { bold: true }
    avisos.forEach((a) => { ws.addRow([a]).getCell(1).alignment = { wrapText: true } })
  }

  /* Detalle */
  hojaDetalle(wb, 'Coinciden', 'Movimientos que están en el libro y en el extracto con el mismo importe.', [
    { t: 'Fecha libro', w: 12, v: (p) => aFecha(p.l.fecha), fmt: 'dd/mm/yyyy' },
    { t: 'Concepto libro', w: 40, v: (p) => p.l.concepto },
    { t: 'Fecha banco', w: 12, v: (p) => aFecha(p.b.fecha), fmt: 'dd/mm/yyyy' },
    { t: 'Concepto banco', w: 40, v: (p) => p.b.concepto },
    { t: 'Entra', w: 16, v: (p) => p.b.entra || null, fmt: GS },
    { t: 'Sale', w: 16, v: (p) => p.b.sale || null, fmt: GS },
    { t: 'Días entre fechas', w: 10, v: (p) => p.d }
  ], r.pares)
  hojaDetalle(wb, 'Falta en el banco', 'Anotados en el libro y que todavía no aparecen en el extracto: depósitos en tránsito y cheques o pagos no cobrados.', COL_MOV, [...r.depositos, ...r.cheques])
  hojaDetalle(wb, 'Falta en el libro', 'Aparecen en el extracto y todavía no están en el libro: hay que registrarlos (comisiones, intereses, débitos automáticos, transferencias recibidas).', COL_MOV, [...r.creditos, ...r.debitos])
  hojaDetalle(wb, 'Libro leído', 'Todos los movimientos que Quadra leyó del libro, para controlar la lectura.', COL_MOV, r.libro.filas)
  hojaDetalle(wb, 'Extracto leído', 'Todos los movimientos que Quadra leyó del extracto, para controlar la lectura.', COL_MOV, r.banco.filas)
  return wb
}

export const descargarExcel = async (r, opts = {}) => {
  const { default: ExcelJS } = await import('exceljs')
  const wb = armarExcel(ExcelJS, r, opts)
  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `Conciliación bancaria ${opts.cliente ? `${opts.cliente} ` : ''}${new Date().toISOString().slice(0, 10)}.xlsx`.replace(/[\\/:*?"<>|]/g, '')
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
