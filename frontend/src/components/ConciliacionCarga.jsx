import React, { useId, useState } from 'react'
import { Spinner } from '@heroui/react'
import { Check, FileSpreadsheet, Play, Upload, X } from 'lucide-react'
import '../styles/ConciliacionCarga.css'

const peso = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`)

/**
 * Un lado de la conciliación: título, de dónde sale el archivo, zona de carga
 * con arrastrar y soltar, y la lista de archivos cargados (cada uno se puede quitar).
 */
function Lado({ titulo, origen, icono: Icono = FileSpreadsheet, archivos, multiple, accept, formatos, onAgregar, onQuitar }) {
  const id = useId()
  const [arrastrando, setArrastrando] = useState(false)
  const permitido = (f) => {
    const ext = `.${f.name.split('.').pop().toLowerCase()}`
    return accept.split(',').includes(ext)
  }
  const agregar = (lista) => {
    const fs = [...lista].filter(permitido)
    if (fs.length) onAgregar(multiple ? fs : [fs[0]])
  }
  const lleno = archivos.length > 0

  return (
    <section className={`cc-lado ${lleno ? 'is-listo' : ''}`} aria-labelledby={`${id}-t`}>
      <header className="cc-lado__head">
        <span className="cc-lado__icono" aria-hidden="true"><Icono size={18} strokeWidth={1.6} /></span>
        <div className="cc-lado__copy">
          <h2 id={`${id}-t`} className="cc-lado__titulo">{titulo}</h2>
          <p className="cc-lado__origen">{origen}</p>
        </div>
        <span className={`cc-estado ${lleno ? 'is-ok' : ''}`}>
          {lleno ? <><Check size={13} strokeWidth={2.2} /> Listo</> : 'Pendiente'}
        </span>
      </header>

      {archivos.length > 0 && (
        <ul className="cc-archivos">
          {archivos.map((f, i) => (
            <li key={`${f.name}-${i}`} className="cc-archivo">
              <FileSpreadsheet size={16} strokeWidth={1.6} aria-hidden="true" />
              <span className="cc-archivo__nombre" title={f.name}>{f.name}</span>
              <span className="cc-archivo__peso">{peso(f.size)}</span>
              <button type="button" className="cc-archivo__quitar" onClick={() => onQuitar(i)} aria-label={`Quitar ${f.name}`}>
                <X size={15} strokeWidth={1.9} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {(multiple || !lleno) && (
        <label
          htmlFor={id}
          className={`cc-drop ${arrastrando ? 'is-over' : ''} ${lleno ? 'is-compacto' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => { e.preventDefault(); setArrastrando(false); agregar(e.dataTransfer.files) }}
        >
          <span className="cc-drop__tesela" aria-hidden="true"><Upload size={18} strokeWidth={1.7} /></span>
          <span className="cc-drop__texto">
            <strong>{lleno ? 'Agregar otro' : 'Subir archivo'}</strong>
            <small>{formatos}</small>
          </span>
          <input
            id={id}
            type="file"
            accept={accept}
            multiple={multiple}
            className="cc-drop__input"
            onChange={(e) => { agregar(e.target.files); e.target.value = '' }}
          />
        </label>
      )}

    </section>
  )
}

/**
 * Presentación común de las conciliaciones por archivos: los dos lados frente a
 * frente y, abajo, la barra con lo que falta y el botón que ejecuta.
 * `lados` es [izquierda, derecha]; cada uno con las props de <Lado>.
 */
function ConciliacionCarga({ lados, error, cargando, boton, cargandoTexto = 'Procesando...', onEjecutar, resultadoDescripcion }) {
  const faltan = lados.filter((l) => !l.archivos.length).map((l) => l.corto || l.titulo)
  const listo = faltan.length === 0

  return (
    <div className="cc">
      {error && (
        <div className="q-alert" role="alert">
          <X size={16} strokeWidth={2} />
          {error}
        </div>
      )}

      <div className="cc-mesa">
        <Lado {...lados[0]} />
        <div className="cc-frente" aria-hidden="true"><span>frente a</span></div>
        <Lado {...lados[1]} />
      </div>

      <div className="cc-barra">
        <p className="cc-barra__texto" role="status" aria-live="polite">
          {listo
            ? <><strong>Todo cargado.</strong> {resultadoDescripcion}</>
            : <>Falta cargar: <strong>{faltan.join(' y ')}</strong>.</>}
        </p>
        <button
          type="button"
          className="q-btn q-btn--primary cc-barra__boton"
          onClick={onEjecutar}
          disabled={cargando || !listo}
        >
          {cargando ? <Spinner size="sm" color="current" /> : <Play size={16} strokeWidth={1.8} />}
          {cargando ? cargandoTexto : boton}
        </button>
      </div>
    </div>
  )
}

export default ConciliacionCarga
