import React from 'react'

/**
 * Encabezado común de cada hoja de trabajo.
 * `equation` es la ecuación rectora del módulo: una lista de términos
 * { v: 'Variable' } (itálica, como en notación matemática) u { op: '=' }.
 */
function PageHead({ title, lede, equation, caption, children }) {
  return (
    <header className="q-head">
      <div className="q-head__copy">
        <h1 className="q-head__title">{title}</h1>
        {lede && <p className="q-head__lede">{lede}</p>}
      </div>

      {equation && (
        <figure className="q-eq" aria-label={equation.map((t) => t.v || t.op || t.n).join(' ')}>
          <div className="q-eq__line" aria-hidden="true">
            {equation.map((t, i) => {
              if (t.op) return <span key={i} className={`q-eq__op${'(),'.includes(t.op) ? ' q-eq__op--tight' : ''}`}>{t.op}</span>
              if (t.n) return <span key={i} className="q-eq__n">{t.n}</span>
              return <span key={i} className="q-eq__v">{t.v}{t.sub && <sub>{t.sub}</sub>}</span>
            })}
          </div>
          {caption && <figcaption className="q-eq__cap">{caption}</figcaption>}
        </figure>
      )}

      {children && <div className="q-head__aside">{children}</div>}
    </header>
  )
}

/** Franja de cifras: etiqueta arriba, valor en numerales tabulares. */
export function Figures({ items }) {
  return (
    <dl className="q-figs">
      {items.map((it) => (
        <div key={it.label} className={`q-figs__item ${it.tone ? `is-${it.tone}` : ''}`}>
          <dt>{it.label}</dt>
          <dd>{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default PageHead
