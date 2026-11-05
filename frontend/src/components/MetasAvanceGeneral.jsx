import React, { useEffect, useMemo, useRef, useState } from 'react'
import { animate, useInView } from 'framer-motion'
import '../styles/MetasAvance.css'

const TIPOS = [
  { id: 'educativo', label: 'Educativo' },
  { id: 'profesional', label: 'Profesional' },
  { id: 'financiero', label: 'Financiero' }
]

const PERIODOS = [
  { id: 'anual', label: 'Anuales' },
  { id: 'mensual', label: 'Mensuales' }
]

const BINS = [
  { id: 'b0', label: '0–24', min: 0, max: 25 },
  { id: 'b1', label: '25–49', min: 25, max: 50 },
  { id: 'b2', label: '50–74', min: 50, max: 75 },
  { id: 'b3', label: '75–99', min: 75, max: 100 },
  { id: 'b4', label: '100', min: 100, max: 101 }
]

const DIA = 86400000
const clamp = (v) => Math.max(0, Math.min(100, v))
const prog = (m) => (m.completada ? 100 : clamp(Number(m.progreso) || 0))
const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** Inicio de la meta: fecha de creación guardada, o el id (Date.now()), o el inicio del período. */
function inicioDe(meta, limite) {
  if (meta.creadaEn) {
    const t = Date.parse(meta.creadaEn)
    if (!Number.isNaN(t)) return t
  }
  const id = Number(meta.id)
  if (id > 1e12 && id < limite) return id
  return limite - (meta.periodo === 'mensual' ? 30 : 365) * DIA
}

/** Porcentaje del plazo ya transcurrido (0–100), o null si no hay fecha límite. */
function plazoTranscurrido(meta, ahora) {
  if (!meta.fechaLimite) return null
  const limite = Date.parse(`${meta.fechaLimite}T23:59:59`)
  if (Number.isNaN(limite)) return null
  const inicio = inicioDe(meta, limite)
  if (limite <= inicio) return 100
  return clamp(((ahora - inicio) / (limite - inicio)) * 100)
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const on = () => setReduce(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return reduce
}

/** Número que cuenta hasta su valor, con la misma curva que las barras. */
function Cifra({ value, active, reduce, duration = 1.4, delay = 0 }) {
  const [shown, setShown] = useState(reduce ? value : 0)
  const from = useRef(reduce ? value : 0)

  useEffect(() => {
    if (!active) return
    if (reduce) {
      setShown(value)
      from.current = value
      return
    }
    const ctrl = animate(from.current, value, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        from.current = v
        setShown(v)
      }
    })
    return () => ctrl.stop()
  }, [value, active, reduce, duration, delay])

  return <>{Math.round(shown)}</>
}

