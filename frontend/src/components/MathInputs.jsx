import React, { useEffect, useState } from 'react'

/**
 * Entradas escritas como variables de una ecuación:
 *   símbolo · descripción  =  [ valor ] unidad
 * y una derivación en vivo con los valores sustituidos.
 */

export const fmtGs = (n, dec = 0) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('es-PY', { minimumFractionDigits: dec, maximumFractionDigits: dec })

/** Símbolo matemático: { v, sub } o string. */
export function Sym({ v, sub }) {
  return <span className="qm-sym"><i>{v}</i>{sub && <sub>{sub}</sub>}</span>
}

/** Fila de variable. `htmlFor` enlaza la descripción con el control. */
export function Var({ sym, sub, label, htmlFor, unit, hint, op = '=', children, wide }) {
  return (
    <div className={`qm-var ${wide ? 'qm-var--wide' : ''}`}>
      <span className="qm-var__sym" aria-hidden="true"><Sym v={sym} sub={sub} /></span>
      <span className="qm-var__desc">
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span>{label}</span>}
        {hint && <small>{hint}</small>}
      </span>
      <span className="qm-var__op" aria-hidden="true">{op}</span>
      <span className="qm-var__field">
        {children}
        {unit && <span className="qm-var__unit">{unit}</span>}
      </span>
    </div>
  )
}

/** Monto con separador de miles (es-PY); entrega un número. */
export function MoneyInput({ id, value, onChange, placeholder = '0', ...rest }) {
  const [text, setText] = useState(value ? fmtGs(value) : '')

  useEffect(() => {
    const parsed = Number(text.replace(/\./g, '').replace(',', '.')) || 0
    if (parsed !== (Number(value) || 0)) setText(value ? fmtGs(value) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const handle = (e) => {
    const digits = e.target.value.replace(/[^\d]/g, '')
    const n = digits ? Number(digits) : 0
    setText(digits ? fmtGs(n) : '')
    onChange(n)
  }

  return (
    <input
      id={id}
      className="qm-in qm-in--num"
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={text}
      onChange={handle}
      placeholder={placeholder}
      {...rest}
    />
  )
}

/** Entero acotado. */
export function IntInput({ id, value, onChange, min = 0, max, ...rest }) {
  return (
    <input
      id={id}
      className="qm-in qm-in--num qm-in--short"
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={value}
      onChange={(e) => {
        let n = parseFloat(e.target.value)
        if (!Number.isFinite(n)) n = 0
        if (max !== undefined) n = Math.min(max, n)
        onChange(Math.max(min, n))
      }}
      {...rest}
    />
  )
}

/** Conjunto de opciones: m ∈ { a | b | c }. */
export function SetChoice({ name, value, options, onChange, label }) {
  return (
    <span className="qm-set" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={o.value} className={`qm-set__opt ${String(value) === String(o.value) ? 'is-on' : ''}`}>
          <input type="radio" name={name} value={o.value} checked={String(value) === String(o.value)} onChange={() => onChange(o.value)} />
          {o.label}
        </label>
      ))}
    </span>
  )
}

/** Interruptor de un término de la ecuación (incluido / excluido). */
export function TermToggle({ id, checked, onChange, children }) {
  return (
    <label className={`qm-toggle ${checked ? 'is-on' : ''}`} htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="qm-toggle__box" aria-hidden="true" />
      {children}
    </label>
  )
}

/** Línea de derivación: fórmula a la izquierda, valor a la derecha. */
export function Step({ children, value, tone, kind }) {
  return (
    <div className={`qm-step ${kind ? `is-${kind}` : ''} ${tone ? `tone-${tone}` : ''}`}>
      <span className="qm-step__f">{children}</span>
      <span className="qm-step__v">{value}</span>
    </div>
  )
}

/** Fórmula en notación: términos { v, sub } | { op } | { n }. */
export function F({ t }) {
  return (
    <>
      {t.map((x, i) => {
        if (x.op) return <span key={i} className={`qm-f__op${'(),'.includes(x.op) ? ' is-tight' : ''}`}>{x.op}</span>
        if (x.n !== undefined) return <span key={i} className="qm-f__n">{x.n}</span>
        if (x.w) return <span key={i} className="qm-f__w">{x.w}</span>
        return <span key={i} className="qm-f__v">{x.v}{x.sub && <sub>{x.sub}</sub>}</span>
      })}
    </>
  )
}
