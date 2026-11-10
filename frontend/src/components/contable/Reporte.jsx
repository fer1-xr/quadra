import React from 'react'
import { FileDown, FileSpreadsheet } from 'lucide-react'
import PageHead, { Figures } from '../PageHead'
import { Vacio, exportarHojas } from './ui'
import { gs, MESES } from '../../services/contabilidad'
import { nuevoPdf, encabezadoPdf, cifrasPdf, tablaPdf, piePdf } from './pdf'
import '../../styles/Reportes.css'

/* ── período ────────────────────────────────────────────────── */

const ultimoDia = (y, m) => new Date(y, m, 0).getDate()
const rango = (y, m1, m2) => ({ desde: `${y}-${String(m1).padStart(2, '0')}-01`, hasta: `${y}-${String(m2).padStart(2, '0')}-${ultimoDia(y, m2)}` })

export const periodosDe = (y) => [
  { id: 'ej', label: `Ejercicio ${y}`, ...rango(y, 1, 12) },
  { id: 's1', label: `1º semestre ${y}`, ...rango(y, 1, 6) },
  { id: 's2', label: `2º semestre ${y}`, ...rango(y, 7, 12) },
  ...[1, 2, 3, 4].map((t) => ({ id: `t${t}`, label: `${t}º trimestre ${y}`, ...rango(y, t * 3 - 2, t * 3) })),
  ...MESES.map((m, i) => ({ id: `m${i}`, label: `${m} ${y}`, ...rango(y, i + 1, i + 1) })),
  { id: 'ant', label: `Ejercicio ${y - 1}`, ...rango(y - 1, 1, 12) }
]

export const rangoEjercicio = (y) => rango(y, 1, 12)

