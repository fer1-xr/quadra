/**
 * QUADRA · piezas comunes de los reportes en PDF (jsPDF, en milímetros):
 * encabezado, tarjetas de cifras, tablas con salto de página,
 * gráfico de líneas vectorial y pie con número de página.
 */
import jsPDF from 'jspdf'
import { gs } from '../../services/contabilidad'

export const TINTA = '#0b1b33'
export const TINTA_2 = '#3a4a63'
export const TINTA_3 = '#6b7a90'
const LINEA = '#dce5f0'
const GRILLA = '#e9edf2'
const FONDO = '#f4f6f9'
const MARGEN = 14

export const nuevoPdf = (orientacion = 'portrait') => new jsPDF({ orientation: orientacion, unit: 'mm', format: 'a4' })

const ancho = (doc) => doc.internal.pageSize.getWidth()
const alto = (doc) => doc.internal.pageSize.getHeight()

/** título, contribuyente y período; devuelve la y donde sigue el contenido */
export const encabezadoPdf = (doc, { titulo, lineas = [] }) => {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(TINTA)
  doc.text(titulo, MARGEN, 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(TINTA_2)
  lineas.forEach((l, i) => doc.text(l, MARGEN, 24.5 + i * 4.6))
  const y = 24.5 + lineas.length * 4.6
  doc.setDrawColor(TINTA)
  doc.setLineWidth(0.4)
  doc.line(MARGEN, y, ancho(doc) - MARGEN, y)
  return y + 7
}

/** fila de tarjetas { label, valor, nota } */
export const cifrasPdf = (doc, y, items) => {
  const w = (ancho(doc) - MARGEN * 2 - (items.length - 1) * 4) / items.length
  items.forEach((it, i) => {
    const x = MARGEN + i * (w + 4)
    doc.setFillColor(FONDO)
    doc.roundedRect(x, y, w, 20, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(TINTA_3)
    doc.text(it.label.toUpperCase(), x + 4, y + 6)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(TINTA)
    doc.text(it.valor, x + 4, y + 12.5)
    if (it.nota) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(TINTA_2)
      doc.text(doc.splitTextToSize(it.nota, w - 8)[0], x + 4, y + 17)
    }
  })
  return y + 26
}

export const subtituloPdf = (doc, y, texto, nota) => {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(TINTA)
  doc.text(texto, MARGEN, y)
  if (nota) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(TINTA_3)
    doc.text(nota, MARGEN, y + 4.5)
    return y + 9
  }
  return y + 5
}

/** si no entra `necesita` mm, salta de página */
export const asegurar = (doc, y, necesita) => {
  if (y + necesita <= alto(doc) - 16) return y
  doc.addPage()
  return 18
}

/**
 * Tabla simple. cols: [{ t, w (proporción), der }]; filas: arrays de texto;
 * estilos por fila: { tipo: 'grupo' | 'subtotal' | 'total' }.
 */
export const tablaPdf = (doc, y, { cols, filas, estilos = [] }) => {
  const total = ancho(doc) - MARGEN * 2
  const suma = cols.reduce((s, c) => s + (c.w || 1), 0)
  const xs = []
  let acc = MARGEN
  cols.forEach((c) => { xs.push(acc); acc += ((c.w || 1) / suma) * total })
  const anchoCol = (i) => ((cols[i].w || 1) / suma) * total
  const alturaFila = 5.6

  const cabecera = () => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(TINTA_3)
    cols.forEach((c, i) => doc.text(c.t.toUpperCase(), c.der ? xs[i] + anchoCol(i) - 1.5 : xs[i] + 1.5, y + 3.6, c.der ? { align: 'right' } : undefined))
    doc.setDrawColor(TINTA)
    doc.setLineWidth(0.3)
    doc.line(MARGEN, y + 5.4, MARGEN + total, y + 5.4)
    y += 6.4
  }
  cabecera()

  filas.forEach((fila, n) => {
    const e = estilos[n] || {}
    if (y + alturaFila > alto(doc) - 16) { doc.addPage(); y = 18; cabecera() }
    if (e.tipo === 'grupo') {
      doc.setFillColor(FONDO)
      doc.rect(MARGEN, y - 0.6, total, alturaFila, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(TINTA)
      doc.text(String(fila[0] ?? ''), MARGEN + 1.5, y + 3.4)
      y += alturaFila
      return
    }
    doc.setFont('helvetica', e.tipo ? 'bold' : 'normal')
    doc.setFontSize(e.tipo === 'total' ? 8.2 : 7.8)
    doc.setTextColor(e.tono || TINTA)
    fila.forEach((v, i) => {
      if (v === '' || v == null) return
      const txt = doc.splitTextToSize(String(v), anchoCol(i) - 3)[0]
      if (cols[i].der) doc.text(txt, xs[i] + anchoCol(i) - 1.5, y + 3.6, { align: 'right' })
      else doc.text(txt, xs[i] + 1.5, y + 3.6)
    })
    doc.setDrawColor(e.tipo === 'total' ? TINTA : LINEA)
    doc.setLineWidth(e.tipo === 'total' ? 0.35 : 0.15)
    doc.line(MARGEN, y + alturaFila - 0.4, MARGEN + total, y + alturaFila - 0.4)
    y += alturaFila
  })
  return y + 4
}

/* ── gráfico de líneas ──────────────────────────────────────── */

const pasoLindo = (bruto) => {
  if (bruto <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(bruto))
  const f = bruto / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p
}

