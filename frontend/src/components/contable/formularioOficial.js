/**
 * QUADRA · Dibujo de los formularios oficiales de la DNIT
 * A partir de la estructura (rubros, incisos y casillas) y de los importes,
 * genera el formulario con el mismo formato que el oficial, en PDF (jsPDF)
 * y en Excel (exceljs, con bordes, sombreados y casillas numeradas).
 */
import { jsPDF } from 'jspdf'

const GRIS = '#d9d9d9'
const GRIS_CLARO = '#eeeeee'
const TINTA = '#111111'
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const AVISO_PAGO = 'Estimado Contribuyente: Le recordamos que los pagos que efectúe emergentes de esta declaración, serán imputados en su cuenta corriente conforme a lo señalado en la Ley N° 125/1991, Art. 162.'
const DECLARACION = 'declara que los datos consignados en este formulario son correctos, íntegros, verdaderos y han sido confeccionados sin omitir dato alguno.'

/** importe con punto de miles, como en Marangatu; textos (RUC del contador…) tal cual */
const fmt = (v) => (v == null || v === '' ? '' : typeof v === 'number' ? Math.round(v).toLocaleString('es-PY') : String(v))
// la fuente estándar del PDF no trae el símbolo del guaraní
const pdfTxt = (t) => String(t).replace(/₲/g, 'Gs.')

/* ── PDF ────────────────────────────────────────────────────── */

const M = 10
const W = 190
const ALTO = 297
const ANCHO_COL = { 1: 38, 2: 32, 3: 29, 5: 23 }

function encabezadoPdf(doc, e, cab) {
  const x0 = M
  const y0 = 10
  const h = 44
  const izq = 34
  doc.setDrawColor(e.color)
  doc.setLineWidth(0.8)
  doc.rect(x0, y0, W, h)
  doc.setLineWidth(0.25)
  doc.line(x0 + izq, y0, x0 + izq, y0 + h)

  // panel izquierdo: impuesto, versión y número
  doc.setTextColor(TINTA)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.3)
  e.titulo.forEach((l, i) => doc.text(l, x0 + izq / 2, y0 + 7 + i * 2.7, { align: 'center' }))
  doc.text(e.version, x0 + izq / 2, y0 + 9 + e.titulo.length * 2.7, { align: 'center' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(cab.numero, x0 + izq / 2, y0 + h - 4, { align: 'center' })

  // grilla derecha
  const xa = x0 + izq
  const wa = W - izq
  const xb = xa + wa * 0.6
  const filas = [4, 6, 8.5, 8.5, 17]
  const ys = filas.reduce((a, f) => [...a, a[a.length - 1] + f], [y0])
  doc.setDrawColor(e.color)
  ys.slice(1, -1).forEach((y) => doc.line(xa, y, x0 + W, y))
  doc.line(xb, y0, xb, y0 + h)

  const etiqueta = (t, x, y, tam = 6.5) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(tam); doc.setTextColor(TINTA); doc.text(t, x, y) }
  const dato = (t, x, y) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(TINTA); doc.text(String(t || ''), x, y) }

  etiqueta('PARA LLENAR LEA EL INSTRUCTIVO DISPONIBLE EN LA WEB', xa + 1, ys[0] + 2.8, 4.8)
  etiqueta('LOS IMPORTES SE CONSIGNARÁN SIN CÉNTIMOS', xb + 1, ys[0] + 2.8, 4.8)
  etiqueta('Número de Orden', xa + 1, ys[1] + 4)
  etiqueta('RUC', xb + 1, ys[1] + 4)
  dato(cab.ruc, xb + 8, ys[1] + 4.2)
  etiqueta('DV', xb + (x0 + W - xb) * 0.72, ys[1] + 4)
  dato(cab.dv, xb + (x0 + W - xb) * 0.72 + 5, ys[1] + 4.2)
  etiqueta('Razón Social/Primer Apellido', xa + 1, ys[2] + 3)
  dato(cab.primero, xa + 1, ys[2] + 7.2)
  etiqueta('Segundo Apellido', xb + 1, ys[2] + 3)
  dato(cab.segundo, xb + 1, ys[2] + 7.2)
  etiqueta('Nombres', xa + 1, ys[3] + 3)
  dato(cab.nombres, xa + 1, ys[3] + 7.2)
  etiqueta('03', xb + 1, ys[3] + 5.5)
  etiqueta('Número de Orden de Declaración que rectifica', xb + 7, ys[3] + 3)

  // tipo de declaración
  const tipos = [['01', 'Declaración Jurada Original', true], ['02', 'Declaración Jurada Rectificativa', false], ['05', 'Declaración Jurada en Carácter de Cese de Actividades, Clausura o Cierre Definitivo', false]]
  tipos.forEach(([n, t, marcado], i) => {
    const y = ys[4] + 3.4 + i * 4.3
    etiqueta(n, xa + 1, y)
    doc.setDrawColor(TINTA)
    doc.rect(xa + 5, y - 2.6, 3, 3)
    if (marcado) { doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text('X', xa + 5.6, y - 0.1) }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.text(doc.splitTextToSize(t, xb - xa - 12), xa + 10, y)
  })
  // período
  etiqueta('04', xb + 1, ys[4] + 9)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  const cx = xb + (x0 + W - xb) / 2 + 2
  doc.text('Periodo / Ejercicio Fiscal', cx, ys[4] + 3.5, { align: 'center' })
  doc.setDrawColor(e.color)
  const mensual = e.periodo === 'mensual'
  const bw = mensual ? 44 : 24
  doc.rect(cx - bw / 2, ys[4] + 5, bw, 10)
  doc.line(cx - bw / 2, ys[4] + 9.5, cx + bw / 2, ys[4] + 9.5)
  if (mensual) {
    doc.line(cx, ys[4] + 5, cx, ys[4] + 15)
    doc.text('Mes', cx - bw / 4, ys[4] + 8.3, { align: 'center' })
    doc.text('Año', cx + bw / 4, ys[4] + 8.3, { align: 'center' })
    dato(cab.mes, cx - bw / 4 - 1.5, ys[4] + 13.4)
    dato(cab.anio, cx + bw / 4 - 3.5, ys[4] + 13.4)
  } else {
    doc.text('Año', cx, ys[4] + 8.3, { align: 'center' })
    dato(cab.anio, cx - 3.5, ys[4] + 13.4)
  }
  return y0 + h + 3
}