/** período rápido + fechas desde / hasta */
export function RangoFechas({ desde, hasta, onChange, ejercicio }) {
  const ops = periodosDe(ejercicio)
  const sel = ops.find((p) => p.desde === desde && p.hasta === hasta)?.id || ''
  const mal = desde && hasta && desde > hasta
  return (
    <>
      <label className="rp-campo"><span className="q-label">Período rápido</span>
        <select className="q-input ct-select" value={sel} onChange={(e) => { const p = ops.find((x) => x.id === e.target.value); if (p) onChange({ desde: p.desde, hasta: p.hasta }) }}>
          <option value="">Personalizado</option>
          {ops.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </label>
      <label className="rp-campo"><span className="q-label">Desde</span>
        <input className="q-input" type="date" value={desde} aria-invalid={!!mal} onChange={(e) => onChange({ desde: e.target.value, hasta })} />
      </label>
      <label className="rp-campo"><span className="q-label">Hasta</span>
        <input className="q-input" type="date" value={hasta} aria-invalid={!!mal} onChange={(e) => onChange({ desde, hasta: e.target.value })} />
      </label>
    </>
  )
}

export const enRango = (fecha, desde, hasta) => {
  const f = String(fecha || '').slice(0, 10)
  return (!desde || f >= desde) && (!hasta || f <= hasta)
}

/* ── filtros sueltos ────────────────────────────────────────── */

export function Selector({ label, value, onChange, opciones }) {
  return (
    <label className="rp-campo"><span className="q-label">{label}</span>
      <select className="q-input ct-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  )
}

export function Buscador({ label, value, onChange, placeholder = 'RUC o nombre' }) {
  return (
    <label className="rp-campo rp-campo--ancho"><span className="q-label">{label}</span>
      <input className="q-input" type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

/* ── reporte ────────────────────────────────────────────────── */

const textoCelda = (c, fila) => {
  const v = c.f ? c.f(fila) : fila[c.k]
  if (c.monto) return v === '' || v == null ? '' : gs(v)
  return v == null ? '' : String(v)
}

/**
 * Hoja de reporte: filtros, cifras, vista previa y descarga en PDF y Excel.
 * cols: [{ k, t, monto, der, mono, w, f(fila) }]
 * filas: objetos; { _tipo: 'grupo', _rotulo } abre un grupo, { _tipo: 'subtotal' } lo cierra.
 * total: fila de totales (o null). figuras: [{ label, value, tone }].
 */
export default function Reporte({
  titulo, lede, equation, caption, status, filtros, figuras = [], cols, filas, total,
  lineas = [], nombreArchivo, orientacion = 'landscape', vacio, antes, despues, hojasExtra = [], aviso
}) {
  const datos = filas.filter((f) => !f._tipo)

  const pdf = () => {
    const doc = nuevoPdf(orientacion)
    let y = encabezadoPdf(doc, { titulo, lineas })
    if (figuras.length) y = cifrasPdf(doc, y, figuras.slice(0, 4).map((f) => ({ label: f.label, valor: String(f.value), nota: f.nota })))
    const estilos = []
    const cuerpo = []
    filas.forEach((f) => {
      if (f._tipo === 'grupo') { cuerpo.push([f._rotulo]); estilos.push({ tipo: 'grupo' }) } else {
        cuerpo.push(cols.map((c) => textoCelda(c, f)))
        estilos.push(f._tipo === 'subtotal' ? { tipo: 'subtotal' } : f._tono ? { tono: f._tono } : {})
      }
    })
    if (total) { cuerpo.push(cols.map((c) => textoCelda(c, total))); estilos.push({ tipo: 'total' }) }
    tablaPdf(doc, y, { cols: cols.map((c) => ({ t: c.t, w: c.w || 1, der: c.monto || c.der })), filas: cuerpo, estilos })
    piePdf(doc, `${titulo} · ${lineas[0] || ''}`)
    doc.save(`${nombreArchivo}.pdf`)
  }

  const excel = () => {
    const hoja = [[titulo], ...lineas.map((l) => [l]), [], cols.map((c) => c.t)]
    filas.forEach((f) => {
      if (f._tipo === 'grupo') hoja.push([f._rotulo])
      else hoja.push(cols.map((c) => { const v = c.f ? c.f(f) : f[c.k]; return c.monto ? (Number(v) || 0) : (v ?? '') }))
    })
    if (total) hoja.push(cols.map((c) => { const v = c.f ? c.f(total) : total[c.k]; return c.monto ? (Number(v) || 0) : (v ?? '') }))
    exportarHojas(nombreArchivo, [{ hoja: titulo.slice(0, 31), filas: hoja }, ...hojasExtra])
  }

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead title={titulo} lede={lede} equation={equation} caption={caption} status={status} />
      <div className="rp-filtros">
        {filtros}
        <div className="rp-acciones">
          <button type="button" className="q-btn q-btn--primary" onClick={pdf} disabled={!datos.length}><FileDown size={16} strokeWidth={1.8} /> Descargar PDF</button>
          <button type="button" className="q-btn q-btn--line" onClick={excel} disabled={!datos.length}><FileSpreadsheet size={16} strokeWidth={1.8} /> Excel</button>
        </div>
      </div>
      {aviso && <p className="ct-hint is-warn" role="alert">{aviso}</p>}
      {figuras.length > 0 && <Figures items={figuras} />}
      {antes}
      {!datos.length ? (
        <Vacio titulo={vacio?.titulo || 'Nada para mostrar'}>{vacio?.texto}</Vacio>
      ) : (
        <div className="q-card ct-card">
          <div className="ct-tabla-wrap">
            <table className="q-table ct-tabla rp-tabla">
              <thead><tr>{cols.map((c) => <th key={c.k} className={c.monto || c.der ? 'ct-der' : ''}>{c.t}</th>)}</tr></thead>
              <tbody>
                {filas.slice(0, 600).map((f, i) => {
                  if (f._tipo === 'grupo') return <tr key={`g${i}`} className="rp-persona"><td colSpan={cols.length}>{f._rotulo}</td></tr>
                  return (
                    <tr key={f.id || i} className={f._tipo === 'subtotal' ? 'rp-sub' : ''}>
                      {cols.map((c) => (
                        <td key={c.k} className={`${c.monto || c.der ? 'ct-num' : ''} ${c.mono ? 'ct-mono' : ''} ${c.monto && Number(c.f ? c.f(f) : f[c.k]) < 0 ? 'is-neg' : ''} ${c.ancho ? 'rp-ancho' : ''}`}>{textoCelda(c, f)}</td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
              {total && <tfoot><tr className="ct-total">{cols.map((c) => <td key={c.k} className={c.monto || c.der ? 'ct-num' : ''}>{textoCelda(c, total)}</td>)}</tr></tfoot>}
            </table>
          </div>
          {filas.length > 600 && <p className="rp-nota">La vista previa muestra las primeras 600 filas; el PDF y el Excel llevan todas.</p>}
        </div>
      )}
      {despues}
    </div>
  )
}
