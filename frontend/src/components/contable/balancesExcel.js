/**
 * Balances en Excel con el formato de los modelos del estudio:
 *  - «BALANCE IMPOSITIVO»: balance de sumas y saldos con pase a inventario y resultados.
 *  - Anexo Nº 1 (Balance General) y Anexo Nº 2 (Estado de Resultados) de la RG 49/14,
 *    comparativo con el ejercicio anterior o a 5 años o más.
 * Los rubros que agrupan llevan las mismas fórmulas SUM del modelo, así el archivo
 * se puede revisar o corregir en Excel.
 */
import { SUBTOTALES, periodoDe } from '../../services/balances'

const ARIAL = (size = 8, bold = false) => ({ name: 'Arial', size, bold })
const FINO = { style: 'thin', color: { argb: 'FF000000' } }
const BORDES = { top: FINO, left: FINO, bottom: FINO, right: FINO }
const GRIS = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDDDDD' } }
const NARANJA = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFA4C27' } }
const NUM_SS = '#,##0;[Red]\\-#,##0'
const NUM_49 = '#,##0_);[Red]\\-#,##0_)'
const PIE = 'Generado con Quadra'

const col = (n) => {
  let s = ''
  let x = n
  while (x > 0) { const m = (x - 1) % 26; s = String.fromCharCode(65 + m) + s; x = Math.floor((x - 1) / 26) }
  return s
}
const redondo = (v) => Math.round(Number(v) || 0)

async function descargar(wb, nombre) {
  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim()}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const nuevoLibro = async () => {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Quadra'
  wb.calcProperties.fullCalcOnLoad = true
  return wb
}

/* ── balance de sumas y saldos («BALANCE IMPOSITIVO») ───────── */

export function hojaSumasSaldos(wb, { ss, contribuyente, anio }) {
  const ws = wb.addWorksheet('BALANCE IMPOSITIVO', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ state: 'frozen', ySplit: 6 }]
  })
  ws.columns = [14, 35, 13, 13, 13, 13, 13, 13, 13, 11.5].map((width) => ({ width }))
  const p = periodoDe(anio, contribuyente)
  const titulo = (r, texto, size, alto) => {
    ws.mergeCells(`A${r}:J${r}`)
    const c = ws.getCell(`A${r}`)
    c.value = texto
    c.font = ARIAL(size, true)
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(r).height = alto
  }
  titulo(1, 'BALANCE IMPOSITIVO', 14, 30)
  titulo(2, `CONTRIBUYENTE: ${contribuyente.ruc || ''} - ${contribuyente.razonSocial || ''}`, 12, 20)
  titulo(3, `PERIODO: ${p.desde} al ${p.hasta}`, 12, 20)

  const cab = (ref, texto) => {
    const c = ws.getCell(ref)
    c.value = texto
    c.font = ARIAL(9, true)
    c.fill = GRIS
    c.border = BORDES
    c.alignment = { horizontal: 'center', vertical: 'middle' }
  }
  ;['A5:A6', 'B5:B6', 'C5:D5', 'E5:F5', 'G5:H5', 'I5:J5'].forEach((r) => ws.mergeCells(r))
  ;[['A5', 'CÓDIGO'], ['B5', 'DESCRIPCIÓN'], ['C5', 'SUMAS'], ['E5', 'SALDOS'], ['G5', 'INVENTARIO'], ['I5', 'RESULTADOS'],
    ['C6', 'DEBE '], ['D6', 'HABER '], ['E6', 'DEBE'], ['F6', 'HABER'], ['G6', 'ACTIVO'], ['H6', 'PASIVO'], ['I6', 'PÉRDIDAS'], ['J6', 'GANANCIAS']]
    .forEach(([r, t]) => cab(r, t))
  ;['A6', 'B6', 'D5', 'F5', 'H5', 'J5'].forEach((r) => { ws.getCell(r).border = BORDES; ws.getCell(r).fill = GRIS })
  ws.getRow(5).height = 15
  ws.getRow(6).height = 15

  const CAMPOS = ['debe', 'haber', 'sDebe', 'sHaber', 'activo', 'pasivo', 'perdidas', 'ganancias']
  let r = 7
  ss.filas.forEach((f) => {
    ws.getCell(`A${r}`).value = f.codigo
    ws.getCell(`B${r}`).value = f.nombre
    ws.getCell(`A${r}`).numFmt = '@'
    ;['A', 'B'].forEach((k) => { ws.getCell(`${k}${r}`).font = ARIAL(8) })
    CAMPOS.forEach((k, i) => {
      const c = ws.getCell(r, 3 + i)
      c.value = redondo(f[k])
      c.numFmt = NUM_SS
      c.font = ARIAL(8)
    })
    r++
  })
  const ultima = r - 1
  CAMPOS.forEach((k, i) => {
    const L = col(3 + i)
    const c = ws.getCell(`${L}${r}`)
    c.value = { formula: `SUM(${L}7:${L}${ultima})`, result: redondo(ss.total[k]) }
    c.numFmt = NUM_SS
    c.font = ARIAL(8, true)
    c.fill = GRIS
    c.border = BORDES
    c.alignment = { horizontal: 'right' }
  })
  r += 2
  ws.mergeCells(`A${r}:J${r}`)
  ws.getCell(`A${r}`).value = PIE
  ws.getCell(`A${r}`).font = ARIAL(8)
  ws.getCell(`A${r}`).alignment = { horizontal: 'right' }
  return ws
}

