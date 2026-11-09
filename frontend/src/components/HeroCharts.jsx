import { useState } from 'react'

// Gráficos intercambiables del hero de Inicio. Todos comparten el mismo
// lienzo (320×220), grilla y ejes para conservar el estilo del original.

const X0 = 20
const X1 = 300
const Y0 = 10
const Y1 = 190

function Frame({ children }) {
  return (
    <>
      <g className="q-plot__grid">
        {Array.from({ length: 9 }).map((_, i) => <line key={`v${i}`} x1={X0 + i * 35} y1={Y0} x2={X0 + i * 35} y2={Y1} />)}
        {Array.from({ length: 6 }).map((_, i) => <line key={`h${i}`} x1={X0} y1={Y0 + i * 36} x2={X1} y2={Y0 + i * 36} />)}
      </g>
      <line className="q-plot__axis" x1={X0} y1={Y1} x2={X1 + 4} y2={Y1} />
      <line className="q-plot__axis" x1={X0} y1={Y1} x2={X0} y2={Y0 - 4} />
      {children}
    </>
  )
}

function Conciliacion() {
  return (
    <>
      <defs>
        <linearGradient id="qh-conc-curve" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#12B886" stopOpacity="0.2" />
          <stop offset="1" stopColor="#7EE8C4" />
        </linearGradient>
        <linearGradient id="qh-conc-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#12B886" stopOpacity="0.3" />
          <stop offset="1" stopColor="#12B886" stopOpacity="0" />
        </linearGradient>
      </defs>
      <Frame>
        <path className="q-plot__fade" d="M20 170 C 70 168, 95 150, 125 128 S 190 70, 230 52 S 285 30, 300 26 L 300 190 L 20 190 Z" fill="url(#qh-conc-area)" />
        <path className="q-plot__draw" pathLength="1" d="M20 170 C 70 168, 95 150, 125 128 S 190 70, 230 52 S 285 30, 300 26" fill="none" stroke="url(#qh-conc-curve)" strokeWidth="2" />
        <line className="q-plot__guide q-plot__fade" x1="230" y1="52" x2="230" y2="190" />
        <circle className="q-plot__point q-plot__pop" cx="230" cy="52" r="4" />
      </Frame>
    </>
  )
}

function PuntoEquilibrio() {
  // Ingresos: (20,190)→(300,30) · Costos totales: (20,130)→(300,80)
  const px = 172.7
  const py = 102.7
  return (
    <>
      <Frame>
        <polygon className="q-plot__fade" points={`20,190 ${px},${py} 20,130`} fill="rgba(255, 122, 122, 0.12)" />
        <polygon className="q-plot__fade" points={`${px},${py} 300,30 300,80`} fill="rgba(18, 184, 134, 0.22)" />
        <line className="q-plot__ref" x1="20" y1="130" x2="300" y2="130" />
        <path className="q-plot__draw q-plot__draw--alt" pathLength="1" d="M20 130 L 300 80" fill="none" strokeWidth="2" />
        <path className="q-plot__draw" pathLength="1" d="M20 190 L 300 30" fill="none" stroke="#7EE8C4" strokeWidth="2" />
        <line className="q-plot__guide q-plot__fade" x1={px} y1={py} x2={px} y2="190" />
        <circle className="q-plot__point q-plot__pop" cx={px} cy={py} r="4" />
        <text className="q-plot__label q-plot__fade" x="296" y="24" textAnchor="end">Ingresos</text>
        <text className="q-plot__label q-plot__fade" x="296" y="96" textAnchor="end">Costos totales</text>
        <text className="q-plot__label q-plot__fade" x="26" y="125">CF</text>
        <text className="q-plot__label q-plot__label--mint q-plot__fade" x={px + 6} y="184">PE</text>
        <text className="q-plot__label q-plot__fade" x="60" y="170">Pérdida</text>
        <text className="q-plot__label q-plot__label--mint q-plot__fade" x="250" y="66">Utilidad</text>
      </Frame>
    </>
  )
}

