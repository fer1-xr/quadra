/**
 * Cuadro de Depreciación de los Bienes del Activo Fijo en el modelo de la DNIT
 * (Anexo de la RG 77/20, que sustituye al de la RG 94/16): encabezado con los datos
 * del contribuyente y la declaración, 22 columnas numeradas (valores fiscales 1-13,
 * valores contables 14-22), un bloque por tipo de bien con su total y el total general.
 * Las columnas calculadas llevan las mismas fórmulas del modelo, así el archivo
 * se puede revisar o corregir en Excel.
 */
import { CATEGORIAS_ACTIVO, CLASES_AVU, ANIO_LEY_6380 } from '../../services/contabilidad'

const GRIS = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }
const FINO = { style: 'thin', color: { argb: 'FF000000' } }
const BORDES = { top: FINO, left: FINO, bottom: FINO, right: FINO }
const GS = '_(* #,##0_);_(* \\(#,##0\\);_(* \\-??_);_(@_)'
const FECHA = 'dd/mm/yyyy'

// anchos de columna A..X
const ANCHOS = [34, 12.5, 12.5, 10.5, 9.5, 8, 12, 7.5, 8, 12.5, 15, 12, 12, 12.5, 12.5, 12, 7.5, 8, 12.5, 15, 12, 11.6, 12.5, 12.5]

const NUMEROS = [1, 2, '2b', 3, 4, 5, 6, 7, 8, 9, 10, 11, '12a', 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
const TITULOS = [
  'Descripción de los Bienes',
  'Valor de Costo o de Adquisición',
  'Valor Neto Fiscal del Último Ejercicio de IRACIS/IRAGRO',
  'Fecha de Adquisición',
  'Coeficiente de Revalúo',
  'Porcentaje de Valor Residual Fiscal',
  'Valor Residual Fiscal',
  'Años de Vida Útil Fiscal',
  'Años de Vida Útil Fiscal Restantes',
  'Valor Fiscal Neto del Ejercicio Anterior',
  'Valor Fiscal Revaluado cuando el Poder Ejecutivo lo establezca o Valor Fiscal Neto del Ejercicio Anterior menos el Valor Residual Fiscal cuando no exista revalúo',
  'Cuota Fiscal de Depreciación Anual',
  'Depreciación Fiscal Acumulada al Cierre del Ejercicio Anterior',
  'Depreciación Fiscal Acumulada',
  'Valor Fiscal Neto al Cierre',
  'Valor Residual Contable',
  'Años de Vida Útil Contable',
  'Años de Vida Útil Contable Restantes',
  'Valor Contable Neto del Ejercicio Anterior',
  'Valor Contable Revaluado cuando exista revalúo o el Valor Contable Neto del Ejercicio Anterior menos el Valor Residual Contable cuando no exista revalúo',
  'Cuota Contable de Depreciación Anual',
  'Cuota de Depreciación Anual no Deducible',
  'Depreciación Contable Acumulada',
  'Valor Contable Neto al Cierre'
]

// columnas que se suman en los totales (como en el modelo)
const SUMABLES = ['B', 'C', 'G', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'S', 'T', 'U', 'V', 'W', 'X']

const fechaExcel = (iso) => {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1))
}

const formula = (f, result) => ({ formula: f, result })