export async function excelSumasSaldos({ ss, contribuyente, anio }) {
  const wb = await nuevoLibro()
  hojaSumasSaldos(wb, { ss, contribuyente, anio })
  await descargar(wb, `Balance de sumas y saldos ${contribuyente.ruc || ''} ${anio}`)
}

/* ── Anexos 1 y 2 de la RG 49/14 ────────────────────────────── */

/**
 * Encabezado del anexo (filas 1 a 13): identificación del contribuyente,
 * período fiscal, representante legal, contador y auditor, y los años de cada columna.
 */
function encabezado(ws, { anexo, titulo, aviso, contribuyente, firmantes, anios, multi }) {
  const ultimaCol = col(6 + anios.length)
  const texto = (ref, valor, estilo = {}) => {
    const c = ws.getCell(ref)
    c.value = valor
    c.font = ARIAL(estilo.size || 8, estilo.bold)
    c.alignment = { vertical: 'middle', ...(estilo.center ? { horizontal: 'center' } : {}) }
    if (estilo.borde) c.border = BORDES
    if (estilo.fill) c.fill = estilo.fill
    return c
  }
  const unir = (rango, valor, estilo) => { ws.mergeCells(rango); return texto(rango.split(':')[0], valor, estilo) }
  const anchoTitulo = multi ? 'R' : ultimaCol
  unir(`A1:${anchoTitulo}1`, anexo, { size: 11, bold: true, center: true })
  unir(`A2:${anchoTitulo}2`, titulo, { size: 8.5, bold: true, center: true })
  if (aviso) unir(`A3:${anchoTitulo}3`, aviso, { size: 8.5, center: true, fill: NARANJA })

  const p0 = periodoDe(anios[0], contribuyente)
  const pN = periodoDe(anios[anios.length - 1], contribuyente)
  const f = firmantes || {}
  if (!multi) {
    unir('A4:D4', '1. Identificación del Contribuyente')
    texto('G4', '2. Periodo Fiscal')
    unir('A5:D5', 'Razón Social', { center: true, borde: true })
    texto('E5', 'R.U.C.', { center: true, borde: true })
    texto('G5', 'Desde', { center: true, borde: true })
    texto('H5', 'Hasta', { center: true, borde: true })
    unir('A6:D7', contribuyente.razonSocial || '', { center: true, borde: true })
    ws.mergeCells('E6:E7')
    texto('E6', contribuyente.ruc || '', { center: true, borde: true })
    texto('G6', p0.desde, { center: true, borde: true })
    texto('H6', p0.hasta, { center: true, borde: true })
    if (anios.length > 1) {
      const p1 = periodoDe(anios[1], contribuyente)
      texto('G7', p1.desde, { center: true, borde: true })
      texto('H7', p1.hasta, { center: true, borde: true })
    }
    unir('A9:B9', '3. Representante Legal')
    unir('D9:E9', '4. Identificador del Contador')
    unir('G9:H9', '5. Identificador del Auditor')
    unir('A10:B10', 'Nombres y Apellidos', { center: true, borde: true })
    texto('D10', 'Nombres y Apellidos', { center: true, borde: true })
    texto('E10', 'R.U.C.', { center: true, borde: true })
    texto('G10', 'Nombres y Apellidos', { center: true, borde: true })
    texto('H10', 'R.U.C.', { center: true, borde: true })
    unir('A11:B11', f.representante || '', { center: true, borde: true })
    texto('D11', f.contador || '', { center: true, borde: true })
    texto('E11', f.contadorRuc || '', { center: true, borde: true })
    texto('G11', f.auditor || '', { center: true, borde: true })
    texto('H11', f.auditorRuc || '', { center: true, borde: true })
  } else {
    unir('A4:E4', '1. Identificación del Contribuyente')
    texto('H4', '2. Periodo Fiscal')
    unir('A5:D5', 'Razón Social', { center: true, borde: true })
    texto('E5', 'R.U.C.', { center: true, borde: true })
    unir('H5:I5', 'Desde', { center: true, borde: true })
    unir('J5:K5', 'Hasta', { center: true, borde: true })
    unir('A6:D7', contribuyente.razonSocial || '', { center: true, borde: true })
    ws.mergeCells('E6:E7')
    texto('E6', contribuyente.ruc || '', { center: true, borde: true })
    unir('H7:I7', pN.desde, { center: true, borde: true })
    unir('J7:K7', p0.hasta, { center: true, borde: true })
    unir('A9:B9', '3. Representante Legal')
    unir('D9:E9', '4. Identificador del Contador')
    unir('H9:K9', '5. Identificador del Auditor')
    unir('A10:B10', 'Nombres y Apellidos', { center: true, borde: true })
    texto('D10', 'Nombres y Apellidos', { center: true, borde: true })
    texto('E10', 'R.U.C.', { center: true, borde: true })
    unir('H10:J10', 'Nombres y Apellidos', { center: true, borde: true })
    texto('K10', 'R.U.C.', { center: true, borde: true })
    unir('A11:B11', f.representante || '', { center: true, borde: true })
    texto('D11', f.contador || '', { center: true, borde: true })
    texto('E11', f.contadorRuc || '', { center: true, borde: true })
    unir('H11:J11', f.auditor || '', { center: true, borde: true })
    texto('K11', f.auditorRuc || '', { center: true, borde: true })
  }
  anios.forEach((a, i) => {
    const c = texto(`${col(7 + i)}13`, a, { size: 8.5, bold: true })
    c.alignment = { horizontal: 'right' }
    c.border = { bottom: FINO }
  })
  ;[19.95, 16.95, 10.05, 10.2, 10.2, 10.2, 10.2, 10.2, 10.2, 16.95, 16.95, 10.05, 10.8].forEach((h, i) => { ws.getRow(i + 1).height = h })
}

