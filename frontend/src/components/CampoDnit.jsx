import React, { useState } from 'react'
import { useRucDnit, estadoDnit } from '../services/rucDnit'
import '../styles/CampoDnit.css'

/**
 * Input de texto que sugiere contribuyentes del padrón de RUC de la DNIT
 * mientras se escribe un RUC o un nombre. Al elegir uno llama a
 * `onElegir({ ruc: '80012345-6', base, dv, nombre, estado })`.
 */
export default function CampoDnit({ id, value, onChange, onElegir, className = 'q-input', inputProps = {}, ...rest }) {
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const [elegidoTexto, setElegidoTexto] = useState(null)
  const listaId = `${id}-dnit`
  const consulta = abierto && value !== elegidoTexto ? value : ''
  const { resultados, cargando } = useRucDnit(consulta)
  const visibles = consulta ? resultados : []

  const elegir = (r) => {
    setAbierto(false)
    onElegir(r)
    // no volver a sugerir para lo que acaba de completarse
    setTimeout(() => setElegidoTexto(document.getElementById(id)?.value ?? null), 0)
  }

  return (
    <div className="qd-campo">
      <input
        id={id}
        className={className}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={abierto && visibles.length > 0}
        aria-controls={listaId}
        aria-autocomplete="list"
        {...rest}
        {...inputProps}
        onFocus={(e) => { setAbierto(true); inputProps.onFocus?.(e) }}
        onBlur={(e) => { setTimeout(() => setAbierto(false), 140); inputProps.onBlur?.(e) }}
        onChange={(e) => { onChange(e.target.value); setAbierto(true); setActivo(0); setElegidoTexto(null) }}
        onKeyDown={(e) => {
          if (abierto && visibles.length) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActivo((a) => Math.min(a + 1, visibles.length - 1)); return }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)); return }
            if (e.key === 'Enter') { e.preventDefault(); elegir(visibles[activo]); return }
            if (e.key === 'Escape') { e.stopPropagation(); setAbierto(false); return }
          }
          inputProps.onKeyDown?.(e)
        }}
      />
      {abierto && consulta && (visibles.length > 0 || cargando) && (
        <ul id={listaId} className="qd-campo__lista" role="listbox" aria-label="Padrón de RUC de la DNIT">
          {!visibles.length && <li className="qd-campo__nota" aria-disabled="true">Buscando en el padrón de la DNIT…</li>}
          {visibles.map((r, i) => (
            <li key={r.ruc} role="option" aria-selected={i === activo} className={i === activo ? 'is-on' : ''}
              onMouseDown={(e) => { e.preventDefault(); elegir(r) }} onMouseEnter={() => setActivo(i)}>
              <span className="qd-campo__cod">{r.ruc}</span>
              <span className="qd-campo__txt">{r.nombre}</span>
              {estadoDnit(r.estado) && <span className="qd-campo__extra">{estadoDnit(r.estado)}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