function cajaTexto(doc, e, y, texto, { negrita = true, tam = 6.8, fondo = GRIS } = {}) {
  doc.setFont('helvetica', negrita ? 'bold' : 'normal')
  doc.setFontSize(tam)
  const lineas = doc.splitTextToSize(texto, W - 4)
  const h = lineas.length * tam * 0.42 + 3
  if (y + h > ALTO - M) { doc.addPage(); y = M }
  if (fondo) { doc.setFillColor(fondo); doc.rect(M, y, W, h, 'F') }
  doc.setDrawColor(e.color)
  doc.setLineWidth(0.6)
  doc.rect(M, y, W, h)
  doc.setTextColor(TINTA)
  doc.text(lineas, M + 2, y + 2 + tam * 0.35)
  return y + h + 3
}

function rubroPdf(doc, e, y, rb, valores) {
  const n = rb.cols.length
  const incW = rb.sinInc ? 0 : 7
  const colW = ANCHO_COL[n] || 26
  const txtW = W - incW - n * colW
  const xTxt = M + incW
  const xCol = (i) => xTxt + txtW + i * colW
  const cas = 7
  doc.setLineWidth(0.2)

  const cabecera = (yy, titulo) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.6)
    const lt = doc.splitTextToSize(titulo, txtW - 2)
    doc.setFontSize(5.8)
    const lc = rb.cols.map((c) => doc.splitTextToSize(c.t, colW - 2).concat(c.s ? [c.s] : []))
    const hg = rb.grupo ? 4.5 : 0
    const hc = Math.max(...lc.map((l) => l.length)) * 2.5 + 2.5
    const h = Math.max(lt.length * 2.9 + 3, hg + hc)
    doc.setFillColor(GRIS)
    doc.rect(M, yy, W, h, 'F')
    doc.setDrawColor(e.color)
    doc.rect(M, yy, W, h)
    if (incW) { doc.line(xTxt, yy, xTxt, yy + h); doc.setFontSize(6.6); doc.text('INC.', M + incW / 2, yy + h / 2 + 1, { align: 'center' }) }
    doc.line(xCol(0), yy, xCol(0), yy + h)
    doc.setFontSize(6.6)
    doc.setTextColor(TINTA)
    doc.text(lt, xTxt + 1, yy + h / 2 - (lt.length - 1) * 1.45 + 1)
    if (rb.grupo) {
      const gx = xCol(rb.grupo.desde)
      const gw = (rb.grupo.hasta - rb.grupo.desde + 1) * colW
      doc.line(gx, yy + hg, gx + gw, yy + hg)
      doc.text(rb.grupo.t, gx + gw / 2, yy + 3.2, { align: 'center' })
    }
    rb.cols.forEach((c, i) => {
      const top = rb.grupo && i >= rb.grupo.desde && i <= rb.grupo.hasta ? yy + hg : yy
      if (i) doc.line(xCol(i), top, xCol(i), yy + h)
      doc.setFontSize(5.8)
      const l = lc[i]
      const alto = yy + h - top
      l.forEach((t, k) => doc.text(t, xCol(i) + colW / 2, top + alto / 2 - (l.length - 1) * 1.25 + k * 2.5 + 0.8, { align: 'center' }))
    })
    return yy + h
  }

  const barra = (yy) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.setFillColor(GRIS)
    doc.rect(M, yy, W, 6, 'F')
    doc.setDrawColor(e.color)
    doc.rect(M, yy, W, 6)
    doc.setTextColor(TINTA)
    doc.text(rb.titulo, M + 1, yy + 4)
    return yy + 6
  }
  // el título del rubro no queda solo al pie de la hoja
  if (y + 24 > ALTO - M) { doc.addPage(); y = M }
  // con subtítulos (INGRESOS POR, COSTOS, GASTOS) el título va en una barra y cada subtítulo lleva las columnas
  let titulo = rb.titulo
  y = rb.filas[0]?.enc ? barra(y) : cabecera(y, rb.titulo)
  rb.filas.forEach((f) => {
    if (f.enc) {
      if (y + 14 > ALTO - M) { doc.addPage(); y = M }
      titulo = f.enc
      y = cabecera(y, f.enc)
      return
    }
    doc.setFont('helvetica', f.total ? 'bold' : 'normal')
    doc.setFontSize(6.6)
    const lineas = doc.splitTextToSize(pdfTxt(f.txt), txtW - 2)
    const h = Math.max(5.2, lineas.length * 2.75 + 2)
    if (y + h > ALTO - M) {
      doc.addPage()
      y = cabecera(M, titulo)
      doc.setFont('helvetica', f.total ? 'bold' : 'normal')
      doc.setFontSize(6.6)
    }
    if (f.total && rb.sinInc) { doc.setFillColor(GRIS); doc.rect(xTxt, y, txtW, h, 'F') }
    doc.setTextColor(TINTA)
    if (incW) { doc.setFont('helvetica', 'normal'); doc.text(f.inc || '', M + incW / 2, y + h / 2 + 1, { align: 'center' }) }
    doc.setFont('helvetica', f.total ? 'bold' : 'normal')
    doc.setFontSize(6.6)
    doc.text(lineas, xTxt + 1, y + h / 2 - (lineas.length - 1) * 1.375 + 1)
    f.c.forEach((c, i) => {
      const x = xCol(i)
      if (c == null) {
        doc.setFillColor(GRIS)
        doc.rect(x, y, colW, h, 'F')
        return
      }
      doc.setDrawColor(e.color)
      doc.line(x + cas, y, x + cas, y + h)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.4)
      doc.text(String(c), x + 0.8, y + h / 2 + 1)
      const v = fmt(valores[c])
      if (v) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.4)
        doc.text(v, x + colW - 1.2, y + h / 2 + 1.1, { align: 'right' })
      }
    })
    doc.setDrawColor(e.color)
    doc.rect(M, y, W, h)
    if (incW) doc.line(xTxt, y, xTxt, y + h)
    for (let i = 0; i < n; i++) doc.line(xCol(i), y, xCol(i), y + h)
    y += h
  })
  doc.setLineWidth(0.7)
  doc.setDrawColor(e.color)
  return y + 3
}