/**
 * Cuerpo del anexo desde la fila 14. Devuelve Map(código → fila) para poder
 * referenciar los rubros desde la otra hoja (resultado del ejercicio).
 */
function cuerpo(ws, { filas, ejercicios, refResultado }) {
  const filaDe = new Map()
  // primero se numeran las filas, porque las fórmulas apuntan a filas de más abajo
  let r = 14
  filas.forEach((f) => { if (f.tipo === 'rubro') filaDe.set(f.codigo, r); r++ })
  r = 14
  filas.forEach((f) => {
    if (f.tipo === 'texto') {
      ws.getCell(`B${r}`).value = f.texto
      ws.getCell(`B${r}`).font = ARIAL(8, true)
    } else if (f.tipo === 'rubro') {
      const a = ws.getCell(`A${r}`)
      a.value = f.codigo
      a.numFmt = '@'
      a.font = ARIAL(8, f.negrita)
      ws.mergeCells(`B${r}:F${r}`)
      const b = ws.getCell(`B${r}`)
      b.value = `${f.sangria}${f.nombre}`
      b.font = ARIAL(8, f.negrita)
      ejercicios.forEach((ej, i) => {
        const L = col(7 + i)
        const c = ws.getCell(`${L}${r}`)
        const valor = redondo(f.valores[i])
        const directo = redondo(ej.directo.get(f.codigo))
        if (f.calculado) {
          const expr = SUBTOTALES[f.codigo].map(([s, cod], k) => `${k === 0 && s === '+' ? '' : s}${L}${filaDe.get(cod)}`).join('')
          c.value = { formula: expr, result: valor }
        } else if (f.codigo === '03.03.02' && refResultado) {
          c.value = { formula: `${directo ? `${directo}+` : ''}'${refResultado.hoja}'!${L}${refResultado.fila}`, result: valor }
        } else if (f.hijos.length) {
          const suma = `SUM(${f.hijos.map((h) => `${L}${filaDe.get(h)}`).join(',')})`
          c.value = { formula: directo ? `${suma}+${directo}` : suma, result: valor }
        } else {
          c.value = valor
        }
        c.numFmt = NUM_49
        c.font = ARIAL(8, f.negrita)
        c.alignment = { horizontal: 'right' }
      })
    }
    ws.getRow(r).height = 10.2
    r++
  })
  return { filaDe, siguiente: r }
}

