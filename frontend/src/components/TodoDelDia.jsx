import React, { useMemo, useState } from 'react'
import PageHead from './PageHead'
import { useCloudCollection } from '../services/useCloudCollection'
import { Plus, X, Check } from 'lucide-react'
import '../styles/TodoDelDia.css'

const CATEGORIAS = [
  { id: 'tributacion', label: 'Tributación' },
  { id: 'laboral', label: 'Laboral' },
  { id: 'societarios', label: 'Societarios' },
  { id: 'contable', label: 'Contable' },
  { id: 'financiero', label: 'Financiero' }
]

const DIAS_SEMANA = [
  { id: 'lunes', label: 'Lunes', corto: 'L' },
  { id: 'martes', label: 'Martes', corto: 'M' },
  { id: 'miercoles', label: 'Miércoles', corto: 'X' },
  { id: 'jueves', label: 'Jueves', corto: 'J' },
  { id: 'viernes', label: 'Viernes', corto: 'V' }
]

const PRIORIDADES = [
  { id: 'baja', label: 'Baja', nivel: 1 },
  { id: 'media', label: 'Media', nivel: 2 },
  { id: 'alta', label: 'Alta', nivel: 3 }
]

const NIVEL = { baja: 1, media: 2, alta: 3 }

const TAREA_VACIA = {
  titulo: '',
  categoria: 'tributacion',
  hora: '17:00',
  dia: 'lunes',
  prioridad: 'media',
  pasos: [],
  completada: false
}

/** Lunes de la semana en curso (sábado y domingo ya miran la semana siguiente). */
function lunesDeLaSemana(hoy = new Date()) {
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const dow = d.getDay() // 0 dom … 6 sáb
  const delta = dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow
  d.setDate(d.getDate() + delta)
  return d
}

/** Número de semana ISO-8601. */
function semanaISO(fecha) {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()))
  const dia = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dia)
  const inicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d - inicio) / 86400000 + 1) / 7)
}

const dd = (n) => String(n).padStart(2, '0')

function Prioridad({ nivel }) {
  const label = PRIORIDADES[nivel - 1]?.label
  return (
    <span className={`wk-prio is-${nivel}`} role="img" aria-label={`Prioridad ${label?.toLowerCase()}`} title={`Prioridad ${label?.toLowerCase()}`}>
      <i /><i /><i />
    </span>
  )
}