/** PDF del formulario oficial */
export function pdfFormulario(e, valores, cab) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = encabezadoPdf(doc, e, cab)
  if (e.aviso) y = cajaTexto(doc, e, y, e.aviso)
  e.rubros.forEach((rb) => { y = rubroPdf(doc, e, y, rb, valores) })
  y = cajaTexto(doc, e, y, AVISO_PAGO, { negrita: false, tam: 6.5, fondo: null })
  if (e.periodo === 'mensual') {
    if (y + 34 > ALTO - M) { doc.addPage(); y = M }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text('El que suscribe ______________________________________ en su carácter de ____________________ con Documento No. ______________', M, y + 5)
    doc.text(doc.splitTextToSize(DECLARACION, W), M, y + 10)
    doc.text('Lugar: _______________________________, fecha (dd/mm/Año): ____/____/_______.', M, y + 18)
    doc.setDrawColor(TINTA)
    doc.setLineWidth(0.3)
    doc.line(M + 120, y + 28, M + W, y + 28)
    doc.text('Firma', M + 155, y + 31.5, { align: 'center' })
  }
  doc.save(`${cab.archivo}.pdf`)
}

/* ── Excel ──────────────────────────────────────────────────── */

const argb = (hex) => `FF${hex.replace('#', '').toUpperCase()}`

