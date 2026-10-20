import React, { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader, Button, Input, Checkbox, Chip, Divider } from '@heroui/react'
import { Plus, Trash2, CheckCircle2 } from 'lucide-react'
import '../styles/TodoDelDia.css'

const CATEGORIAS = [
  { id: 'tributacion', label: 'Tributación', color: '#FF6B6B' },
  { id: 'laboral', label: 'Laboral', color: '#4ECDC4' },
  { id: 'societarios', label: 'Societarios', color: '#45B7D1' },
  { id: 'contable', label: 'Contable', color: '#FFA07A' },
  { id: 'financiero', label: 'Financiero', color: '#98D8C8' }
]

const DIAS_SEMANA = [
  { id: 'lunes', label: 'Lunes' },
  { id: 'martes', label: 'Martes' },
  { id: 'miercoles', label: 'Miércoles' },
  { id: 'jueves', label: 'Jueves' },
  { id: 'viernes', label: 'Viernes' }
]

function TodoDelDia() {
  const [tareas, setTareas] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [mostrarCompletadas, setMostrarCompletadas] = useState(false)
  const [nuevaTarea, setNuevaTarea] = useState({
    titulo: '',
    categoria: 'tributacion',
    hora: '17:00',
    dia: 'lunes',
    prioridad: 'media',
    pasos: [],
    completada: false
  })
  const [editandoTarea, setEditandoTarea] = useState(null)
  const [nuevoPaso, setNuevoPaso] = useState('')

  useEffect(() => {
    const tareasGuardadas = localStorage.getItem('quadra_tareas_diarias')
    if (tareasGuardadas) {
      setTareas(JSON.parse(tareasGuardadas))
    }
  }, [])

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
      hora: '17:00',
      dia: 'lunes',
      prioridad: 'media',
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

  const getTareasPorDia = (diaId) => {
    return mostrarCompletadas
      ? tareas.filter(t => t.dia === diaId && t.completada)
      : tareas.filter(t => t.dia === diaId && !t.completada)
  }

  const getTareas3Principales = (diaId) => {
    return getTareasPorDia(diaId).filter(t => t.prioridad === 'alta').slice(0, 3)
  }

  const getTareasRestantes = (diaId) => {
    const principales = getTareasPorDia(diaId).filter(t => t.prioridad === 'alta').slice(0, 3)
    return getTareasPorDia(diaId).filter(t => !principales.includes(t))
  }

  const getCategoriaInfo = (categoriaId) => {
    return CATEGORIAS.find(c => c.id === categoriaId)
  }

  const tareasCompletadas = tareas.filter(t => t.completada).length
  const tareasPendientes = tareas.filter(t => !t.completada).length

  return (
    <div className="todo-del-dia">
      <div className="todo-header">
        <div className="todo-titulo">
          <h3>📋 TO DO de la Semana</h3>
          <p className="todo-subtitulo">Organiza tus tareas por día (Lunes a Viernes)</p>
        </div>
        <div className="todo-pestanas">
          <button
            className={`pestaña ${!mostrarCompletadas ? 'activa' : ''}`}
            onClick={() => setMostrarCompletadas(false)}
          >
            Pendientes ({tareasPendientes})
          </button>
          <button
            className={`pestaña ${mostrarCompletadas ? 'activa' : ''}`}
            onClick={() => setMostrarCompletadas(true)}
          >
            Completadas ({tareasCompletadas})
          </button>
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
              placeholder="Ej: Revisar comprobantes"
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
              <label>Día</label>
              <select
                value={nuevaTarea.dia}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, dia: e.target.value })}
              >
                {DIAS_SEMANA.map(dia => (
                  <option key={dia.id} value={dia.id}>{dia.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Prioridad</label>
              <select
                value={nuevaTarea.prioridad}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, prioridad: e.target.value })}
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>

            <div className="form-group">
              <label>Hora</label>
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

      {/* Grid de días */}
      <div className="dias-grid">
        {DIAS_SEMANA.map(dia => {
          const tareasDelDia = getTareasPorDia(dia.id)
          const principales = getTareas3Principales(dia.id)
          const restantes = getTareasRestantes(dia.id)

          return (
            <div key={dia.id} className="dia-card">
              <div className="dia-header">
                <h4>{dia.label}</h4>
                <span className="contador">{tareasDelDia.length}</span>
              </div>

              {tareasDelDia.length === 0 ? (
                <div className="tareas-vacio">
                  <p>Sin tareas</p>
                </div>
              ) : (
                <>
                  {/* Tareas principales (3 primeras) */}
                  {principales.length > 0 && (
                    <div className="tareas-principales">
                      <span className="label-principales">⭐ Prioritarias</span>
                      {principales.map(tarea => {
                        const categoriaInfo = getCategoriaInfo(tarea.categoria)
                        return (
                          <div key={tarea.id} className={`tarea-item ${tarea.completada ? 'completada' : ''}`}>
                            <input
                              type="checkbox"
                              checked={tarea.completada}
                              onChange={() => completarTarea(tarea.id)}
                            />
                            <div className="tarea-info">
                              <span className="tarea-titulo">{tarea.titulo}</span>
                              <div className="tarea-meta">
                                <span className="categoria-badge" style={{ borderLeftColor: categoriaInfo?.color }}>
                                  {categoriaInfo?.label}
                                </span>
                                <span className="tarea-hora">⏰ {tarea.hora}</span>
                              </div>
                            </div>
                            <button
                              className="btn-eliminar"
                              onClick={() => eliminarTarea(tarea.id)}
                            >
                              ✕
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Tareas restantes */}
                  {restantes.length > 0 && (
                    <div className="tareas-restantes">
                      <details>
                        <summary className="label-restantes">Más ({restantes.length})</summary>
                        {restantes.map(tarea => {
                          const categoriaInfo = getCategoriaInfo(tarea.categoria)
                          return (
                            <div key={tarea.id} className={`tarea-item ${tarea.completada ? 'completada' : ''}`}>
                              <input
                                type="checkbox"
                                checked={tarea.completada}
                                onChange={() => completarTarea(tarea.id)}
                              />
                              <div className="tarea-info">
                                <span className="tarea-titulo">{tarea.titulo}</span>
                                <div className="tarea-meta">
                                  <span className="categoria-badge" style={{ borderLeftColor: categoriaInfo?.color }}>
                                    {categoriaInfo?.label}
                                  </span>
                                  <span className="tarea-hora">⏰ {tarea.hora}</span>
                                </div>
                              </div>
                              <button
                                className="btn-eliminar"
                                onClick={() => eliminarTarea(tarea.id)}
                              >
                                ✕
                              </button>
                            </div>
                          )
                        })}
                      </details>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TodoDelDia
