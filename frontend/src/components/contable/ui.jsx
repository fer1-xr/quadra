import React, { useId } from 'react'
import * as XLSX from 'xlsx'
import { MESES, analizarRuc, gs } from '../../services/contabilidad'
import { useContable } from './ContableContext'

/** importe en guaraníes con separador de miles */
export const MontoInput = React.forwardRef(function MontoInput({ id, value, onChange, placeholder = '0', ...rest }, ref) {
  return (
    <input
      ref={ref}
      id={id}
      className="q-input q-input--num ct-monto"
      type="text"
      inputMode="numeric"
      value={value ? Number(value).toLocaleString('es-PY') : ''}
      placeholder={placeholder}
      onChange={(e) => {
        const d = e.target.value.replace(/\D/g, '')
        onChange(d ? Number(d) : '')
      }}
      {...rest}
    />
  )
})

/** selector de cuentas imputables, agrupadas por rubro */
export function CuentaSelect({ id, value, onChange, filtro, ...rest }) {
  const { plan } = useContable()
  const grupos = []
  plan.forEach((c) => {
    if (c.codigo.split('.').length === 3) grupos.push({ grupo: c, cuentas: [] })
    else if (c.imputable && grupos.length && c.codigo.startsWith(`${grupos[grupos.length - 1].grupo.codigo}.`)) {
      if (!filtro || filtro(c)) grupos[grupos.length - 1].cuentas.push(c)
    }
  })
  return (
    <select id={id} className="q-input ct-select" value={value || ''} onChange={(e) => onChange(e.target.value)} {...rest}>
      <option value="">Elegí una cuenta…</option>
      {grupos.filter((g) => g.cuentas.length).map((g) => (
        <optgroup key={g.grupo.codigo} label={`${g.grupo.codigo} ${g.grupo.nombre}`}>
          {g.cuentas.map((c) => <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>)}
        </optgroup>
      ))}
    </select>
  )
}

export const esDisponibilidad = (c) => c.codigo.startsWith('1.1.01.')

/** RUC + razón social, con sugerencias del catastro de personas */
export function PersonaFields({ ruc, nombre, onChange, rotulo = 'RUC', errores = {} }) {
  const { personas } = useContable()
  const listId = useId()
  const r = analizarRuc(ruc)
  const conocida = personas.items.find((p) => p.ruc === ruc)
  return (
    <>
      <div className="q-field">
        <label className="q-label" htmlFor={`${listId}-ruc`}>{rotulo}</label>
        <input
          id={`${listId}-ruc`}
          className={`q-input q-input--num ${errores.ruc ? 'is-invalid' : ''}`}
          list={listId}
          value={ruc}
          placeholder="80012345-6"
          aria-invalid={!!errores.ruc}
          onChange={(e) => {
            const v = e.target.value.trim()
            const p = personas.items.find((x) => x.ruc === v)
            onChange({ personaRuc: v, personaNombre: p ? p.nombre : nombre })
          }}
        />
        <datalist id={listId}>
          {personas.items.map((p) => <option key={p.id} value={p.ruc}>{p.nombre}</option>)}
        </datalist>
        {ruc && r.formato && !r.valido && <small className="ct-hint is-warn">El dígito verificador debería ser {r.esperado}.</small>}
        {ruc && !conocida && r.formato && <small className="ct-hint">RUC nuevo: se agregará a Personas al guardar.</small>}
      </div>
      <div className="q-field ct-span-2">
        <label className="q-label" htmlFor={`${listId}-nom`}>Nombre o razón social</label>
        <input
          id={`${listId}-nom`}
          className={`q-input ${errores.nombre ? 'is-invalid' : ''}`}
          value={nombre}
          aria-invalid={!!errores.nombre}
          onChange={(e) => onChange({ personaRuc: ruc, personaNombre: e.target.value })}
        />
      </div>
    </>
  )
}

/** mes del ejercicio ('' = todo el ejercicio) */
export function PeriodoSelect({ value, onChange, ejercicio }) {
  return (
    <label className="ct-periodo">
      <span className="q-label">Período</span>
      <select className="q-input ct-select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Todo el ejercicio {ejercicio}</option>
        {MESES.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m} {ejercicio}</option>)}
      </select>
    </label>
  )
}

export const enPeriodo = (fecha, ejercicio, mes) =>
  String(fecha || '').startsWith(mes ? `${ejercicio}-${mes}` : String(ejercicio))

/** errores de validación, uno por línea */
export function Errores({ lista }) {
  if (!lista.length) return null
  return (
    <div className="q-alert ct-errores" role="alert">
      <ul>{lista.map((e) => <li key={e}>{e}</li>)}</ul>
    </div>
  )
}

/** vista previa del asiento que se va a generar */
export function AsientoPreview({ lineas, titulo = 'Asiento que se registrará' }) {
  const { nombreCuenta } = useContable()
  const td = lineas.reduce((s, l) => s + l.debe, 0)
  const th = lineas.reduce((s, l) => s + l.haber, 0)
  if (!lineas.length) return null
  return (
    <figure className="ct-preview">
      <figcaption className="q-label">{titulo}</figcaption>
      <table className="q-table ct-tabla ct-tabla--mini">
        <thead><tr><th>Cuenta</th><th className="ct-der">Debe</th><th className="ct-der">Haber</th></tr></thead>
        <tbody>
          {lineas.map((l, i) => (
            <tr key={i}>
              <td className={l.haber ? 'ct-haber' : ''}><span className="ct-cod">{l.cuenta}</span> {nombreCuenta(l.cuenta)}</td>
              <td className="ct-num">{l.debe ? gs(l.debe) : ''}</td>
              <td className="ct-num">{l.haber ? gs(l.haber) : ''}</td>
            </tr>
          ))}
          <tr className="ct-total">
            <td>{td === th ? 'Cuadra' : `Diferencia ${gs(td - th)}`}</td>
            <td className="ct-num">{gs(td)}</td>
            <td className="ct-num">{gs(th)}</td>
          </tr>
        </tbody>
      </table>
    </figure>
  )
}

/** descarga una hoja de cálculo a partir de filas (arrays) */
export const exportarExcel = (nombre, hoja, filas) => exportarHojas(nombre, [{ hoja, filas }])

/** descarga un libro con varias hojas: [{ hoja, filas }] */
export const exportarHojas = (nombre, hojas) => {
  const wb = XLSX.utils.book_new()
  hojas.forEach(({ hoja, filas }) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(filas), hoja.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)))
  XLSX.writeFile(wb, `${nombre}.xlsx`)
}

export function Vacio({ titulo, children, accion }) {
  return (
    <div className="ct-empty">
      <p className="ct-empty__title">{titulo}</p>
      {children && <p>{children}</p>}
      {accion}
    </div>
  )
}