/** hoja «Cuadro Ejerc AAAA» con el modelo de la RG 77/20 */
function hojaCuadro(wb, fila, contribuyente) {
  const anio = fila.anio
  const ws = wb.addWorksheet(`Cuadro Ejerc ${anio}`, {
    pageSetup: { paperSize: 5, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } },
    views: [{ state: 'frozen', xSplit: 1, ySplit: 12 }]
  })
  ws.columns = ANCHOS.map((width) => ({ width }))

  const celda = (ref, valor, estilo = {}) => {
    const c = ws.getCell(ref)
    if (valor !== undefined) c.value = valor
    c.font = { name: 'Arial', size: 7, ...(estilo.font || {}) }
    c.alignment = { vertical: 'middle', wrapText: true, ...(estilo.alignment || {}) }
    if (estilo.borde !== false) c.border = BORDES
    if (estilo.fill) c.fill = estilo.fill
    if (estilo.numFmt) c.numFmt = estilo.numFmt
    return c
  }
  const unir = (rango, valor, estilo) => {
    ws.mergeCells(rango)
    const [a, b] = rango.split(':')
    celda(a, valor, estilo)
    // bordes en todas las celdas del rango combinado
    const col = (r) => r.replace(/\d+/g, '')
    const filaN = (r) => Number(r.replace(/\D+/g, ''))
    const c1 = ws.getColumn(col(a)).number
    const c2 = ws.getColumn(col(b)).number
    for (let r = filaN(a); r <= filaN(b); r++) {
      for (let c = c1; c <= c2; c++) {
        const x = ws.getCell(r, c)
        if (estilo?.borde !== false) x.border = BORDES
        if (estilo?.fill) x.fill = estilo.fill
      }
    }
  }
  const chico = { font: { size: 6 }, alignment: { horizontal: 'center' } }
  const chicoB = { font: { size: 6, bold: true }, alignment: { horizontal: 'center' } }

  // título
  unir('A1:X1', 'CUADRO DE DEPRECIACIÓN DE BIENES DEL ACTIVO FIJO', { font: { size: 12, bold: true }, alignment: { horizontal: 'center' }, borde: false })
  ws.getRow(1).height = 31.9

  // 1, 2 y 3: contribuyente, declaración y ejercicio
  unir('A3:I3', '1. IDENTIFICACIÓN DEL CONTRIBUYENTE', chicoB)
  unir('K3:S3', '2. DATOS DE LA DECLARACIÓN JURADA', chicoB)
  unir('U3:X3', '3. EJERCICIO FISCAL', chicoB)
  unir('A4:G4', 'RAZÓN SOCIAL O APELLIDOS/NOMBRES', chico)
  unir('H4:I4', 'IDENTIFICADOR RUC', chico)
  unir('K4:N4', 'FORMULARIO UTILIZADO', chico)
  unir('O4:S4', 'N° ORDEN', chico)
  unir('U4:V4', 'DESDE', chico)
  unir('W4:X4', 'HASTA', chico)
  unir('A5:G5', contribuyente.razonSocial || '', { font: { size: 8, bold: true }, alignment: { horizontal: 'center' } })
  unir('H5:I5', contribuyente.ruc || '', { font: { size: 8, bold: true }, alignment: { horizontal: 'center' } })
  unir('K5:N5', '500', { font: { size: 8, bold: true }, alignment: { horizontal: 'center' } })
  unir('O5:S5', '', chico)
  unir('U5:V5', fechaExcel(`${anio}-01-01`), { font: { size: 8 }, alignment: { horizontal: 'center' }, numFmt: FECHA })
  unir('W5:X5', fechaExcel(`${anio}-12-31`), { font: { size: 8 }, alignment: { horizontal: 'center' }, numFmt: FECHA })

  // 4 y 5: representante legal y contador
  unir('A6:I6', '4- IDENTIFICACIÓN DEL REPRESENTANTE LEGAL', chicoB)
  unir('K6:S6', '5- IDENTIFICACIÓN DEL CONTADOR', chicoB)
  ws.getRow(6).height = 24.6
  unir('A7:G7', 'APELLIDOS / NOMBRES', chico)
  unir('H7:I7', 'IDENTIFICADOR RUC', chico)
  unir('K7:Q7', 'APELLIDOS / NOMBRES', chico)
  unir('R7:S7', 'IDENTIFICADOR RUC/CI', chico)
  unir('A8:G8', contribuyente.representante || '', { font: { size: 8 }, alignment: { horizontal: 'center' } })
  unir('H8:I8', contribuyente.representanteRuc || '', { font: { size: 8 }, alignment: { horizontal: 'center' } })
  unir('K8:Q8', contribuyente.contador || '', { font: { size: 8 }, alignment: { horizontal: 'center' } })
  unir('R8:S8', contribuyente.contadorRuc || '', { font: { size: 8 }, alignment: { horizontal: 'center' } })

  // encabezado de columnas
  const cab = { font: { size: 9, bold: true }, fill: GRIS, alignment: { horizontal: 'center' } }
  unir('A10:E10', 'BIENES', cab)
  unir('F10:O10', 'VALORES FISCALES', cab)
  unir('P10:X10', 'VALORES CONTABLES', cab)
  NUMEROS.forEach((n, i) => celda(ws.getCell(11, i + 1).address, n, { font: { size: 6, bold: true }, fill: GRIS, alignment: { horizontal: 'center' } }))
  TITULOS.forEach((t, i) => celda(ws.getCell(12, i + 1).address, t, { font: { size: 7, bold: true }, fill: GRIS, alignment: { horizontal: 'center' } }))
  ws.getRow(12).height = 130.15

  // bloques por tipo de bien
  let r = 13
  const totales = []
  const grupos = CATEGORIAS_ACTIVO
    .map((g) => ({ g, filas: fila.filas.filter(({ a }) => (a.categoria || 'maquinarias') === g.id) }))
    .filter((x) => x.filas.length)
  // bienes de grupos que ya no existen: al final, como «otros bienes»
  const conocidos = new Set(CATEGORIAS_ACTIVO.map((g) => g.id))
  const otros = fila.filas.filter(({ a }) => a.categoria && !conocidos.has(a.categoria))
  if (otros.length) grupos.push({ g: { id: 'otros', label: 'Otros bienes' }, filas: otros })

  const filaVacia = (n, estilo = {}) => {
    for (let c = 1; c <= 24; c++) celda(ws.getCell(n, c).address, undefined, estilo)
  }

  grupos.forEach(({ g, filas }) => {
    const titulo = g.label.toUpperCase()
    filaVacia(r)
    celda(`A${r}`, titulo, { font: { size: 9, bold: true }, alignment: { horizontal: 'center' } })
    ws.getRow(r).height = 26.45
    r++
    const desde = r
    filas.forEach(({ a, f }) => {
      filaVacia(r)
      const n = (col) => `${col}${r}`
      const num = (col, v, extra = {}) => celda(n(col), v, { numFmt: GS, ...extra })
      const pre2020 = f.vfnUltimoIracis != null
      const anioAlta = Number((a.fechaAlta || '').slice(0, 4))
      const enVida = f.vida && anio >= Number(a.computarDesde === 'siguiente' ? anioAlta + 1 : anioAlta) && f.cuotaEntera > 0
      const contableIgual = f.residualCont === f.residual && f.vidaCont === f.vida && f.vcnAnterior === f.vfnAnterior

      celda(n('A'), `${a.codigo ? `${a.codigo} · ` : ''}${a.descripcion}${Number(a.cantidad) > 1 ? ` (${a.cantidad} u.)` : ''}${f.baja ? ` · baja ${a.fechaBaja.split('-').reverse().join('/')}` : ''}`, { font: { name: 'Calibri', size: 8 } })
      num('B', f.costo)
      num('C', pre2020 ? f.vfnUltimoIracis : null)
      celda(n('D'), fechaExcel(a.fechaAlta), { numFmt: FECHA, alignment: { horizontal: 'right' } })
      celda(n('E'), f.conRevaluo ? f.coef : null, { numFmt: '#,##0.00000' })
      celda(n('F'), f.residualPct, { numFmt: '0%', alignment: { horizontal: 'right' } })
      // 6: residual sobre el costo, o sobre el VFN de IRACIS/IRAGRO para los bienes anteriores a 2020
      if (pre2020 || anioAlta >= ANIO_LEY_6380) num('G', formula(`IF(YEAR(D${r})<${ANIO_LEY_6380},+C${r}*F${r},B${r}*F${r})`, f.residual))
      else num('G', f.residual)
      celda(n('H'), f.vida, { alignment: { horizontal: 'center' } })
      celda(n('I'), f.restantes, { alignment: { horizontal: 'center' } })
      num('J', f.vfnAnterior)
      num('K', formula(`(J${r}-G${r})*IF(E${r}>0,E${r},1)`, f.base))
      if (enVida && f.proporcion === 1) num('L', formula(`K${r}/(I${r}+1)`, f.cuota))
      else if (enVida) num('L', formula(`K${r}/(I${r}+1)*${Math.round(f.proporcion * 12)}/12`, f.cuota))
      else num('L', 0)
      num('M', f.depAnterior)
      num('N', formula(`+M${r}+L${r}`, f.depCierre))
      num('O', formula(`+K${r}+G${r}-L${r}`, f.neto))

      if (contableIgual) {
        num('P', formula(`+G${r}`, f.residualCont))
        celda(n('Q'), formula(`+H${r}`, f.vidaCont), { alignment: { horizontal: 'center' } })
        celda(n('R'), formula(`+I${r}`, f.restantesCont), { alignment: { horizontal: 'center' } })
        num('S', formula(`+J${r}`, f.vcnAnterior))
        num('T', formula(`+K${r}`, f.baseCont))
        num('U', formula(`+L${r}`, f.cuotaCont))
        num('V', null)
        num('W', formula(`+N${r}`, f.depCierreCont))
        num('X', formula(`+O${r}`, f.netoCont))
      } else {
        num('P', f.residualCont)
        celda(n('Q'), f.vidaCont, { alignment: { horizontal: 'center' } })
        celda(n('R'), f.restantesCont, { alignment: { horizontal: 'center' } })
        num('S', f.vcnAnterior)
        num('T', formula(`(S${r}-P${r})*IF(E${r}>0,E${r},1)`, f.baseCont))
        num('U', f.cuotaCont)
        num('V', formula(`MAX(U${r}-L${r},0)`, f.noDeducible))
        num('W', formula(`${f.depCierreCont - f.cuotaCont}+U${r}`, f.depCierreCont))
        num('X', formula(`+T${r}+P${r}-U${r}`, f.netoCont))
      }
      ws.getRow(r).height = 26.45
      r++
    })
    const hasta = r - 1

    // total del bloque
    filaVacia(r, { fill: GRIS })
    celda(`A${r}`, `TOTAL ${titulo}`, { font: { size: 6, bold: true }, fill: GRIS })
    SUMABLES.forEach((col) => {
      const suma = filas.reduce((s, { f }) => s + (valorCol(col, f) || 0), 0)
      celda(`${col}${r}`, formula(`SUM(${col}${desde}:${col}${hasta})`, suma), { font: { bold: true }, fill: GRIS, numFmt: GS })
    })
    ws.getRow(r).height = 26.45
    totales.push(r)
    r++
  })

  // total general
  filaVacia(r, { fill: GRIS })
  celda(`A${r}`, 'TOTALES', { font: { size: 8, bold: true }, fill: GRIS })
  SUMABLES.forEach((col) => {
    const suma = fila.filas.reduce((s, { f }) => s + (valorCol(col, f) || 0), 0)
    celda(`${col}${r}`, totales.length ? formula(totales.map((t) => `+${col}${t}`).join(''), suma) : 0, { font: { bold: true }, fill: GRIS, numFmt: GS })
  })
  ws.getRow(r).height = 26.45
  r += 2

  celda(`A${r}`, `Generado con Quadra el ${new Date().toLocaleDateString('es-PY')} · Modelo de la RG 77/20 · Vida útil y valor residual según el art. 31 del Decreto 3182/19.`, { font: { size: 7, italic: true, color: { argb: 'FF555555' } }, borde: false, alignment: { wrapText: false } })
  return ws
}

