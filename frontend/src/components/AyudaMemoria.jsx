import React, { useMemo, useState } from 'react'
import PageHead, { Figures } from './PageHead'
import { useCloudCollection } from '../services/useCloudCollection'
import { Plus, X, Check, CalendarPlus, Copy, Repeat } from 'lucide-react'
import '../styles/ClienteAgenda.css'

const CATEGORIAS = [
  { id: 'tributacion', label: 'Tributación' },
  { id: 'laboral', label: 'Laboral' },
  { id: 'societarios', label: 'Societarios' },
  { id: 'contable', label: 'Contable' },
  { id: 'financiero', label: 'Financiero' }
]

const FRECUENCIAS = [
  { id: 'mensual', label: 'Todos los meses' },
  { id: 'unica', label: 'Un mes puntual' }
]

const DIAS_SEMANA = [
  { id: 'lunes', label: 'Lunes' },
  { id: 'martes', label: 'Martes' },
  { id: 'miercoles', label: 'Miércoles' },
  { id: 'jueves', label: 'Jueves' },
  { id: 'viernes', label: 'Viernes' }
]

const dd = (n) => String(n).padStart(2, '0')
const claveMes = (d) => `${d.getFullYear()}-${dd(d.getMonth() + 1)}`
const nombreMes = (clave) => {
  const [y, m] = clave.split('-').map(Number)
  const txt = new Date(y, m - 1, 1).toLocaleDateString('es-PY', { month: 'long', year: 'numeric' })
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}
const moverMes = (clave, n) => {
  const [y, m] = clave.split('-').map(Number)
  return claveMes(new Date(y, m - 1 + n, 1))
}

/** Meses del ejercicio económico, de apertura a cierre (o enero–diciembre). */
function mesesDelEjercicio({ ejercicio, apertura, cierre }) {
  const y = Number(ejercicio) || new Date().getFullYear()
  const desde = apertura ? new Date(`${apertura}T00:00:00`) : new Date(y, 0, 1)
  const hasta = cierre ? new Date(`${cierre}T00:00:00`) : new Date(y, 11, 31)
  const meses = []
  const d = new Date(desde.getFullYear(), desde.getMonth(), 1)
  while (d <= hasta && meses.length < 24) {
    meses.push(claveMes(d))
    d.setMonth(d.getMonth() + 1)
  }
  return meses.length ? meses : [claveMes(new Date(y, 0, 1))]
}

const nuevaVacia = (mesInicial) => ({
  titulo: '',
  frecuencia: 'mensual',
  mes: mesInicial,
  diaVence: '',
  categoria: 'tributacion',
  notas: ''
})

/**
 * Ayuda memoria: todo lo que hay que hacer sobre un cliente a lo largo del
 * ejercicio económico. Tareas mensuales (se tildan mes a mes) o de un mes puntual.
 */
