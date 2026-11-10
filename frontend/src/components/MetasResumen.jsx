import React, { useMemo } from 'react'
import { CheckCircle2, Clock, AlertTriangle, CalendarX } from 'lucide-react'
import { avanceDe, esperadoHoy, estadoDe } from './metasCalc'

const TIPOS = [
  { id: 'educativo', label: 'Educativo' },
  { id: 'profesional', label: 'Profesional' },
  { id: 'financiero', label: 'Financiero' }
]

const ESTADOS = [
  { id: 'hecha', label: 'Completadas', icon: CheckCircle2 },
  { id: 'al-dia', label: 'A tiempo', icon: Clock },
  { id: 'atrasada', label: 'Atrasadas', icon: AlertTriangle },
  { id: 'vencida', label: 'Vencidas', icon: CalendarX }
]

/** Anillo de avance promedio. */
function Anillo({ value }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <svg className="mr-ring" viewBox="0 0 128 128" role="img" aria-label={`Avance promedio ${Math.round(value)} por ciento`}>
      <circle className="mr-ring__track" cx="64" cy="64" r={r} />
      <circle
        className="mr-ring__fill"
        cx="64" cy="64" r={r}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / 100)}
        transform="rotate(-90 64 64)"
      />
      <text x="64" y="62" className="mr-ring__num">{Math.round(value)}%</text>
      <text x="64" y="82" className="mr-ring__cap">avance</text>
    </svg>
  )
}

function MetasResumen({ metas }) {
  const d = useMemo(() => {
    const ahora = Date.now()
    const n = metas.length
    const promedio = n ? metas.reduce((a, m) => a + avanceDe(m), 0) / n : 0
    const estados = ESTADOS.map((e) => ({ ...e, n: metas.filter((m) => estadoDe(m, ahora) === e.id).length }))
    const tipos = TIPOS.map((t) => {
      const del = metas.filter((m) => m.tipo === t.id)
      return { ...t, n: del.length, avance: del.length ? del.reduce((a, m) => a + avanceDe(m), 0) / del.length : 0 }
    })
    const filas = [...metas]
      .map((m) => ({ id: m.id, titulo: m.titulo, tipo: m.tipo, v: avanceDe(m), esperado: esperadoHoy(m, ahora), estado: estadoDe(m, ahora) }))
      .sort((a, b) => b.v - a.v)
    return { n, promedio, estados, tipos, filas }
  }, [metas])

  const hechas = d.estados[0].n
  const mensaje = d.n === 0
    ? ''
    : hechas === d.n
      ? '¡Cumpliste todas tus metas!'
      : d.estados[2].n + d.estados[3].n === 0
        ? 'Vas bien: ninguna meta atrasada.'
        : `${d.estados[2].n + d.estados[3].n} ${d.estados[2].n + d.estados[3].n === 1 ? 'meta necesita' : 'metas necesitan'} atención.`

  return (
    <section className="mr" aria-label="Resumen de metas">
      <div className="mr-top">
        {/* 1 · avance promedio */}
        <article className="mr-card mr-card--ring">
          <h4>Avance promedio</h4>
          <div className="mr-ring__wrap">
            <Anillo value={d.promedio} />
            <div className="mr-ring__side">
              <p className="mr-big"><b>{hechas}</b> de {d.n}</p>
              <p className="mr-muted">metas completadas</p>
              {mensaje && <p className="mr-msg">{mensaje}</p>}
            </div>
          </div>
        </article>

        {/* 2 · estado */}
        <article className="mr-card">
          <h4>¿Voy a tiempo?</h4>
          <div className="mr-stack" role="img" aria-label={d.estados.map((e) => `${e.label}: ${e.n}`).join(', ')}>
            {d.estados.filter((e) => e.n).map((e) => (
              <span key={e.id} className={`mr-stack__seg is-${e.id}`} style={{ flexGrow: e.n }} title={`${e.label}: ${e.n}`} />
            ))}
          </div>
          <ul className="mr-states">
            {d.estados.map((e) => (
              <li key={e.id} className={`is-${e.id} ${e.n ? '' : 'is-zero'}`}>
                <e.icon size={15} strokeWidth={1.8} aria-hidden="true" />
                <span>{e.label}</span>
                <b>{e.n}</b>
              </li>
            ))}
          </ul>
        </article>

        {/* 3 · por tipo */}
        <article className="mr-card">
          <h4>Por tipo de meta</h4>
          <ul className="mr-tipos">
            {d.tipos.map((t) => (
              <li key={t.id} className={`tipo-${t.id} ${t.n ? '' : 'is-zero'}`}>
                <div className="mr-tipos__head">
                  <span><i className="mr-dot" />{t.label}</span>
                  <small>{t.n ? `${t.n} ${t.n === 1 ? 'meta' : 'metas'} · ${Math.round(t.avance)}%` : 'sin metas'}</small>
                </div>
                <span className="mr-bar"><span style={{ width: `${t.avance}%` }} /></span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      {/* 4 · avance de cada meta */}
      <article className="mr-card mr-card--wide">
        <header className="mr-wide__head">
          <h4>Avance de cada meta</h4>
          <p className="mr-key">
            <span><i className="mr-key__bar" /> Avance real</span>
            <span><i className="mr-key__mark" /> Dónde deberías estar hoy</span>
          </p>
        </header>
        <ul className="mr-rows">
          {d.filas.map((f) => (
            <li key={f.id} className={`mr-row tipo-${f.tipo} is-${f.estado}`}>
              <span className="mr-row__label" title={f.titulo}><i className="mr-dot" />{f.titulo}</span>
              <span className="mr-row__track" role="img"
                aria-label={`${f.titulo}: ${Math.round(f.v)} % hecho${f.esperado !== null && f.v < 100 ? `, deberías ir por ${Math.round(f.esperado)} %` : ''}`}>
                <span className="mr-row__bar" style={{ width: `${f.v}%` }} />
                {f.esperado !== null && f.v < 100 && (
                  <span className="mr-row__mark" style={{ left: `${f.esperado}%` }} aria-hidden="true" />
                )}
              </span>
              <span className="mr-row__val">{Math.round(f.v)}%</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  )
}

export default MetasResumen