function FlujoCaja() {
  const net = [30, -18, 42, 25, -12, 50, 38, 20]
  // Barras y saldo comparten base y escala: cada tramo de la línea sube o
  // baja exactamente la altura de la columna de ese mes.
  const base = 168
  const k = 0.8
  let acc = 0
  const pts = net.map((v, i) => {
    acc += v
    return [37.5 + i * 35, base - acc * k]
  })
  const line = `M20 ${base} ` + pts.map(([x, y]) => `L${x} ${y.toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  return (
    <>
      <Frame>
        <line className="q-plot__ref" x1="20" y1={base} x2="300" y2={base} />
        {net.map((v, i) => {
          const h = Math.abs(v) * k
          const x = 37.5 + i * 35 - 7
          return (
            <rect
              key={i}
              className={`q-plot__bar ${v < 0 ? 'q-plot__bar--neg' : ''}`}
              style={{ animationDelay: `${150 + i * 60}ms` }}
              x={x}
              y={v >= 0 ? base - h : base}
              width="14"
              height={h}
              rx="2"
            />
          )
        })}
        <path className="q-plot__draw" pathLength="1" d={line} fill="none" stroke="#7EE8C4" strokeWidth="2" strokeLinejoin="round" />
        {pts.slice(0, -1).map(([x, y], i) => (
          <circle key={i} className="q-plot__point q-plot__pop" style={{ animationDelay: `${700 + i * 60}ms` }} cx={x} cy={y} r="2.5" />
        ))}
        <circle className="q-plot__point q-plot__pop" cx={last[0]} cy={last[1]} r="4" />
        <text className="q-plot__label q-plot__fade" x="26" y={base - 4}>0</text>
        <text className="q-plot__label q-plot__label--mint q-plot__fade" x={last[0] - 8} y={last[1] - 8} textAnchor="end">Saldo</text>
      </Frame>
    </>
  )
}

function LiquidacionIva() {
  const debito = [80, 95, 70, 110, 100, 125]
  const credito = [60, 70, 75, 80, 85, 90]
  const slot = 280 / 6
  return (
    <>
      <Frame>
        {debito.map((d, i) => {
          const cx = 20 + slot * i + slot / 2
          const c = credito[i]
          return (
            <g key={i}>
              <rect className="q-plot__bar" style={{ animationDelay: `${150 + i * 70}ms` }} x={cx - 13} y={190 - d * 1.3} width="12" height={d * 1.3} rx="2" />
              <rect className="q-plot__bar q-plot__bar--alt" style={{ animationDelay: `${190 + i * 70}ms` }} x={cx + 1} y={190 - c * 1.3} width="12" height={c * 1.3} rx="2" />
            </g>
          )
        })}
        <g className="q-plot__fade">
          <rect x="196" y="16" width="8" height="8" rx="2" fill="#7EE8C4" />
          <text className="q-plot__label" x="208" y="23">Débito</text>
          <rect x="246" y="16" width="8" height="8" rx="2" fill="#6B97FF" />
          <text className="q-plot__label" x="258" y="23">Crédito</text>
        </g>
      </Frame>
    </>
  )
}

function Depreciacion() {
  const years = 5
  const step = 280 / years
  const top = 30
  const residual = 160
  const drop = (residual - top) / years
  const stairs = Array.from({ length: years }).map((_, i) => {
    const x = 20 + i * step
    const y = top + i * drop
    return `${i ? 'L' : 'M'}${x} ${y} L ${x + step} ${y}`
  }).join(' ') + ` L 300 ${residual}`
  return (
    <>
      <defs>
        <linearGradient id="qh-dep-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#12B886" stopOpacity="0.28" />
          <stop offset="1" stopColor="#12B886" stopOpacity="0" />
        </linearGradient>
      </defs>
      <Frame>
        <path className="q-plot__fade" d={`M20 ${top} L 300 ${residual} L 300 190 L 20 190 Z`} fill="url(#qh-dep-area)" />
        <line className="q-plot__ref" x1="20" y1={residual} x2="300" y2={residual} />
        <path className="q-plot__draw q-plot__draw--alt" pathLength="1" d={stairs} fill="none" strokeWidth="1.5" />
        <path className="q-plot__draw" pathLength="1" d={`M20 ${top} L 300 ${residual}`} fill="none" stroke="#7EE8C4" strokeWidth="2" />
        {Array.from({ length: years + 1 }).map((_, i) => (
          <circle key={i} className="q-plot__point q-plot__pop" style={{ animationDelay: `${900 + i * 80}ms` }} cx={20 + i * step} cy={top + i * drop} r={i === years ? 4 : 2.5} />
        ))}
        <text className="q-plot__label q-plot__fade" x="28" y="24">Costo</text>
        <text className="q-plot__label q-plot__fade" x="26" y={residual - 5}>VR</text>
        <text className="q-plot__label q-plot__label--mint q-plot__fade" x="292" y={residual - 10} textAnchor="end">Valor libro</text>
      </Frame>
    </>
  )
}

const CHARTS = [
  {
    id: 'conciliacion',
    label: 'Conciliación',
    title: 'Conciliación: débitos y créditos convergen',
    Plot: Conciliacion,
    formula: <><span>Σ</span><i>Debe</i> − <span>Σ</span><i>Haber</i> = 0</>,
  },
  {
    id: 'equilibrio',
    label: 'Punto de equilibrio',
    title: 'Punto de equilibrio: ingresos contra costos totales',
    Plot: PuntoEquilibrio,
    formula: <><i>PE</i> = <i>CF</i> ÷ (<i>P</i> − <i>CVu</i>)</>,
  },
  {
    id: 'flujo',
    label: 'Flujo de caja',
    title: 'Flujo de caja: neto mensual y saldo acumulado',
    Plot: FlujoCaja,
    formula: <><i>Saldo</i> = <span>Σ</span><i>Ingresos</i> − <span>Σ</span><i>Egresos</i></>,
  },
  {
    id: 'iva',
    label: 'IVA',
    title: 'Liquidación de IVA: débito y crédito fiscal por mes',
    Plot: LiquidacionIva,
    formula: <><i>IVA</i> = <i>Débito</i> − <i>Crédito</i></>,
  },
  {
    id: 'depreciacion',
    label: 'Depreciación',
    title: 'Depreciación lineal: valor libro hasta el valor residual',
    Plot: Depreciacion,
    formula: <><i>Dep</i> = (<i>C</i> − <i>VR</i>) ÷ <i>n</i></>,
  },
]

const STORAGE_KEY = 'quadra.heroChart'

export default function HeroCharts() {
  const [active, setActive] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return CHARTS.some((c) => c.id === saved) ? saved : CHARTS[0].id
    } catch {
      return CHARTS[0].id
    }
  })

  const chart = CHARTS.find((c) => c.id === active) ?? CHARTS[0]
  const { Plot } = chart

  const select = (id) => {
    setActive(id)
    try { localStorage.setItem(STORAGE_KEY, id) } catch { /* sin storage */ }
  }

  const onKeyDown = (e) => {
    const i = CHARTS.findIndex((c) => c.id === active)
    let next = null
    if (e.key === 'ArrowRight') next = (i + 1) % CHARTS.length
    if (e.key === 'ArrowLeft') next = (i - 1 + CHARTS.length) % CHARTS.length
    if (next === null) return
    e.preventDefault()
    select(CHARTS[next].id)
    e.currentTarget.querySelectorAll('[role="tab"]')[next]?.focus()
  }

  return (
    <figure className="q-hero__figure">
      <svg key={chart.id} viewBox="0 0 320 220" className="q-plot" role="img" aria-label={chart.title} id="q-hero-chart">
        <Plot />
      </svg>
      <figcaption className="q-hero__formula" key={`f-${chart.id}`}>
        {chart.formula}
      </figcaption>
      <div className="q-chart-tabs" role="tablist" aria-label="Gráfico del panel de inicio" onKeyDown={onKeyDown}>
        {CHARTS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === active}
            aria-controls="q-hero-chart"
            tabIndex={c.id === active ? 0 : -1}
            className={`q-chart-tabs__tab ${c.id === active ? 'is-active' : ''}`}
            onClick={() => select(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
    </figure>
  )
}
