import React, { useState, useEffect } from 'react'
import '../styles/TodoDelDia.css'

const CATEGORIAS = [
  { id: 'tributacion', label: 'Tributación', color: '#FF6B6B' },
  { id: 'laboral', label: 'Laboral', color: '#4ECDC4' },
  { id: 'societarios', label: 'Societarios', color: '#45B7D1' },
  { id: 'contable', label: 'Contable', color: '#FFA07A' },
  { id: 'financiero', label: 'Financiero', color: '#98D8C8' }
]

function TodoDelDia() {
  const [tareas, setTareas] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nuevaTarea, setNuevaTarea] = useState({
    titulo: '',
    categoria: 'tributacion',
    fecha: new Date().toISOString().split('T')[0],
    hora: '17:00',
    pasos: [],
    completada: false
  })
  const [editandoTarea, setEditandoTarea] = useState(null)
  const [nuevoPaso, setNuevoPaso] = useState('')

  // Cargar tareas del localStorage
  useEffect(() => {
    const tareasGuardadas = localStorage.getItem('quadra_tareas_diarias')
    if (tareasGuardadas) {
      setTareas(JSON.parse(tareasGuardadas))
    }
  }, [])

  // Guardar tareas en localStorage
  useEffect(() => {
    localStorage.setItem('quadra_tareas_diarias', JSON.stringify(tareas))
  }, [tareas])

  const agregarTarea = () => {
    if (!nuevaTarea.titulo.trim()) {
      alert('Ingresa un título para la tarea')
      return
    }

    const tarea = {
      id: Date.now(),
      ...nuevaTarea,
      pasos: []
    }

    setTareas([...tareas, tarea])
    setNuevaTarea({
      titulo: '',
      categoria: 'tributacion',
      fecha: new Date().toISOString().split('T')[0],
      hora: '17:00',
      pasos: [],
      completada: false
    })
    setMostrarFormulario(false)
  }

  const agregarPaso = (tareaId) => {
    if (!nuevoPaso.trim()) return

    setTareas(tareas.map(tarea => {
      if (tarea.id === tareaId) {
        return {
          ...tarea,
          pasos: [...tarea.pasos, { id: Date.now(), texto: nuevoPaso, completado: false }]
        }
      }
      return tarea
    }))
    setNuevoPaso('')
  }

  const completarPaso = (tareaId, pasoId) => {
    setTareas(tareas.map(tarea => {
      if (tarea.id === tareaId) {
        return {
          ...tarea,
          pasos: tarea.pasos.map(paso =>
            paso.id === pasoId ? { ...paso, completado: !paso.completado } : paso
          )
        }
      }
      return tarea
    }))
  }

  const completarTarea = (tareaId) => {
    setTareas(tareas.map(tarea =>
      tarea.id === tareaId ? { ...tarea, completada: !tarea.completada } : tarea
    ))
  }

  const eliminarTarea = (tareaId) => {
    setTareas(tareas.filter(tarea => tarea.id !== tareaId))
  }

  const eliminarPaso = (tareaId, pasoId) => {
    setTareas(tareas.map(tarea => {
      if (tarea.id === tareaId) {
        return {
          ...tarea,
          pasos: tarea.pasos.filter(paso => paso.id !== pasoId)
        }
      }
      return tarea
    }))
  }

  const getTareasHoy = () => {
    const hoy = new Date().toISOString().split('T')[0]
    return tareas.filter(t => t.fecha === hoy && !t.completada)
  }

  const getTareasPorCategoria = (categoria) => {
    return getTareasHoy().filter(t => t.categoria === categoria).length
  }

  const getCategoriaInfo = (categoriaId) => {
    return CATEGORIAS.find(c => c.id === categoriaId)
  }

  const tareasHoy = getTareasHoy()
  const tareasCompletadas = tareas.filter(t => t.completada).length

  return (
    <div className="todo-del-dia">
      <div className="todo-header">
        <div className="todo-titulo">
          <h3>📋 TO DO del Día</h3>
          <p className="todo-subtitulo">Tareas pendientes para hoy</p>
        </div>
        <div className="todo-stats">
          <div className="stat-box">
            <span className="stat-number">{tareasHoy.length}</span>
            <span className="stat-label">Pendientes</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{tareasCompletadas}</span>
            <span className="stat-label">Completadas</span>
          </div>
        </div>
      </div>

      {/* Formulario para agregar tarea */}
      {mostrarFormulario && (
        <div className="todo-form">
          <div className="form-group">
            <label>Título de la tarea</label>
            <input
              type="text"
              value={nuevaTarea.titulo}
              onChange={(e) => setNuevaTarea({ ...nuevaTarea, titulo: e.target.value })}
              placeholder="Ej: Revisar comprobantes RG90"
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Categoría</label>
              <select
                value={nuevaTarea.categoria}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, categoria: e.target.value })}
              >
                {CATEGORIAS.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Fecha</label>
              <input
                type="date"
                value={nuevaTarea.fecha}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, fecha: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Hora Límite</label>
              <input
                type="time"
                value={nuevaTarea.hora}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, hora: e.target.value })}
              />
            </div>
          </div>

          <div className="form-buttons">
            <button className="btn btn-primary" onClick={agregarTarea}>Agregar Tarea</button>
            <button className="btn btn-secondary" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Botón para mostrar formulario */}
      {!mostrarFormulario && (
        <button className="btn btn-add-task" onClick={() => setMostrarFormulario(true)}>
          + Agregar Tarea
        </button>
      )}

      {/* Lista de tareas */}
      <div className="tareas-list">
        {tareasHoy.length === 0 ? (
          <div className="tareas-vacio">
            <p>✓ No hay tareas pendientes para hoy</p>
          </div>
        ) : (
          tareasHoy.map(tarea => {
            const categoriaInfo = getCategoriaInfo(tarea.categoria)
            return (
              <div key={tarea.id} className={`tarea-item ${tarea.completada ? 'completada' : ''}`}>
                <div className="tarea-header">
                  <div className="tarea-check">
                    <input
                      type="checkbox"
                      checked={tarea.completada}
                      onChange={() => completarTarea(tarea.id)}
                    />
                  </div>
                  <div className="tarea-info">
                    <h4 className="tarea-titulo">{tarea.titulo}</h4>
                    <div className="tarea-meta">
                      <span
                        className="categoria-badge"
                        style={{ borderLeftColor: categoriaInfo?.color }}
                      >
                        {categoriaInfo?.label}
                      </span>
                      <span className="tarea-hora">⏰ {tarea.hora}</span>
                    </div>
                  </div>
                  <button
                    className="btn-eliminar"
                    onClick={() => eliminarTarea(tarea.id)}
                    title="Eliminar tarea"
                  >
                    ✕
                  </button>
                </div>

                {/* Pasos/Subtareas */}
                <div className="pasos-section">
                  <div className="pasos-list">
                    {tarea.pasos.map(paso => (
                      <div key={paso.id} className={`paso-item ${paso.completado ? 'completado' : ''}`}>
                        <input
                          type="checkbox"
                          checked={paso.completado}
                          onChange={() => completarPaso(tarea.id, paso.id)}
                        />
                        <span className="paso-texto">{paso.texto}</span>
                        <button
                          className="btn-eliminar-paso"
                          onClick={() => eliminarPaso(tarea.id, paso.id)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {editandoTarea === tarea.id && (
                    <div className="agregar-paso-form">
                      <input
                        type="text"
                        value={nuevoPaso}
                        onChange={(e) => setNuevoPaso(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            agregarPaso(tarea.id)
                          }
                        }}
                        placeholder="Agregar un paso..."
                        autoFocus
                      />
                      <button
                        className="btn-paso"
                        onClick={() => agregarPaso(tarea.id)}
                      >
                        ✓
                      </button>
                      <button
                        className="btn-paso-cancelar"
                        onClick={() => {
                          setEditandoTarea(null)
                          setNuevoPaso('')
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <button
                    className="btn-agregar-paso"
                    onClick={() => setEditandoTarea(editandoTarea === tarea.id ? null : tarea.id)}
                  >
                    {editandoTarea === tarea.id ? '✕ Cancelar' : '+ Agregar paso'}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Resumen por categorías */}
      {tareasHoy.length > 0 && (
        <div className="categorias-resumen">
          <h4>Tareas por categoría</h4>
          <div className="categorias-grid">
            {CATEGORIAS.map(cat => {
              const count = getTareasPorCategoria(cat.id)
              return (
                <div key={cat.id} className="categoria-item">
                  <div
                    className="categoria-color"
                    style={{ backgroundColor: cat.color }}
                  ></div>
                  <span className="categoria-count">{cat.label}: {count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default TodoDelDia