function MetasAvanceGeneral({ metas }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.25 })
  const reduce = usePrefersReducedMotion()
  const active = inView || reduce
  const [foco, setFoco] = useState(null)
  const [settled, setSettled] = useState(false)

  // tras la entrada, los cambios posteriores (p. ej. mover un progreso) se animan sin escalonado
  useEffect(() => {
    if (!active || settled) return
    const t = setTimeout(() => setSettled(true), 2200)
    return () => clearTimeout(t)
  }, [active, settled])

  const d = useMemo(() => {
    const ahora = Date.now()
    const n = metas.length
    const total = media(metas.map(prog))
    const hechas = metas.filter((m) => m.completada || prog(m) === 100).length

    // aporte de cada tipo a la media general: Σ pᵢ(tipo) / n
    const aportes = TIPOS.map((t) => {
      const del = metas.filter((m) => m.tipo === t.id)
      return { ...t, n: del.length, pts: n ? del.reduce((a, m) => a + prog(m), 0) / n : 0 }
    })

    const periodos = PERIODOS.map((p) => {
      const del = metas.filter((m) => (m.periodo || 'anual') === p.id)
      return { ...p, n: del.length, media: media(del.map(prog)) }
    })

    const puntos = metas
      .map((m) => {
        const x = plazoTranscurrido(m, ahora)
        if (x === null) return null
        const y = prog(m)
        const estado = y >= 100 ? 'hecha' : x >= 100 ? 'vencida' : y >= x ? 'adelante' : 'atras'
        return { id: m.id, titulo: m.titulo, tipo: m.tipo, x, y, estado }
      })
      .filter(Boolean)
      .sort((a, b) => a.x - b.x)

    const cuenta = (e) => puntos.filter((p) => p.estado === e).length

    const bins = BINS.map((b) => ({
      ...b,
      n: metas.filter((m) => {
        const v = prog(m)
        return v >= b.min && v < b.max
      }).length
    }))
    const binMax = Math.max(1, ...bins.map((b) => b.n))

    return {
      n, total, hechas, aportes, periodos, puntos, bins, binMax,
      adelante: cuenta('adelante') + cuenta('hecha'),
      atras: cuenta('atras'),
      vencidas: cuenta('vencida')
    }
  }, [metas])

  // reparto acumulado de segmentos por tipo dentro de la barra general
  let acumulado = 0
  const segmentos = d.aportes.filter((a) => a.pts > 0).map((a, i) => {
    const seg = { ...a, left: acumulado, i }
    acumulado += a.pts
    return seg
  })

  const yTicks = [0, 25, 50, 75, 100]
  const focoPunto = d.puntos.find((p) => p.id === foco)

  return (
    <section
      ref={ref}
      className={`ag ${active ? 'is-on' : ''} ${settled ? 'is-settled' : ''} ${reduce ? 'is-static' : ''}`}
      aria-labelledby="ag-title"
    >
      <header className="ag-head">
        <div>
          <h3 id="ag-title">Avance general</h3>
          <p>
            Todas las metas · {d.periodos.map((p) => `${p.n} ${p.label.toLowerCase()}`).join(' · ')}
          </p>
        </div>
        <p className="ag-eq" aria-label={`Promedio de avance ${Math.round(d.total)} por ciento`}>
          <i>x̄</i>
          <span className="ag-eq__op">=</span>
          <span className="ag-eq__frac">
            <span>Σ <i>p</i><sub>i</sub></span>
            <span><i>n</i></span>
          </span>
          <span className="ag-eq__op">=</span>
          <b><Cifra value={d.total} active={active} reduce={reduce} /><small>%</small></b>
        </p>
      </header>

      {/* 1 · regla general */}
      <div className="ag-ruler" style={{ '--v': d.total }}>
        <div className="ag-ruler__row ag-ruler__row--main">
          <span className="ag-ruler__label">General</span>
          <div className="ag-track ag-track--main">
            {segmentos.map((s) => (
              <span
                key={s.id}
                className={`ag-seg tipo-${s.id}`}
                style={{ '--l': s.left, '--w': s.pts, '--i': s.i }}
                title={`${s.label}: aporta ${Math.round(s.pts)} puntos`}
              />
            ))}
            <span className="ag-cursor" aria-hidden="true">
              <span className="ag-cursor__tag"><Cifra value={d.total} active={active} reduce={reduce} /> %</span>
            </span>
          </div>
          <span className="ag-ruler__val" title="Metas completadas / total">
            <b>{d.hechas}</b><small> / {d.n}</small>
          </span>
        </div>

        {d.periodos.map((p, i) => (
          <div key={p.id} className={`ag-ruler__row ${p.n ? '' : 'is-zero'}`}>
            <span className="ag-ruler__label">{p.label}</span>
            <div className="ag-track">
              <span className="ag-thin" style={{ '--w': p.media, '--i': i + 3 }} />
            </div>
            <span className="ag-ruler__val">{p.n ? <><Cifra value={p.media} active={active} reduce={reduce} delay={0.25 + i * 0.12} /><small>%</small></> : '—'}</span>
          </div>
        ))}

        <div className="ag-ruler__row ag-ruler__axis" aria-hidden="true">
          <span />
          <div className="ag-scale">
            {[0, 25, 50, 75, 100].map((t) => <span key={t} style={{ left: `${t}%` }}>{t}</span>)}
          </div>
          <span />
        </div>

        <ul className="ag-legend">
          {d.aportes.map((a) => (
            <li key={a.id} className={`tipo-${a.id} ${a.n ? '' : 'is-zero'}`}>
              <span className="ag-legend__key" />
              {a.label}
              <b><Cifra value={a.pts} active={active} reduce={reduce} delay={0.2} /> pts</b>
            </li>
          ))}
          <li className="ag-legend__rest">
            <span className="ag-legend__key" />
            Pendiente
            <b><Cifra value={100 - d.total} active={active} reduce={reduce} delay={0.2} /> pts</b>
          </li>
        </ul>
      </div>

      <div className="ag-grid">
        {/* 2 · ritmo: avance vs. plazo */}
        <figure className="ag-fig">
          <figcaption className="ag-fig__head">
            <h4>Ritmo</h4>
            <p>Avance frente al plazo transcurrido</p>
          </figcaption>

          <div className="ag-scatter">
            <span className="ag-scatter__ylab" aria-hidden="true">avance %</span>
            <div className="ag-plane" role="img"
              aria-label={`${d.adelante} metas al día o adelantadas, ${d.atras} atrasadas, ${d.vencidas} vencidas`}>
              <svg className="ag-plane__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <polygon className="ag-zone ag-zone--ahead" points="0,100 100,0 0,0" />
                {yTicks.slice(1, -1).map((t) => (
                  <g key={t}>
                    <line className="ag-gridline" x1={t} x2={t} y1="0" y2="100" />
                    <line className="ag-gridline" x1="0" x2="100" y1={100 - t} y2={100 - t} />
                  </g>
                ))}
                <line className="ag-diag" x1="0" y1="100" x2="100" y2="0" pathLength="1" />
              </svg>
              <span className="ag-diag__label" aria-hidden="true">ritmo esperado</span>

              {d.puntos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  className={`ag-pt tipo-${p.tipo} is-${p.estado} ${foco === p.id ? 'is-foco' : ''}`}
                  style={{ '--x': p.x, '--y': p.y, '--i': i }}
                  onMouseEnter={() => setFoco(p.id)}
                  onMouseLeave={() => setFoco(null)}
                  onFocus={() => setFoco(p.id)}
                  onBlur={() => setFoco(null)}
                  aria-label={`${p.titulo}: ${Math.round(p.y)} % de avance con ${Math.round(p.x)} % del plazo`}
                />
              ))}

              {focoPunto && (
                <span
                  className={`ag-tip ${focoPunto.x > 62 ? 'is-left' : ''} ${focoPunto.y > 78 ? 'is-below' : ''}`}
                  style={{ '--x': focoPunto.x, '--y': focoPunto.y }}
                  role="status"
                >
                  <strong>{focoPunto.titulo}</strong>
                  <span>{Math.round(focoPunto.y)} % hecho · {Math.round(focoPunto.x)} % del plazo</span>
                </span>
              )}
            </div>
            <div className="ag-plane__x" aria-hidden="true">
              {yTicks.map((t) => <span key={t} style={{ left: `${t}%` }}>{t}</span>)}
            </div>
            <span className="ag-scatter__xlab" aria-hidden="true">plazo transcurrido %</span>
          </div>

          <dl className="ag-tally">
            <div className="is-ok"><dt>Al día</dt><dd>{d.adelante}</dd></div>
            <div className="is-warn"><dt>Atrasadas</dt><dd>{d.atras}</dd></div>
            <div className="is-err"><dt>Vencidas</dt><dd>{d.vencidas}</dd></div>
          </dl>
        </figure>

        {/* 3 · distribución */}
        <figure className="ag-fig">
          <figcaption className="ag-fig__head">
            <h4>Distribución</h4>
            <p>Cuántas metas hay en cada tramo de avance</p>
          </figcaption>

          <div className="ag-hist" role="img"
            aria-label={d.bins.map((b) => `${b.label} %: ${b.n}`).join(', ')}>
            {d.bins.map((b, i) => (
              <div key={b.id} className={`ag-col ${b.id === 'b4' ? 'is-done' : ''} ${b.n ? '' : 'is-zero'}`}
                style={{ '--h': (b.n / d.binMax) * 100, '--i': i }}>
                <span className="ag-col__n">{b.n}</span>
                <span className="ag-col__bar" />
                <span className="ag-col__lab">{b.label}<small>%</small></span>
              </div>
            ))}
          </div>
        </figure>
      </div>
    </section>
  )
}

export default MetasAvanceGeneral
