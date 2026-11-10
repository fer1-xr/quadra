import React, { useEffect, useState } from 'react'
import { X, CalendarDays, Plus, Check, Trash2, Undo2 } from 'lucide-react'
import {
  avanceDe, estadoDe, planAhorro, gs, parseMonto, hoyISO, fechaPY, nuevoId, esFinanciera,
  estaPagado, cuotasPendientes, generarCuotas, sumarMeses
} from './metasCalc'

const ESTADO_LABEL = { hecha: 'Cumplida', 'al-dia': 'A tiempo', atrasada: 'Atrasada', vencida: 'Vencida' }
const HISTORIAL_VISIBLE = 4
const CUOTAS_VISIBLES = 3

/** Campo de guaraníes con separador de miles mientras se escribe. */
export function MontoInput({ value, onChange, ...rest }) {
  const n = parseMonto(value)
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={n ? n.toLocaleString('es-PY') : ''}
      onChange={(e) => onChange(parseMonto(e.target.value))}
      {...rest}
    />
  )
}

/** Editor de pasos del formulario: agregar, renombrar y quitar (lo tildado se conserva). */
export function PasosEditor({ pasos, onChange }) {
  const [texto, setTexto] = useState('')

  const agregar = () => {
    const t = texto.trim()
    if (!t) return
    onChange([...pasos, { id: nuevoId(), texto: t, hecho: false }])
    setTexto('')
  }

  return (
    <div className="pasos-editor">
      {pasos.length > 0 && (
        <ol className="pasos-editor__lista">
          {pasos.map((p, i) => (
            <li key={p.id} className={p.hecho ? 'is-hecho' : ''}>
              <span className="pasos-editor__n">{p.hecho ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
              <input
                type="text"
                value={p.texto}
                onChange={(e) => onChange(pasos.map((x) => (x.id === p.id ? { ...x, texto: e.target.value } : x)))}
                aria-label={`Paso ${i + 1}`}
              />
              <button
                type="button"
                className="pasos-editor__del"
                onClick={() => onChange(pasos.filter((x) => x.id !== p.id))}
                aria-label={`Quitar paso ${i + 1}`}
              >
                <X size={14} strokeWidth={1.8} />
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="pasos-editor__add">
        <input
          id="meta-paso-nuevo"
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar() } }}
          placeholder={pasos.length ? 'Siguiente paso… (Enter para agregar)' : 'Ej: Introducción (Enter para agregar)'}
        />
        <button type="button" className="btn btn-secondary" onClick={agregar} disabled={!texto.trim()}>
          <Plus size={15} strokeWidth={1.8} /> Agregar
        </button>
      </div>
    </div>
  )
}

/** Imagen de cabecera que vuelve al marcador del tipo si la URL no es una imagen. */
function MetaCabecera({ meta, tipo }) {
  const [rota, setRota] = useState(false)
  useEffect(() => setRota(false), [meta.imagenUrl])
  if (meta.imagenUrl && !rota) {
    return (
      <div className="meta-imagen">
        <img src={meta.imagenUrl} alt="" onError={() => setRota(true)} />
        <span className="meta-type-badge"><tipo.icon size={13} strokeWidth={1.8} /> {tipo.label}</span>
      </div>
    )
  }
  return (
    <div className={`meta-imagen-placeholder tipo-${tipo.id}`}>
      <tipo.icon size={22} strokeWidth={1.6} aria-hidden="true" />
      <span>{tipo.label}</span>
    </div>
  )
}

/**
 * Libro de aportes de una meta financiera: cada ahorro es un movimiento.
 * Con "Cuota fija mensual" se programan N cuotas de una vez (p. ej. 220.000 × 60);
 * cada cuota suma al avance recién cuando se marca como pagada.
 */
function Aportes({ meta, onCambiarAportes }) {
  const [monto, setMonto] = useState(0)
  const [fecha, setFecha] = useState(hoyISO())
  const [fija, setFija] = useState(false)
  const [veces, setVeces] = useState(12)
  const [pagarVencidas, setPagarVencidas] = useState(false)
  const [verTodo, setVerTodo] = useState(false)
  const [verCuotas, setVerCuotas] = useState(false)

  const plan = planAhorro(meta)
  const todos = meta.aportes || []
  const pagados = todos.filter(estaPagado)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || String(b.id).localeCompare(String(a.id)))
  const visibles = verTodo ? pagados : pagados.slice(0, HISTORIAL_VISIBLE)
  const pendientes = cuotasPendientes(meta)
  const hoy = hoyISO()
  const vencidas = pendientes.filter((c) => c.fecha <= hoy)
  const proximas = verCuotas ? pendientes : pendientes.slice(0, CUOTAS_VISIBLES)

  const n = Math.max(2, Math.min(600, Number(veces) || 0))
  const vencidasNuevas = fija && monto ? generarCuotas({ monto, inicio: fecha || hoy, veces: n, pagarVencidas: false }).filter((c) => c.fecha <= hoy).length : 0

  const registrar = (e) => {
    e.preventDefault()
    if (!monto) return
    if (fija) {
      onCambiarAportes([...todos, ...generarCuotas({ monto, inicio: fecha || hoy, veces: n, pagarVencidas })])
      setFija(false)
      setPagarVencidas(false)
    } else {
      onCambiarAportes([...todos, { id: nuevoId(), monto, fecha: fecha || hoy, registradoEn: new Date().toISOString() }])
    }
    setMonto(0)
  }

  const marcarPagadas = (ids) => {
    const set = new Set(ids)
    const ahora = new Date().toISOString()
    onCambiarAportes(todos.map((a) => (set.has(a.id) ? { ...a, pagado: true, pagadoEn: ahora } : a)))
  }

  const quitar = (a) => {
    if (a.serie) {
      // una cuota pagada por error vuelve a pendiente; no se pierde el plan
      if (window.confirm(`¿Desmarcar la cuota ${a.cuota} de ${a.de} (${gs(a.monto)})? Volverá a quedar pendiente.`)) {
        onCambiarAportes(todos.map((x) => (x.id === a.id ? { ...x, pagado: false, pagadoEn: null } : x)))
      }
    } else if (window.confirm(`¿Eliminar el ahorro de ${gs(a.monto)} del ${fechaPY(a.fecha)}?`)) {
      onCambiarAportes(todos.filter((x) => x.id !== a.id))
    }
  }

  const cancelarPendientes = () => {
    if (window.confirm(`¿Cancelar las ${pendientes.length} cuotas pendientes? Las ya pagadas se conservan.`)) {
      onCambiarAportes(todos.filter(estaPagado))
    }
  }

  if (!plan) return <p className="meta-hint">Editá la meta y cargá el monto objetivo para registrar ahorros.</p>

  return (
    <div className="aportes">
      <div className="aportes__resumen">
        <div>
          <span className="aportes__label">Ahorrado</span>
          <span className="aportes__valor">{gs(plan.ahorrado)}</span>
        </div>
        <div className="aportes__obj">
          <span className="aportes__label">de</span>
          <span>{gs(plan.objetivo)}</span>
        </div>
      </div>
      {plan.falta > 0 ? (
        <p className="aportes__falta">
          Faltan <b>{gs(plan.falta)}</b>
          {!pendientes.length && plan.porMes !== null && !plan.vencida && <> · {gs(plan.porMes)} por mes durante {plan.meses} {plan.meses === 1 ? 'mes' : 'meses'}</>}
        </p>
      ) : (
        <p className="aportes__falta is-ok">¡Llegaste al monto objetivo!</p>
      )}

      {/* cuotas programadas */}
      {pendientes.length > 0 && (
        <div className="cuotas">
          <div className="cuotas__head">
            <span>Cuotas pendientes</span>
            <b>{pendientes.length}</b>
          </div>
          {vencidas.length > 1 && (
            <button type="button" className="btn btn-small cuotas__todas" onClick={() => marcarPagadas(vencidas.map((c) => c.id))}>
              <Check size={14} strokeWidth={2.2} /> Marcar {vencidas.length} vencidas como pagadas
            </button>
          )}
          <ul className="cuotas__lista">
            {proximas.map((c) => (
              <li key={c.id} className={c.fecha <= hoy ? 'is-vencida' : ''}>
                <label>
                  <input type="checkbox" checked={false} onChange={() => marcarPagadas([c.id])} />
                  <span className="pasos__box" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>
                  <span className="cuotas__n">{c.cuota}/{c.de}</span>
                  <span className="cuotas__fecha">{fechaPY(c.fecha)}</span>
                  <span className="cuotas__monto">{gs(c.monto)}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="cuotas__pie">
            {pendientes.length > CUOTAS_VISIBLES && (
              <button type="button" className="meta-link" onClick={() => setVerCuotas(!verCuotas)}>
                {verCuotas ? 'Ver menos' : `Ver las ${pendientes.length} cuotas`}
              </button>
            )}
            <button type="button" className="meta-link is-quiet" onClick={cancelarPendientes}>Cancelar pendientes</button>
          </div>
        </div>
      )}

      <form className="aportes__form" onSubmit={registrar}>
        <div className="aportes__fila">
          <MontoInput value={monto} onChange={setMonto} placeholder={fija ? 'Cuota mensual' : 'Monto ahorrado'} aria-label="Monto en guaraníes" />
          <input
            type="date"
            value={fecha}
            max={fija ? undefined : hoy}
            onChange={(e) => setFecha(e.target.value)}
            aria-label={fija ? 'Fecha de la primera cuota' : 'Fecha del ahorro'}
          />
          <button type="submit" className="btn btn-small btn-aporte" disabled={!monto} aria-label={fija ? 'Programar cuotas' : 'Registrar ahorro'}>
            <Plus size={15} strokeWidth={2} />
          </button>
        </div>

        <div className="aportes__fija">
          <label className="aportes__switch">
            <input type="checkbox" checked={fija} onChange={(e) => setFija(e.target.checked)} />
            <span>Cuota fija mensual</span>
          </label>
          {fija && (
            <span className="aportes__veces">
              ×
              <input
                type="number"
                min="2"
                max="600"
                value={veces}
                onChange={(e) => setVeces(e.target.value)}
                aria-label="Cantidad de meses"
              />
              meses
            </span>
          )}
        </div>

        {fija && monto > 0 && (
          <p className="aportes__preview">
            {n} cuotas de {gs(monto)} = <b>{gs(monto * n)}</b>
            <span>Desde {fechaPY(fecha || hoy)} hasta {fechaPY(sumarMeses(fecha || hoy, n - 1))}</span>
          </p>
        )}

        {fija && vencidasNuevas > 0 && (
          <label className="aportes__switch aportes__switch--sub">
            <input type="checkbox" checked={pagarVencidas} onChange={(e) => setPagarVencidas(e.target.checked)} />
            <span>Ya pagué las {vencidasNuevas} {vencidasNuevas === 1 ? 'cuota vencida' : 'cuotas vencidas'} hasta hoy</span>
          </label>
        )}
      </form>

      {pagados.length > 0 && (
        <ul className="aportes__lista" aria-label="Historial de ahorros">
          {visibles.map((a) => (
            <li key={a.id}>
              <span className="aportes__fecha">
                {fechaPY(a.fecha)}
                {a.serie && <small> · cuota {a.cuota}/{a.de}</small>}
              </span>
              <span className="aportes__monto">+ {gs(a.monto)}</span>
              <button
                type="button"
                className="aportes__del"
                aria-label={a.serie ? `Desmarcar cuota ${a.cuota}` : `Eliminar ahorro de ${gs(a.monto)}`}
                onClick={() => quitar(a)}
              >
                {a.serie ? <Undo2 size={13} strokeWidth={1.8} /> : <Trash2 size={13} strokeWidth={1.8} />}
              </button>
            </li>
          ))}
        </ul>
      )}
      {pagados.length > HISTORIAL_VISIBLE && (
        <button type="button" className="meta-link" onClick={() => setVerTodo(!verTodo)}>
          {verTodo ? 'Ver menos' : `Ver los ${pagados.length} movimientos`}
        </button>
      )}
    </div>
  )
}

/** Lista de pasos con casillas: el avance es la proporción de pasos tildados. */
function Pasos({ meta, onToggle, onAgregar }) {
  const [texto, setTexto] = useState('')
  const pasos = meta.pasos || []
  const hechos = pasos.filter((p) => p.hecho).length

  const agregar = (e) => {
    e.preventDefault()
    const t = texto.trim()
    if (!t) return
    onAgregar({ id: nuevoId(), texto: t, hecho: false })
    setTexto('')
  }

  return (
    <div className="pasos">
      <div className="pasos__head">
        <span>Pasos</span>
        {pasos.length > 0 && <b>{hechos} de {pasos.length}</b>}
      </div>
      {pasos.length === 0 && <p className="meta-hint">Dividí la meta en pasos pequeños; cada paso tildado suma al avance.</p>}
      <ul className="pasos__lista">
        {pasos.map((p) => (
          <li key={p.id} className={p.hecho ? 'is-hecho' : ''}>
            <label>
              <input type="checkbox" checked={!!p.hecho} onChange={() => onToggle(p.id)} />
              <span className="pasos__box" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>
              <span className="pasos__texto">{p.texto}</span>
            </label>
          </li>
        ))}
      </ul>
      <form className="pasos__add" onSubmit={agregar}>
        <input type="text" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Agregar paso…" aria-label="Nuevo paso" />
        <button type="submit" className="btn btn-small" disabled={!texto.trim()} aria-label="Agregar paso"><Plus size={15} strokeWidth={2} /></button>
      </form>
    </div>
  )
}

function MetaCard({ meta, tipo, onEditar, onEliminar, onCambiar }) {
  const avance = Math.round(avanceDe(meta))
  const estado = estadoDe(meta)
  const fin = esFinanciera(meta)
  const cumplida = avance >= 100

  return (
    <article className={`meta-card tipo-${tipo.id} ${cumplida ? 'completada' : ''}`}>
      <MetaCabecera meta={meta} tipo={tipo} />

      <div className="meta-content">
        <div className="meta-header-content">
          <h4>{meta.titulo}</h4>
          <button
            className="btn-opciones"
            aria-label="Eliminar meta"
            onClick={() => { if (window.confirm('¿Deseas eliminar esta meta?')) onEliminar() }}
          >
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>

        <div className="meta-chips">
          <span className={`meta-estado is-${estado}`}>{ESTADO_LABEL[estado]}</span>
          {meta.fechaLimite && (
            <span className="meta-fecha">
              <CalendarDays size={13} strokeWidth={1.8} aria-hidden="true" />
              {fechaPY(meta.fechaLimite)}
            </span>
          )}
        </div>

        {meta.descripcion && <p className="meta-descripcion">{meta.descripcion}</p>}

        {meta.comoSeAlcanzara && (
          <p className="meta-estrategia"><span>Estrategia</span>{meta.comoSeAlcanzara}</p>
        )}

        <div className="progreso-section">
          <div className="progreso-header">
            <span className="progreso-label">
              {fin ? 'Avance del ahorro' : 'Avance'}
            </span>
            <span className="progreso-porcentaje">{avance}%</span>
          </div>
          <div className="progreso-bar" role="progressbar" aria-valuenow={avance} aria-valuemin={0} aria-valuemax={100} aria-label={`Avance de ${meta.titulo}`}>
            <span style={{ width: `${avance}%` }} />
          </div>
        </div>

        {fin ? (
          <Aportes
            meta={meta}
            onCambiarAportes={(aportes) => onCambiar({ ...meta, aportes })}
          />
        ) : (
          <Pasos
            meta={meta}
            onToggle={(id) => onCambiar({ ...meta, pasos: meta.pasos.map((p) => (p.id === id ? { ...p, hecho: !p.hecho, hechoEn: !p.hecho ? new Date().toISOString() : null } : p)) })}
            onAgregar={(p) => onCambiar({ ...meta, pasos: [...(meta.pasos || []), p] })}
          />
        )}

        <div className="meta-acciones">
          <button className="btn btn-small btn-editar" onClick={onEditar}>Editar meta</button>
        </div>
      </div>
    </article>
  )
}

export default MetaCard