function TodoDelDia() {
  const [tareas, setTareas, syncStatus] = useCloudCollection('tarea', 'quadra_tareas_diarias')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [mostrarCompletadas, setMostrarCompletadas] = useState(false)
  const [nuevaTarea, setNuevaTarea] = useState(TAREA_VACIA)
  const [errorTitulo, setErrorTitulo] = useState(false)

  const semana = useMemo(() => {
    const lunes = lunesDeLaSemana()
    const hoy = new Date()
    const hoyKey = `${hoy.getFullYear()}-${hoy.getMonth()}-${hoy.getDate()}`
    const dias = DIAS_SEMANA.map((dia, i) => {
      const f = new Date(lunes)
      f.setDate(lunes.getDate() + i)
      return { ...dia, fecha: f, esHoy: `${f.getFullYear()}-${f.getMonth()}-${f.getDate()}` === hoyKey }
    })
    const viernes = dias[4].fecha
    const mes = (f) => f.toLocaleDateString('es-PY', { month: 'short' }).replace('.', '')
    const rango = lunes.getMonth() === viernes.getMonth()
      ? `${lunes.getDate()}–${viernes.getDate()} ${mes(viernes)}`
      : `${lunes.getDate()} ${mes(lunes)} – ${viernes.getDate()} ${mes(viernes)}`
    return { dias, numero: semanaISO(lunes), rango }
  }, [])

  const abrirFormulario = (diaId) => {
    const hoy = semana.dias.find((d) => d.esHoy)
    setNuevaTarea({ ...TAREA_VACIA, dia: diaId || hoy?.id || 'lunes' })
    setErrorTitulo(false)
    setMostrarFormulario(true)
  }

  const agregarTarea = (e) => {
    e?.preventDefault()
    if (!nuevaTarea.titulo.trim()) {
      setErrorTitulo(true)
      return
    }
    setTareas([...tareas, { id: Date.now(), ...nuevaTarea, titulo: nuevaTarea.titulo.trim(), pasos: [] }])
    setNuevaTarea({ ...TAREA_VACIA, dia: nuevaTarea.dia })
    setMostrarFormulario(false)
  }

  const completarTarea = (tareaId) => {
    setTareas(tareas.map((t) => (t.id === tareaId ? { ...t, completada: !t.completada } : t)))
  }

  const eliminarTarea = (tareaId) => {
    setTareas(tareas.filter((t) => t.id !== tareaId))
  }

  const ordenar = (a, b) => (a.hora || '').localeCompare(b.hora || '') || (NIVEL[b.prioridad] || 0) - (NIVEL[a.prioridad] || 0)

  const tareasCompletadas = tareas.filter((t) => t.completada).length
  const tareasPendientes = tareas.length - tareasCompletadas
  const avance = tareas.length ? Math.round((tareasCompletadas / tareas.length) * 100) : 0

  return (
    <div className="todo-del-dia">
      <PageHead
        title="TO DO de la Semana"
        lede="Organiza tus tareas por día, de lunes a viernes."
        equation={[{ v: 'Avance' }, { op: '=' }, { v: 'C' }, { op: '÷' }, { v: 'N' }, { op: '=' }, { n: `${tareasCompletadas}/${tareas.length}` }]}
        caption={tareas.length ? `${avance} % de la semana ${semana.numero} · ${semana.rango}` : `semana ${semana.numero} · ${semana.rango}`}
        status={syncStatus}
      />

      <div className="wk-toolbar">
        <div className="todo-pestanas" role="tablist" aria-label="Filtrar tareas">
          <button
            role="tab"
            aria-selected={!mostrarCompletadas}
            className={`pestaña ${!mostrarCompletadas ? 'activa' : ''}`}
            onClick={() => setMostrarCompletadas(false)}
          >
            Pendientes <span className="wk-tabcount">{tareasPendientes}</span>
          </button>
          <button
            role="tab"
            aria-selected={mostrarCompletadas}
            className={`pestaña ${mostrarCompletadas ? 'activa' : ''}`}
            onClick={() => setMostrarCompletadas(true)}
          >
            Completadas <span className="wk-tabcount">{tareasCompletadas}</span>
          </button>
        </div>

        {!mostrarFormulario && (
          <button className="btn btn-add-task" onClick={() => abrirFormulario()}>
            <Plus size={16} strokeWidth={1.8} /> Agregar tarea
          </button>
        )}
      </div>

      {mostrarFormulario && (
        <form className="wk-composer" onSubmit={agregarTarea}>
          <div className="wk-composer__main">
            <label className="wk-sr" htmlFor="wk-titulo">Título de la tarea</label>
            <input
              id="wk-titulo"
              className={`wk-composer__title ${errorTitulo ? 'is-invalid' : ''}`}
              type="text"
              value={nuevaTarea.titulo}
              onChange={(e) => { setNuevaTarea({ ...nuevaTarea, titulo: e.target.value }); setErrorTitulo(false) }}
              placeholder="Qué hay que hacer — p. ej. Liquidar IVA de octubre"
              aria-invalid={errorTitulo}
              aria-describedby={errorTitulo ? 'wk-titulo-err' : undefined}
              autoFocus
            />
            {errorTitulo && <p id="wk-titulo-err" className="wk-composer__err">Escribe un título para poder agregar la tarea.</p>}
          </div>

          <div className="wk-composer__params">
            <fieldset className="wk-param">
              <legend>Día</legend>
              <div className="wk-seg">
                {semana.dias.map((d) => (
                  <label key={d.id} className={`wk-seg__opt ${nuevaTarea.dia === d.id ? 'is-on' : ''}`} title={d.label}>
                    <input type="radio" name="wk-dia" value={d.id} checked={nuevaTarea.dia === d.id} onChange={() => setNuevaTarea({ ...nuevaTarea, dia: d.id })} />
                    <span className="wk-seg__k">{d.corto}</span>
                    <span className="wk-seg__d">{dd(d.fecha.getDate())}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="wk-param">
              <legend>Hora</legend>
              <input
                className="wk-time"
                type="time"
                value={nuevaTarea.hora}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, hora: e.target.value })}
                aria-label="Hora"
              />
            </fieldset>

            <fieldset className="wk-param">
              <legend>Prioridad</legend>
              <div className="wk-seg">
                {PRIORIDADES.map((p) => (
                  <label key={p.id} className={`wk-seg__opt ${nuevaTarea.prioridad === p.id ? 'is-on' : ''}`}>
                    <input type="radio" name="wk-prio" value={p.id} checked={nuevaTarea.prioridad === p.id} onChange={() => setNuevaTarea({ ...nuevaTarea, prioridad: p.id })} />
                    <Prioridad nivel={p.nivel} />
                    <span className="wk-seg__t">{p.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="wk-param wk-param--grow">
              <legend>Categoría</legend>
              <div className="wk-cats">
                {CATEGORIAS.map((c) => (
                  <label key={c.id} className={`wk-cat cat-${c.id} ${nuevaTarea.categoria === c.id ? 'is-on' : ''}`}>
                    <input type="radio" name="wk-cat" value={c.id} checked={nuevaTarea.categoria === c.id} onChange={() => setNuevaTarea({ ...nuevaTarea, categoria: c.id })} />
                    {c.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="wk-composer__actions">
            <button type="submit" className="btn btn-primary">Agregar tarea</button>
            <button type="button" className="btn btn-secondary" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="wk-board" role="list" aria-label={`Semana ${semana.numero}`}>
        {semana.dias.map((dia) => {
          const delDia = tareas.filter((t) => t.dia === dia.id)
          const hechas = delDia.filter((t) => t.completada).length
          const visibles = delDia.filter((t) => t.completada === mostrarCompletadas).sort(ordenar)
          const segmentos = [...delDia].sort((a, b) => Number(b.completada) - Number(a.completada))

          return (
            <section key={dia.id} className={`wk-day ${dia.esHoy ? 'is-today' : ''}`} role="listitem" aria-label={`${dia.label} ${dia.fecha.getDate()}`}>
              <header className="wk-day__head">
                <div className="wk-day__name">
                  <h4>{dia.label}</h4>
                  <span className="wk-day__date">{dd(dia.fecha.getDate())}.{dd(dia.fecha.getMonth() + 1)}</span>
                  {dia.esHoy && <span className="wk-day__today">Hoy</span>}
                </div>
                <button type="button" className="wk-day__add" onClick={() => abrirFormulario(dia.id)} aria-label={`Agregar tarea el ${dia.label.toLowerCase()}`} title="Agregar tarea">
                  <Plus size={15} strokeWidth={1.8} />
                </button>
              </header>

              <div className="wk-day__meter" aria-label={`${hechas} de ${delDia.length} completadas`}>
                <span className="wk-day__frac">
                  <b>{hechas}</b><span>/</span>{delDia.length}
                </span>
                <span className="wk-day__segs" aria-hidden="true">
                  {segmentos.length === 0
                    ? <i className="is-empty" />
                    : segmentos.map((t) => <i key={t.id} className={t.completada ? 'is-done' : ''} />)}
                </span>
              </div>

              <ol className="wk-day__list">
                {visibles.length === 0 && (
                  <li className="wk-empty">
                    {mostrarCompletadas ? 'Nada completado' : delDia.length ? 'Todo al día' : 'Sin tareas'}
                  </li>
                )}
                {visibles.map((tarea) => {
                  const cat = CATEGORIAS.find((c) => c.id === tarea.categoria)
                  return (
                    <li key={tarea.id} className={`wk-task cat-${tarea.categoria} ${tarea.completada ? 'is-done' : ''}`}>
                      <span className="wk-task__time">{tarea.hora || '—'}</span>
                      <label className="wk-check">
                        <input type="checkbox" checked={tarea.completada} onChange={() => completarTarea(tarea.id)} aria-label={`Marcar «${tarea.titulo}» como ${tarea.completada ? 'pendiente' : 'completada'}`} />
                        <span aria-hidden="true"><Check size={11} strokeWidth={2.6} /></span>
                      </label>
                      <div className="wk-task__body">
                        <span className="wk-task__title">{tarea.titulo}</span>
                        <span className="wk-task__meta">
                          <span className="wk-task__cat">{cat?.label}</span>
                          <Prioridad nivel={NIVEL[tarea.prioridad] || 2} />
                        </span>
                      </div>
                      <button type="button" className="wk-task__del" onClick={() => eliminarTarea(tarea.id)} aria-label={`Eliminar «${tarea.titulo}»`} title="Eliminar">
                        <X size={13} strokeWidth={1.8} />
                      </button>
                    </li>
                  )
                })}
              </ol>
            </section>
          )
        })}
      </div>
    </div>
  )
}

export default TodoDelDia