function AyudaMemoria({ cliente }) {
  const [todos, setTodos, syncStatus] = useCloudCollection('recordatorio', 'quadra_ayuda_memoria')
  const [tareasSemana, setTareasSemana] = useCloudCollection('tarea', 'quadra_tareas_diarias')

  const clienteId = String(cliente.clienteId)
  const ejercicio = Number(cliente.ejercicio) || new Date().getFullYear()
  const meses = useMemo(() => mesesDelEjercicio(cliente), [cliente])
  const mesActual = claveMes(new Date())
  const mesInicial = meses.includes(mesActual) ? mesActual : meses[0]

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nueva, setNueva] = useState(() => nuevaVacia(mesInicial))
  const [errorTitulo, setErrorTitulo] = useState(false)
  const [soloPendientes, setSoloPendientes] = useState(false)
  const [agendando, setAgendando] = useState(null) // { id, mes }
  const [aviso, setAviso] = useState('')

  const delCliente = todos.filter((r) => String(r.clienteId) === clienteId)
  const items = delCliente.filter((r) => Number(r.ejercicio) === ejercicio)
  const anteriores = delCliente.filter((r) => Number(r.ejercicio) === ejercicio - 1)

  const estaHecha = (r, mes) => (r.frecuencia === 'mensual' ? (r.hechas || []).includes(mes) : !!r.completada)

  // cada fila del tablero = (recordatorio, mes)
  const porMes = useMemo(() => meses.map((mes) => {
    const filas = items
      .filter((r) => (r.frecuencia === 'mensual' ? true : r.mes === mes))
      .map((r) => ({ r, hecha: estaHecha(r, mes) }))
      .sort((a, b) => (Number(a.r.diaVence) || 99) - (Number(b.r.diaVence) || 99) || a.r.titulo.localeCompare(b.r.titulo, 'es'))
    return { mes, filas, hechas: filas.filter((f) => f.hecha).length }
  }), [items, meses]) // eslint-disable-line react-hooks/exhaustive-deps

  const total = porMes.reduce((n, m) => n + m.filas.length, 0)
  const hechas = porMes.reduce((n, m) => n + m.hechas, 0)
  const pendientesHastaHoy = porMes
    .filter((m) => m.mes <= mesActual)
    .reduce((n, m) => n + (m.filas.length - m.hechas), 0)

  const abrirFormulario = (mes) => {
    setNueva({ ...nuevaVacia(mes || mesInicial), frecuencia: mes ? 'unica' : 'mensual' })
    setErrorTitulo(false)
    setMostrarFormulario(true)
  }

  const agregar = (e) => {
    e?.preventDefault()
    if (!nueva.titulo.trim()) { setErrorTitulo(true); return }
    const dia = Math.min(31, Math.max(1, parseInt(nueva.diaVence, 10) || 0)) || null
    setTodos([...todos, {
      id: `${Date.now()}`,
      clienteId,
      clienteNombre: cliente.razonSocial,
      ejercicio,
      titulo: nueva.titulo.trim(),
      frecuencia: nueva.frecuencia,
      mes: nueva.frecuencia === 'unica' ? nueva.mes : null,
      diaVence: dia,
      categoria: nueva.categoria,
      notas: nueva.notas.trim(),
      completada: false,
      hechas: [],
      creadaEn: new Date().toISOString()
    }])
    setNueva({ ...nuevaVacia(nueva.mes), frecuencia: nueva.frecuencia, categoria: nueva.categoria })
    setMostrarFormulario(false)
  }

  const alternar = (r, mes) => {
    setTodos(todos.map((x) => {
      if (x.id !== r.id) return x
      if (x.frecuencia === 'mensual') {
        const set = new Set(x.hechas || [])
        set.has(mes) ? set.delete(mes) : set.add(mes)
        return { ...x, hechas: [...set].sort() }
      }
      return { ...x, completada: !x.completada }
    }))
  }

  const eliminar = (r) => {
    const msg = r.frecuencia === 'mensual'
      ? `¿Eliminar «${r.titulo}»? Es una tarea mensual: se quita de todos los meses del ejercicio.`
      : `¿Eliminar «${r.titulo}»?`
    if (window.confirm(msg)) setTodos(todos.filter((x) => x.id !== r.id))
  }

  const copiarAnterior = () => {
    const base = Date.now()
    const copias = anteriores.map((r, i) => ({
      ...r,
      id: `${base}-${i}`,
      ejercicio,
      mes: r.mes ? moverMes(r.mes, 12) : null,
      completada: false,
      hechas: [],
      creadaEn: new Date().toISOString()
    }))
    setTodos([...todos, ...copias])
    setAviso(`Se copiaron ${copias.length} tareas del ejercicio ${ejercicio - 1}.`)
  }

  const agendarEnSemana = (r, dia) => {
    setTareasSemana([...tareasSemana, {
      id: Date.now(),
      titulo: r.titulo,
      categoria: r.categoria,
      hora: '09:00',
      dia,
      prioridad: 'media',
      pasos: [],
      completada: false,
      clienteId,
      clienteNombre: cliente.razonSocial,
      recordatorioId: r.id
    }])
    setAgendando(null)
    setAviso(`«${r.titulo}» quedó agendada el ${DIAS_SEMANA.find((d) => d.id === dia)?.label.toLowerCase()} en tu semana.`)
  }

  return (
    <div className="ca-page">
      <PageHead
        title="Ayuda memoria del ejercicio"
        lede={`Todo lo que tenés que hacer sobre ${cliente.razonSocial} durante el ejercicio ${ejercicio}. Las tareas mensuales se tildan mes a mes.`}
        equation={[{ n: `${hechas} de ${total} ` }, { v: 'tareas hechas' }]}
        caption={`ejercicio ${ejercicio} · ${nombreMes(meses[0]).toLowerCase()} – ${nombreMes(meses[meses.length - 1]).toLowerCase()}`}
        status={syncStatus}
      />

      <Figures items={[
        { label: 'Tareas en el ejercicio', value: total },
        { label: 'Hechas', value: hechas, tone: hechas ? 'ok' : undefined },
        { label: 'Pendientes hasta este mes', value: pendientesHastaHoy, tone: pendientesHastaHoy ? 'err' : undefined },
        { label: 'Avance', value: `${total ? Math.round((hechas / total) * 100) : 0} %` }
      ]} />

      {aviso && (
        <p className="ca-aviso" role="status">
          {aviso}
          <button type="button" onClick={() => setAviso('')} aria-label="Cerrar aviso"><X size={14} strokeWidth={1.8} /></button>
        </p>
      )}

      <div className="wk-toolbar">
        <div className="todo-pestanas" role="tablist" aria-label="Filtrar">
          <button role="tab" aria-selected={!soloPendientes} className={`pestaña ${!soloPendientes ? 'activa' : ''}`} onClick={() => setSoloPendientes(false)}>Todas</button>
          <button role="tab" aria-selected={soloPendientes} className={`pestaña ${soloPendientes ? 'activa' : ''}`} onClick={() => setSoloPendientes(true)}>Pendientes</button>
        </div>
        {!mostrarFormulario && (
          <button className="btn btn-add-task" onClick={() => abrirFormulario()}>
            <Plus size={16} strokeWidth={1.8} /> Agregar tarea
          </button>
        )}
      </div>

      {mostrarFormulario && (
        <form className="wk-composer" onSubmit={agregar}>
          <div className="wk-composer__main">
            <label className="wk-sr" htmlFor="am-titulo">Tarea</label>
            <input
              id="am-titulo"
              className={`wk-composer__title ${errorTitulo ? 'is-invalid' : ''}`}
              type="text"
              value={nueva.titulo}
              onChange={(e) => { setNueva({ ...nueva, titulo: e.target.value }); setErrorTitulo(false) }}
              placeholder="Qué hay que hacer — p. ej. Presentar IVA (Form. 120)"
              aria-invalid={errorTitulo}
              autoFocus
            />
            {errorTitulo && <p className="wk-composer__err">Escribí qué hay que hacer para agregar la tarea.</p>}
          </div>

          <div className="wk-composer__params">
            <fieldset className="wk-param">
              <legend>Frecuencia</legend>
              <div className="wk-seg">
                {FRECUENCIAS.map((f) => (
                  <label key={f.id} className={`wk-seg__opt ${nueva.frecuencia === f.id ? 'is-on' : ''}`}>
                    <input type="radio" name="am-frec" checked={nueva.frecuencia === f.id} onChange={() => setNueva({ ...nueva, frecuencia: f.id })} />
                    <span className="wk-seg__t">{f.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {nueva.frecuencia === 'unica' && (
              <fieldset className="wk-param">
                <legend>Mes</legend>
                <select className="wk-client-select" value={nueva.mes} onChange={(e) => setNueva({ ...nueva, mes: e.target.value })} aria-label="Mes">
                  {meses.map((m) => <option key={m} value={m}>{nombreMes(m)}</option>)}
                </select>
              </fieldset>
            )}

            <fieldset className="wk-param">
              <legend>Vence el día</legend>
              <input
                className="wk-client-select ca-dia"
                type="number"
                min="1"
                max="31"
                inputMode="numeric"
                placeholder="—"
                value={nueva.diaVence}
                onChange={(e) => setNueva({ ...nueva, diaVence: e.target.value })}
                aria-label="Día de vencimiento"
              />
            </fieldset>

            <fieldset className="wk-param wk-param--grow">
              <legend>Categoría</legend>
              <div className="wk-cats">
                {CATEGORIAS.map((c) => (
                  <label key={c.id} className={`wk-cat cat-${c.id} ${nueva.categoria === c.id ? 'is-on' : ''}`}>
                    <input type="radio" name="am-cat" checked={nueva.categoria === c.id} onChange={() => setNueva({ ...nueva, categoria: c.id })} />
                    {c.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="wk-composer__main">
            <label className="wk-sr" htmlFor="am-notas">Notas</label>
            <textarea
              id="am-notas"
              className="ca-textarea"
              rows={2}
              value={nueva.notas}
              onChange={(e) => setNueva({ ...nueva, notas: e.target.value })}
              placeholder="Notas opcionales: documentos a pedir, a quién contactar…"
            />
          </div>

          <div className="wk-composer__actions">
            <button type="submit" className="btn btn-primary">Agregar tarea</button>
            <button type="button" className="btn btn-secondary" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {items.length === 0 && !mostrarFormulario && (
        <div className="ca-empty">
          <p className="ca-empty__title">Todavía no hay tareas para el ejercicio {ejercicio}</p>
          <p>Anotá acá todo lo que hacés con este cliente durante el año: declaraciones mensuales, cierres, balances, renovaciones.</p>
          <div className="ca-empty__actions">
            <button type="button" className="q-btn q-btn--primary" onClick={() => abrirFormulario()}>
              <Plus size={16} strokeWidth={1.8} /> Agregar la primera tarea
            </button>
            {anteriores.length > 0 && (
              <button type="button" className="q-btn q-btn--line" onClick={copiarAnterior}>
                <Copy size={16} strokeWidth={1.8} /> Copiar {anteriores.length} tareas del ejercicio {ejercicio - 1}
              </button>
            )}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <ol className="ca-months">
          {porMes.map(({ mes, filas, hechas: h }) => {
            const visibles = soloPendientes ? filas.filter((f) => !f.hecha) : filas
            const esActual = mes === mesActual
            const pasado = mes < mesActual
            if (soloPendientes && visibles.length === 0) return null
            return (
              <li key={mes} className={`ca-month ${esActual ? 'is-current' : ''} ${pasado ? 'is-past' : ''}`}>
                <header className="ca-month__head">
                  <h4>{nombreMes(mes)}</h4>
                  {esActual && <span className="wk-day__today">Este mes</span>}
                  <span className="ca-month__count">
                    <b>{h}</b>/{filas.length}
                  </span>
                  <span className="ca-month__bar" aria-hidden="true">
                    <i style={{ width: `${filas.length ? (h / filas.length) * 100 : 0}%` }} />
                  </span>
                  <button type="button" className="wk-day__add" onClick={() => abrirFormulario(mes)} aria-label={`Agregar tarea en ${nombreMes(mes)}`} title="Agregar tarea en este mes">
                    <Plus size={15} strokeWidth={1.8} />
                  </button>
                </header>

                <ul className="ca-list">
                  {visibles.length === 0 && <li className="wk-empty">Sin tareas este mes</li>}
                  {visibles.map(({ r, hecha }) => {
                    const cat = CATEGORIAS.find((c) => c.id === r.categoria)
                    const vencida = !hecha && r.diaVence && (pasado || (esActual && new Date().getDate() > r.diaVence))
                    const abierto = agendando?.id === r.id && agendando?.mes === mes
                    return (
                      <li key={`${r.id}-${mes}`} className={`ca-item cat-${r.categoria} ${hecha ? 'is-done' : ''}`}>
                        <label className="wk-check">
                          <input type="checkbox" checked={hecha} onChange={() => alternar(r, mes)} aria-label={`Marcar «${r.titulo}» de ${nombreMes(mes)} como ${hecha ? 'pendiente' : 'hecha'}`} />
                          <span aria-hidden="true"><Check size={11} strokeWidth={2.6} /></span>
                        </label>
                        <div className="ca-item__body">
                          <span className="ca-item__title">{r.titulo}</span>
                          <span className="ca-item__meta">
                            <span className="wk-task__cat">{cat?.label}</span>
                            {r.frecuencia === 'mensual' && <span className="ca-pill"><Repeat size={10} strokeWidth={2} aria-hidden="true" /> Mensual</span>}
                            {r.diaVence && <span className={`ca-pill ${vencida ? 'is-late' : ''}`}>{vencida ? 'Venció' : 'Vence'} el {r.diaVence}</span>}
                          </span>
                          {r.notas && <span className="ca-item__notes">{r.notas}</span>}
                          {abierto && (
                            <div className="ca-schedule" role="group" aria-label="Elegí el día de la semana">
                              <span>Agendar en esta semana:</span>
                              {DIAS_SEMANA.map((d) => (
                                <button key={d.id} type="button" className="ca-schedule__day" onClick={() => agendarEnSemana(r, d.id)}>{d.label}</button>
                              ))}
                              <button type="button" className="ca-schedule__cancel" onClick={() => setAgendando(null)}>Cancelar</button>
                            </div>
                          )}
                        </div>
                        <div className="ca-item__actions">
                          {!hecha && (
                            <button type="button" className="ca-icon" onClick={() => setAgendando(abierto ? null : { id: r.id, mes })} title="Agendar en la semana" aria-label={`Agendar «${r.titulo}» en la semana`}>
                              <CalendarPlus size={14} strokeWidth={1.8} />
                            </button>
                          )}
                          <button type="button" className="ca-icon ca-icon--del" onClick={() => eliminar(r)} title="Eliminar" aria-label={`Eliminar «${r.titulo}»`}>
                            <X size={14} strokeWidth={1.8} />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

export default AyudaMemoria