/** Excel del formulario oficial: misma grilla de rubros, incisos y casillas */
export async function excelFormulario(e, valores, cab) {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(`Formulario ${cab.numero}`, { pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } })
  const maxCols = Math.max(...e.rubros.map((r) => r.cols.length))
  const ultima = 2 + maxCols * 2
  ws.columns = [{ width: 5 }, { width: 62 }, ...Array.from({ length: maxCols }, () => [{ width: 6 }, { width: 17 }]).flat()]
  const borde = { style: 'thin', color: { argb: argb(e.color) } }
  const bordes = { top: borde, left: borde, bottom: borde, right: borde }
  const gris = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(GRIS) } }
  const grisClaro = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(GRIS_CLARO) } }
  let r = 1

  const celda = (fila, col, valor, estilo = {}) => {
    const c = ws.getCell(fila, col)
    c.value = valor
    c.border = bordes
    c.alignment = { vertical: 'middle', wrapText: true, ...(estilo.alignment || {}) }
    if (estilo.font) c.font = estilo.font
    if (estilo.fill) c.fill = estilo.fill
    if (estilo.numFmt) c.numFmt = estilo.numFmt
    return c
  }
  const unir = (fila, c1, c2, valor, estilo) => {
    if (c2 > c1) ws.mergeCells(fila, c1, fila, c2)
    celda(fila, c1, valor, estilo)
    for (let c = c1 + 1; c <= c2; c++) ws.getCell(fila, c).border = bordes
  }

  // encabezado
  unir(r, 1, ultima, `FORMULARIO ${cab.numero} · ${e.titulo.filter(Boolean).join(' ')} · ${e.version}`, { font: { bold: true, size: 13 }, fill: grisClaro })
  ws.getRow(r).height = 22
  r++
  unir(r, 1, 2, 'PARA LLENAR LEA EL INSTRUCTIVO DISPONIBLE EN LA WEB', { font: { size: 7 } })
  unir(r, 3, ultima, 'LOS IMPORTES SE CONSIGNARÁN SIN CÉNTIMOS', { font: { size: 7 } })
  r++
  const par = (etq1, val1, etq2, val2) => {
    const txt = (etq, val) => (val ? `${etq}: ${val}` : etq)
    unir(r, 1, 2, txt(etq1, val1), { font: { size: 9 } })
    unir(r, 3, ultima, txt(etq2, val2), { font: { size: 9 } })
    r++
  }
  par('Número de Orden', '', 'RUC', `${cab.ruc}    DV: ${cab.dv}`)
  par('Razón Social/Primer Apellido', cab.primero, 'Segundo Apellido', cab.segundo)
  par('Nombres', cab.nombres, '03 Número de Orden de Declaración que rectifica', '')
  par('01 [X] Declaración Jurada Original', '', '04 Periodo / Ejercicio Fiscal', e.periodo === 'mensual' ? `Mes ${cab.mes}  ·  Año ${cab.anio}` : `Año ${cab.anio}`)
  par('02 [ ] Declaración Jurada Rectificativa', '', '', '')
  par('05 [ ] Declaración Jurada en Carácter de Cese de Actividades, Clausura o Cierre Definitivo', '', '', '')
  r++
  if (e.aviso) {
    unir(r, 1, ultima, e.aviso, { font: { bold: true, size: 9 }, fill: gris })
    ws.getRow(r).height = 28
    r += 2
  }

  // rubros
  e.rubros.forEach((rb) => {
    const n = rb.cols.length
    const c0 = ultima - n * 2 + 1 // las columnas de importes quedan alineadas a la derecha
    const cab2 = (titulo) => {
      if (rb.grupo) {
        unir(r, 1, c0 - 1, '', { fill: gris })
        for (let i = 0; i < n; i++) {
          const dentro = i >= rb.grupo.desde && i <= rb.grupo.hasta
          if (dentro && i === rb.grupo.desde) unir(r, c0 + i * 2, c0 + rb.grupo.hasta * 2 + 1, rb.grupo.t, { font: { bold: true, size: 8 }, fill: gris, alignment: { horizontal: 'center' } })
          else if (!dentro) unir(r, c0 + i * 2, c0 + i * 2 + 1, '', { fill: gris })
        }
        r++
      }
      celda(r, 1, rb.sinInc ? '' : 'INC.', { font: { bold: true, size: 8 }, fill: gris, alignment: { horizontal: 'center' } })
      unir(r, 2, c0 - 1, titulo, { font: { bold: true, size: 9 }, fill: gris })
      rb.cols.forEach((c, i) => unir(r, c0 + i * 2, c0 + i * 2 + 1, [c.t, c.s].filter(Boolean).join('\n'), { font: { bold: true, size: 7 }, fill: gris, alignment: { horizontal: 'center' } }))
      ws.getRow(r).height = Math.max(24, Math.ceil(Math.max(titulo.length / 70, ...rb.cols.map((c) => c.t.length / 20)) + 1) * 11)
      r++
    }
    if (rb.filas[0]?.enc) {
      unir(r, 1, ultima, rb.titulo, { font: { bold: true, size: 9 }, fill: gris })
      r++
    } else cab2(rb.titulo)
    rb.filas.forEach((f) => {
      if (f.enc) { cab2(f.enc); return }
      celda(r, 1, f.inc || '', { font: { size: 9 }, alignment: { horizontal: 'center' } })
      unir(r, 2, c0 - 1, f.txt, { font: { size: 9, bold: !!f.total }, fill: f.total && rb.sinInc ? gris : undefined })
      f.c.forEach((cas, i) => {
        const col = c0 + i * 2
        if (cas == null) {
          celda(r, col, '', { fill: gris })
          celda(r, col + 1, '', { fill: gris })
          return
        }
        celda(r, col, cas, { font: { size: 8, color: { argb: 'FF555555' } }, alignment: { horizontal: 'center' } })
        const v = valores[cas]
        celda(r, col + 1, v == null ? null : v, { font: { size: 10, bold: true }, numFmt: '#,##0', alignment: { horizontal: 'right' } })
      })
      ws.getRow(r).height = Math.max(16, Math.ceil(f.txt.length / 80) * 13)
      r++
    })
    r++
  })
  unir(r, 1, ultima, AVISO_PAGO, { font: { size: 8 } })
  ws.getRow(r).height = 24

  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${cab.archivo}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const mesNombre = (mes) => MESES[Number(mes) - 1]
