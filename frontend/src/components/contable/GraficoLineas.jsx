import React, { useId, useState } from 'react'
import { escalaY, abreviar } from './pdf'
import { gs } from '../../services/contabilidad'

/** índices consecutivos con valor: cada tramo es una línea (los vacíos la cortan) */
const tramos = (valores) => {
  const out = []
  let actual = []
  valores.forEach((v, i) => {
    if (v == null) { if (actual.length) out.push(actual); actual = [] } else actual.push(i)
  })
  if (actual.length) out.push(actual)
  return out
}

/**
 * Gráfico de líneas en SVG: leyenda siempre visible, grilla recesiva,
 * marcadores, puntos destacados con rótulo y cruz + tooltip al pasar el mouse.
 * series: [{ nombre, color, valores }]; destacados: [{ serie, indice, texto }].
 */
export default function GraficoLineas({ titulo, etiquetas, series, destacados = [], alto = 240 }) {
  const id = useId()
  const [hover, setHover] = useState(null)
  const W = 760
  const H = alto
  const pad = { l: 64, r: 16, t: 14, b: 28 }
  const n = etiquetas.length
  const { lo, hi, marcas } = escalaY(series.flatMap((s) => s.valores))
  const xDe = (i) => (n <= 1 ? (pad.l + W - pad.r) / 2 : pad.l + 8 + (i / (n - 1)) * (W - pad.l - pad.r - 16))
  const yDe = (v) => H - pad.b - ((v - lo) / (hi - lo || 1)) * (H - pad.t - pad.b)
  const cada = n > 24 ? Math.ceil(n / 12) : n > 12 ? 2 : 1

  const mover = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * W
    let mejor = 0
    for (let i = 1; i < n; i++) if (Math.abs(xDe(i) - x) < Math.abs(xDe(mejor) - x)) mejor = i
    setHover(mejor)
  }

  return (
    <figure className="rp-graf" aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className="rp-graf__titulo">{titulo}</figcaption>
      <ul className="rp-leyenda">
        {series.map((s) => (
          <li key={s.nombre}><span className="rp-leyenda__marca" style={{ background: s.color }} aria-hidden="true" />{s.nombre}</li>
        ))}
      </ul>
      <div className="rp-graf__lienzo">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${titulo}. ${series.map((s) => s.nombre).join(', ')}`}
          onMouseMove={mover} onMouseLeave={() => setHover(null)}>
          {marcas.map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={yDe(v)} y2={yDe(v)} className={v === 0 ? 'rp-cero' : 'rp-grilla'} />
              <text x={pad.l - 8} y={yDe(v) + 4} textAnchor="end" className="rp-eje">{abreviar(v)}</text>
            </g>
          ))}
          {etiquetas.map((e, i) => ((i % cada === 0 || i === n - 1)
            ? <text key={e + i} x={xDe(i)} y={H - 8} textAnchor="middle" className="rp-eje">{e}</text> : null))}
          {hover != null && <line x1={xDe(hover)} x2={xDe(hover)} y1={pad.t} y2={H - pad.b} className="rp-cruz" />}
          {series.map((s) => (
            <g key={s.nombre}>
              {tramos(s.valores).map((t) => (
                <polyline key={t[0]} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
                  points={t.map((i) => `${xDe(i)},${yDe(s.valores[i])}`).join(' ')} />
              ))}
              {n <= 24 && s.valores.map((v, i) => v != null && (
                <circle key={i} cx={xDe(i)} cy={yDe(v)} r={hover === i ? 5 : 3.5} fill={s.color} className="rp-punto" />
              ))}
            </g>
          ))}
          {destacados.map((d) => {
            const s = series[d.serie]
            if (!s) return null
            const px = xDe(d.indice)
            const py = yDe(s.valores[d.indice])
            const anchor = px > W - 110 ? 'end' : px < pad.l + 90 ? 'start' : 'middle'
            // si otra serie queda más arriba en ese mes, el rótulo va debajo del punto
            const otraArriba = series.some((o, k) => k !== d.serie && o.valores[d.indice] != null && o.valores[d.indice] > s.valores[d.indice])
            const arriba = !otraArriba && py - pad.t > 22
            return (
              <g key={`${d.serie}-${d.indice}`}>
                <circle cx={px} cy={py} r="6.5" fill={s.color} className="rp-punto" />
                <text x={px} y={arriba ? py - 12 : py + 22} textAnchor={anchor} className="rp-destacado">{d.texto}</text>
              </g>
            )
          })}
        </svg>
        {hover != null && (
          <div className="rp-tip" style={{ left: `${(xDe(hover) / W) * 100}%` }} role="status">
            <strong>{etiquetas[hover]}</strong>
            {series.map((s) => (
              <span key={s.nombre}><i style={{ background: s.color }} aria-hidden="true" />{s.nombre}<b>{s.valores[hover] == null ? '—' : `₲ ${gs(s.valores[hover])}`}</b></span>
            ))}
          </div>
        )}
      </div>
    </figure>
  )
}