/** valor de cada columna sumable, para el resultado guardado en las fórmulas de totales */
function valorCol(col, f) {
  switch (col) {
    case 'B': return f.costo
    case 'C': return f.vfnUltimoIracis || 0
    case 'G': return f.residual
    case 'J': return f.vfnAnterior
    case 'K': return f.base
    case 'L': return f.cuota
    case 'M': return f.depAnterior
    case 'N': return f.depCierre
    case 'O': return f.neto
    case 'P': return f.residualCont
    case 'S': return f.vcnAnterior
    case 'T': return f.baseCont
    case 'U': return f.cuotaCont
    case 'V': return f.noDeducible
    case 'W': return f.depCierreCont
    case 'X': return f.netoCont
    default: return 0
  }
}

/** hoja «AVU-%»: clasificación de los bienes del Decreto 3182/19 art. 31 */
function hojaAvu(wb) {
  const ws = wb.addWorksheet('AVU-%')
  ws.columns = [{ width: 8 }, { width: 70 }, { width: 16 }, { width: 16 }]
  ws.mergeCells('A1:D1')
  ws.getCell('A1').value = 'Clasificación de los Bienes Decreto 3182/2019 Art. 31'
  ws.getCell('A1').font = { name: 'Arial', size: 11, bold: true }
  const cab = ['Inciso', 'Clasificación', 'Años Vida Útil', '% Valor Residual']
  cab.forEach((t, i) => {
    const c = ws.getCell(3, i + 1)
    c.value = t
    c.font = { name: 'Arial', size: 9, bold: true }
    c.fill = GRIS
    c.border = BORDES
    c.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  let r = 4
  CATEGORIAS_ACTIVO.forEach((g) => {
    const clases = CLASES_AVU.filter((c) => c.grupo === g.id && c.vida)
    if (!clases.length) return
    ws.mergeCells(`A${r}:D${r}`)
    ws.getCell(`A${r}`).value = g.label
    ws.getCell(`A${r}`).font = { name: 'Arial', size: 9, bold: true }
    r++
    clases.forEach((c) => {
      ;[c.inciso, c.label, `${c.vida} años`, c.residual].forEach((v, i) => {
        const x = ws.getCell(r, i + 1)
        x.value = v
        x.font = { name: 'Arial', size: 9 }
        x.border = BORDES
        x.alignment = { vertical: 'middle', wrapText: true, horizontal: i >= 2 ? 'center' : undefined }
        if (i === 3) x.numFmt = '0%'
      })
      r++
    })
    r++
  })
  return ws
}

/**
 * Descarga el cuadro de depreciación en el modelo de la DNIT.
 * `cuadro`: resultado de cuadroGeneral; la hoja del ejercicio `anio` va primero,
 * seguida por las de los demás ejercicios y la tabla de vida útil del art. 31.
 */
export function armarCuadroDnit(ExcelJS, { cuadro, anio, contribuyente }) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Quadra'
  wb.calcProperties.fullCalcOnLoad = true
  const orden = [...cuadro].sort((x, y) => (x.anio === anio ? -1 : y.anio === anio ? 1 : y.anio - x.anio))
  orden.forEach((fila) => hojaCuadro(wb, fila, contribuyente))
  hojaAvu(wb)
  return wb
}

/** descarga el libro del cuadro de depreciación */
export async function excelCuadroDnit({ cuadro, anio, contribuyente }) {
  const { default: ExcelJS } = await import('exceljs')
  const wb = armarCuadroDnit(ExcelJS, { cuadro, anio, contribuyente })

  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `Cuadro de depreciación ${contribuyente.ruc || ''} ${anio}.xlsx`.replace(/\s+/g, ' ').trim()
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