/** 1.250.000 → "1,3 M"; 350.000 → "350 mil" */
export const abreviar = (n) => {
  const a = Math.abs(n)
  if (a >= 1e9) return `${(n / 1e9).toLocaleString('es-PY', { maximumFractionDigits: 1 })} mil M`
  if (a >= 1e6) return `${(n / 1e6).toLocaleString('es-PY', { maximumFractionDigits: 1 })} M`
  if (a >= 1e3) return `${Math.round(n / 1e3).toLocaleString('es-PY')} mil`
  return gs(n)
}

/** escala del eje Y con ~4 marcas, incluye el cero */
export const escalaY = (todos) => {
  const valores = todos.filter((v) => v != null)
  const max = Math.max(0, ...valores)
  const min = Math.min(0, ...valores)
  const paso = pasoLindo((max - min || 1) / 4)
  const hi = Math.ceil(max / paso) * paso || paso
  const lo = Math.floor(min / paso) * paso
  const marcas = []
  for (let v = lo; v <= hi + paso / 2; v += paso) marcas.push(v)
  return { lo, hi, marcas }
}

/**
 * Gráfico de líneas. etiquetas: textos del eje X; series: [{ nombre, color, valores }];
 * destacados: [{ serie, indice, texto }] (punto grande con rótulo).
 * Devuelve la y debajo del gráfico.
 */
export const graficoLineasPdf = (doc, y, { etiquetas, series, destacados = [], alto: h = 62 }) => {
  const x0 = MARGEN + 16
  const x1 = ancho(doc) - MARGEN
  // leyenda: una muestra de línea + nombre por serie, siempre visible
  doc.setFontSize(8)
  let lx = MARGEN
  series.forEach((s) => {
    doc.setDrawColor(s.color)
    doc.setLineWidth(0.7)
    doc.line(lx, y - 1, lx + 6, y - 1)
    doc.setFillColor(s.color)
    doc.circle(lx + 3, y - 1, 0.8, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(TINTA_2)
    doc.text(s.nombre, lx + 8, y)
    lx += 8 + doc.getTextWidth(s.nombre) + 7
  })
  const top = y + 5
  const bottom = top + h
  const { lo, hi, marcas } = escalaY(series.flatMap((s) => s.valores))
  const yDe = (v) => bottom - ((v - lo) / (hi - lo || 1)) * h
  const n = etiquetas.length
  const xDe = (i) => (n <= 1 ? (x0 + x1) / 2 : x0 + 4 + (i / (n - 1)) * (x1 - x0 - 8))

  // grilla recesiva y eje
  doc.setFontSize(6.8)
  doc.setFont('helvetica', 'normal')
  marcas.forEach((v) => {
    doc.setDrawColor(v === 0 ? '#9fb0c6' : GRILLA)
    doc.setLineWidth(v === 0 ? 0.25 : 0.15)
    doc.line(x0, yDe(v), x1, yDe(v))
    doc.setTextColor(TINTA_3)
    doc.text(abreviar(v), x0 - 2, yDe(v) + 1, { align: 'right' })
  })
  const cada = n > 24 ? Math.ceil(n / 12) : n > 12 ? 2 : 1
  etiquetas.forEach((e, i) => { if (i % cada === 0 || i === n - 1) doc.text(e, xDe(i), bottom + 4.2, { align: 'center' }) })

  // líneas (2px ≈ 0,6 mm) con marcadores y anillo del color de fondo
  series.forEach((s) => {
    doc.setDrawColor(s.color)
    doc.setLineWidth(0.6)
    for (let i = 1; i < s.valores.length; i++) {
      if (s.valores[i - 1] != null && s.valores[i] != null) doc.line(xDe(i - 1), yDe(s.valores[i - 1]), xDe(i), yDe(s.valores[i]))
    }
    if (s.valores.length <= 24) {
      s.valores.forEach((v, i) => {
        if (v == null) return
        doc.setFillColor('#ffffff')
        doc.circle(xDe(i), yDe(v), 1.05, 'F')
        doc.setFillColor(s.color)
        doc.circle(xDe(i), yDe(v), 0.75, 'F')
      })
    }
  })

  // destacados: punto grande y rótulo en tinta (no en el color de la serie)
  destacados.forEach((d) => {
    const s = series[d.serie]
    if (!s) return
    const px = xDe(d.indice)
    const py = yDe(s.valores[d.indice])
    doc.setFillColor('#ffffff')
    doc.circle(px, py, 1.9, 'F')
    doc.setFillColor(s.color)
    doc.circle(px, py, 1.4, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.2)
    doc.setTextColor(TINTA)
    // si otra serie queda más arriba en ese mes, el rótulo va debajo del punto
    const otraArriba = series.some((o, k) => k !== d.serie && o.valores[d.indice] != null && o.valores[d.indice] > s.valores[d.indice])
    const arriba = !otraArriba && py - top > 8
    const align = px > x1 - 30 ? 'right' : px < x0 + 30 ? 'left' : 'center'
    doc.text(d.texto, px, arriba ? py - 3 : py + 5, { align })
  })
  return bottom + 10
}

/** número de página y fecha de emisión en cada hoja */
export const piePdf = (doc, texto) => {
  const total = doc.getNumberOfPages()
  const emitido = new Date().toLocaleDateString('es-PY')
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(TINTA_3)
    doc.text(`${texto} · Emitido el ${emitido} con Quadra`, MARGEN, alto(doc) - 8)
    doc.text(`Página ${i} de ${total}`, ancho(doc) - MARGEN, alto(doc) - 8, { align: 'right' })
  }
}