function hojaAnexo(wb, { nombre, anexo, titulo, aviso, filas, ejercicios, contribuyente, firmantes, refResultado, control }) {
  const multi = ejercicios.length > 2
  const ws = wb.addWorksheet(nombre, {
    pageSetup: { paperSize: 9, orientation: multi ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
    views: [{ showGridLines: false }]
  })
  const anchos = multi ? [16.2, 20.6, 1.2, 37.5, 15.6, 1.2] : [16.3, 20.6, 1.3, 30, 15.6, 1.3]
  const cols = multi ? Math.max(ejercicios.length, 12) : 2
  ws.columns = [...anchos, ...Array(cols).fill(0).map((_, i) => (multi ? 20 : (i === 0 ? 30 : 20)))].map((width) => ({ width }))
  const anios = ejercicios.map((e) => e.anio)
  encabezado(ws, { anexo, titulo, aviso, contribuyente, firmantes, anios, multi })
  const { filaDe, siguiente } = cuerpo(ws, { filas, ejercicios, refResultado })
  const ultimaCol = col(6 + ejercicios.length)
  let r = siguiente + 1
  ws.mergeCells(`A${r}:${multi ? 'K' : ultimaCol}${r}`)
  ws.getCell(`A${r}`).value = PIE
  ws.getCell(`A${r}`).font = ARIAL(8)
  ws.getCell(`A${r}`).alignment = { horizontal: 'right' }
  if (control) {
    r += 2
    const G = col(7)
    ws.getCell(`D${r}`).value = { formula: `IF(${G}${r}<>0,"DIFERENCIA  [ACTIVO-PASIVO-PATRIMONIO NETO]","")`, result: '' }
    ws.getCell(`D${r}`).font = ARIAL(8)
    ejercicios.forEach((ej, i) => {
      const L = col(7 + i)
      const c = ws.getCell(`${L}${r}`)
      const dif = redondo((ej.tot.get('01') || 0) - (ej.tot.get('02') || 0) - (ej.tot.get('03') || 0))
      c.value = { formula: `${L}${filaDe.get('01')}-${L}${filaDe.get('02')}-${L}${filaDe.get('03')}`, result: dif }
      c.numFmt = NUM_49
      c.font = ARIAL(8)
    })
  }
  return { ws, filaDe }
}

/**
 * Libro con el Anexo Nº 1 (B. GRAL) y el Anexo Nº 2 (E. RESUL.).
 * `ejercicios`: el primero es el ejercicio que se presenta; los demás, los anteriores.
 */
export function armarAnexos(wb, { mapa, ejercicios, filasBalance, filasResultados, contribuyente, firmantes }) {
  const actual = ejercicios[0]
  const aviso = ejercicios.length <= 2 && !actual.cerrado ? `Falta el Cierre para el ejercicio (${actual.anio}).` : ''
  // el Estado de Resultados se arma primero para conocer la fila del resultado neto
  const tmp = new Map()
  let r = 14
  filasResultados.forEach((f) => { if (f.tipo === 'rubro') tmp.set(f.codigo, r); r++ })
  hojaAnexo(wb, { nombre: 'B. GRAL', anexo: 'ANEXO Nº 1', titulo: 'BALANCE GENERAL', aviso, filas: filasBalance, ejercicios, contribuyente, firmantes, refResultado: { hoja: 'E. RESUL.', fila: tmp.get('20') }, control: true })
  hojaAnexo(wb, { nombre: 'E. RESUL.', anexo: 'ANEXO Nº 2', titulo: 'ESTADO DE RESULTADOS', aviso, filas: filasResultados, ejercicios, contribuyente, firmantes })
  return wb
}

export async function excelAnexos({ nombre, ...datos }) {
  const wb = await nuevoLibro()
  armarAnexos(wb, datos)
  await descargar(wb, nombre)
}
