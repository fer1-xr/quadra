import React, { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import jsPDF from 'jspdf'
import { Card, CardBody, CardHeader, Button, Input, Select, SelectItem, Spinner, Progress, Chip } from '@heroui/react'
import { Plus, Trash2, Download, Target } from 'lucide-react'
import '../styles/MetasAnuales.css'
import Toast from './Toast'

const TIPOS_META = [
  { id: 'educativo', label: 'Educativo', icon: '🎓', color: '#4ECDC4' },
  { id: 'profesional', label: 'Profesional', icon: '💼', color: '#FF6B6B' },
  { id: 'financiero', label: 'Financiero', icon: '💰', color: '#95E1D3' }
]

const PERIODOS = [
  { id: 'anual', label: 'Anual' },
  { id: 'mensual', label: 'Mensual' }
]

function MetasAnuales() {
  const [metas, setMetas] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [periodo, setPeriodo] = useState('anual')
  const [nuevaMeta, setNuevaMeta] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'profesional',
    periodo: 'anual',
    fechaLimite: '',
    comoSeAlcanzara: '',
    imagenUrl: '',
    montoFinanciero: '',
    progreso: 0,
    completada: false
  })
  const [editandoId, setEditandoId] = useState(null)
  const [notificacion, setNotificacion] = useState(null)

  // Cargar metas del localStorage
  useEffect(() => {
    const metasGuardadas = localStorage.getItem('quadra_metas_anuales')
    if (metasGuardadas) {
      setMetas(JSON.parse(metasGuardadas))
    }
  }, [])

  // Guardar metas en localStorage
  useEffect(() => {
    localStorage.setItem('quadra_metas_anuales', JSON.stringify(metas))
  }, [metas])

  const mostrarNotificacion = (mensaje, tipo = 'success') => {
    setNotificacion({ mensaje, tipo })
  }

  const calcularAhorroMensual = (monto, fechaLimite) => {
    if (!monto || !fechaLimite) return null

    const hoy = new Date()
    const fecha = new Date(fechaLimite)
    const diasRestantes = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24))
    const mesesRestantes = Math.ceil(diasRestantes / 30)
    const semanasRestantes = Math.ceil(diasRestantes / 7)

    if (mesesRestantes <= 0) {
      return { error: 'La fecha límite debe ser en el futuro' }
    }

    const ahorroMensual = (monto / mesesRestantes).toFixed(2)
    const ahorroSemanal = (monto / semanasRestantes).toFixed(2)
    const ahorroDiario = (monto / diasRestantes).toFixed(2)

    return {
      montoTotal: parseFloat(monto),
      diasRestantes,
      mesesRestantes,
      semanasRestantes,
      ahorroMensual: parseFloat(ahorroMensual),
      ahorroSemanal: parseFloat(ahorroSemanal),
      ahorroDiario: parseFloat(ahorroDiario)
    }
  }

  const exportarPDF = () => {
    const doc = new jsPDF()
    const metasFiltradas = metas.filter(m => m.periodo === periodo)

    doc.setFontSize(20)
    doc.text(`Resumen de Metas ${periodo === 'anual' ? 'Anuales' : 'Mensuales'}`, 20, 20)

    doc.setFontSize(10)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-PY')}`, 20, 30)
    doc.text(`Total de metas: ${metasFiltradas.length}`, 20, 37)
    doc.text(`Completadas: ${metasFiltradas.filter(m => m.completada).length}`, 20, 44)

    let yPosition = 55

    metasFiltradas.forEach((meta, index) => {
      const tipo = TIPOS_META.find(t => t.id === meta.tipo)

      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(12)
      doc.setTextColor(meta.completada ? 150 : 0)
      doc.text(`${index + 1}. ${meta.titulo}`, 20, yPosition)
      yPosition += 8

      doc.setFontSize(9)
      doc.setTextColor(100)
      doc.text(`Tipo: ${tipo.label} | Estado: ${meta.completada ? 'Completada' : 'Pendiente'}`, 25, yPosition)
      yPosition += 6

      doc.text(`Descripción: ${meta.descripcion.substring(0, 60)}...`, 25, yPosition)
      yPosition += 6

      doc.text(`Fecha Límite: ${new Date(meta.fechaLimite).toLocaleDateString('es-PY')}`, 25, yPosition)
      yPosition += 6

      doc.text(`Progreso: ${meta.progreso}%`, 25, yPosition)
      yPosition += 8

      if (meta.tipo === 'financiero' && meta.montoFinanciero) {
        const ahorro = calcularAhorroMensual(meta.montoFinanciero, meta.fechaLimite)
        if (ahorro && !ahorro.error) {
          doc.setTextColor(80)
          doc.text(`Ahorro Mensual: $${ahorro.ahorroMensual.toLocaleString('es-PY')}`, 25, yPosition)
          yPosition += 6
        }
      }

      yPosition += 3
    })

    doc.save(`metas-${periodo}-${Date.now()}.pdf`)
    mostrarNotificacion('PDF exportado exitosamente', 'success')
  }

  const agregarMeta = () => {
    if (!nuevaMeta.titulo.trim() || !nuevaMeta.descripcion.trim() || !nuevaMeta.fechaLimite) {
      mostrarNotificacion('Completa todos los campos requeridos', 'warning')
      return
    }

    if (nuevaMeta.tipo === 'financiero' && !nuevaMeta.montoFinanciero) {
      mostrarNotificacion('Para metas financieras, ingresa el monto objetivo', 'warning')
      return
    }

    const meta = {
      id: editandoId || Date.now(),
      ...nuevaMeta,
      montoFinanciero: nuevaMeta.tipo === 'financiero' ? parseFloat(nuevaMeta.montoFinanciero) : null
    }

    if (editandoId) {
      setMetas(metas.map(m => m.id === editandoId ? meta : m))
      setEditandoId(null)
      mostrarNotificacion('Meta actualizada correctamente', 'success')
    } else {
      setMetas([...metas, meta])
      mostrarNotificacion('Meta creada exitosamente', 'success')
    }

    setNuevaMeta({
      titulo: '',
      descripcion: '',
      tipo: 'profesional',
      periodo: 'anual',
      fechaLimite: '',
      comoSeAlcanzara: '',
      imagenUrl: '',
      montoFinanciero: '',
      progreso: 0,
      completada: false
    })
    setMostrarFormulario(false)
  }

  const eliminarMeta = (id) => {
    setMetas(metas.filter(m => m.id !== id))
    mostrarNotificacion('Meta eliminada', 'info')
  }

  const actualizarProgreso = (id, progreso) => {
    setMetas(metas.map(m => m.id === id ? { ...m, progreso: Math.min(100, Math.max(0, progreso)) } : m))
  }

  const completarMeta = (id) => {
    setMetas(metas.map(m => {
      if (m.id === id) {
        const nuevaCompletada = !m.completada
        if (nuevaCompletada) {
          mostrarNotificacion('¡Felicitaciones! Meta completada 🎉', 'success')
        }
        return { ...m, completada: nuevaCompletada, progreso: nuevaCompletada ? 100 : m.progreso }
      }
      return m
    }))
  }

  const editarMeta = (meta) => {
    setNuevaMeta(meta)
    setEditandoId(meta.id)
    setMostrarFormulario(true)
  }

  const metasFiltradas = metas.filter(m => m.periodo === periodo)
  const tipoInfo = (tipoId) => TIPOS_META.find(t => t.id === tipoId)

  const metasCompletadas = metasFiltradas.filter(m => m.completada).length

  // Datos para gráficos
  const datosProgresoGeneral = [
    { name: 'Completadas', value: metasCompletadas, color: '#4ECDC4' },
    { name: 'Pendientes', value: metasFiltradas.length - metasCompletadas, color: '#FFD93D' }
  ]

  const datosPorTipo = TIPOS_META.map(tipo => ({
    name: tipo.label,
    count: metasFiltradas.filter(m => m.tipo === tipo.id).length,
    fill: tipo.color
  }))

  const promedioProgreso = metasFiltradas.length > 0
    ? Math.round(metasFiltradas.reduce((sum, m) => sum + m.progreso, 0) / metasFiltradas.length)
    : 0

  return (
    <div className="metas-anuales">
      {notificacion && (
        <Toast
          message={notificacion.mensaje}
          type={notificacion.tipo}
          onClose={() => setNotificacion(null)}
        />
      )}

      <div className="metas-header">
        <div className="metas-titulo">
          <h3>🎯 Metas {periodo === 'anual' ? 'Anuales' : 'Mensuales'}</h3>
          <p className="metas-subtitulo">Establece y alcanza tus objetivos</p>
        </div>
        <div className="metas-stats">
          <div className="stat-box">
            <span className="stat-number">{metasFiltradas.length}</span>
            <span className="stat-label">Metas</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{metasCompletadas}</span>
            <span className="stat-label">Completadas</span>
          </div>
        </div>
      </div>

      {/* Selector de período y botones de acción */}
      <div className="periodo-acciones">
        <div className="periodo-selector">
          {PERIODOS.map(p => (
            <button
              key={p.id}
              className={`periodo-btn ${periodo === p.id ? 'activo' : ''}`}
              onClick={() => setPeriodo(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button className="btn btn-exportar" onClick={exportarPDF}>
          📄 Exportar PDF
        </button>
      </div>

      {/* Gráficos de Progreso */}
      {metasFiltradas.length > 0 && (
        <div className="graficos-section">
          <div className="grafico-container">
            <h4>Progreso General</h4>
            <div className="progreso-general">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={datosProgresoGeneral}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {datosProgresoGeneral.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="estadistica-box">
              <span className="estadistica-label">Promedio de Progreso</span>
              <span className="estadistica-valor">{promedioProgreso}%</span>
            </div>
          </div>

          <div className="grafico-container">
            <h4>Metas por Tipo</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={datosPorTipo}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {datosPorTipo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Formulario para agregar meta */}
      {mostrarFormulario && (
        <div className="meta-form">
          <div className="form-group">
            <label>Título de la Meta *</label>
            <input
              type="text"
              value={nuevaMeta.titulo}
              onChange={(e) => setNuevaMeta({ ...nuevaMeta, titulo: e.target.value })}
              placeholder="Ej: Obtener certificación en Excel Avanzado"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Descripción *</label>
            <textarea
              value={nuevaMeta.descripcion}
              onChange={(e) => setNuevaMeta({ ...nuevaMeta, descripcion: e.target.value })}
              placeholder="Describe tu meta en detalle..."
              rows="3"
            ></textarea>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tipo de Meta *</label>
              <select
                value={nuevaMeta.tipo}
                onChange={(e) => setNuevaMeta({ ...nuevaMeta, tipo: e.target.value })}
              >
                {TIPOS_META.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>{tipo.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Fecha Límite *</label>
              <input
                type="date"
                value={nuevaMeta.fechaLimite}
                onChange={(e) => setNuevaMeta({ ...nuevaMeta, fechaLimite: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>¿Cómo se alcanzará? (Estrategia) *</label>
            <textarea
              value={nuevaMeta.comoSeAlcanzara}
              onChange={(e) => setNuevaMeta({ ...nuevaMeta, comoSeAlcanzara: e.target.value })}
              placeholder="Describe los pasos o acciones específicas para alcanzar esta meta..."
              rows="3"
            ></textarea>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>URL de Imagen (Cabecera)</label>
              <input
                type="url"
                value={nuevaMeta.imagenUrl}
                onChange={(e) => setNuevaMeta({ ...nuevaMeta, imagenUrl: e.target.value })}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            </div>

            {nuevaMeta.tipo === 'financiero' && (
              <div className="form-group">
                <label>Monto Objetivo ($) *</label>
                <input
                  type="number"
                  value={nuevaMeta.montoFinanciero}
                  onChange={(e) => setNuevaMeta({ ...nuevaMeta, montoFinanciero: e.target.value })}
                  placeholder="Ej: 5000"
                  step="100"
                />
              </div>
            )}
          </div>

          <div className="form-buttons">
            <button className="btn btn-primary" onClick={agregarMeta}>
              {editandoId ? 'Actualizar Meta' : 'Crear Meta'}
            </button>
            <button className="btn btn-secondary" onClick={() => {
              setMostrarFormulario(false)
              setEditandoId(null)
              setNuevaMeta({
                titulo: '',
                descripcion: '',
                tipo: 'profesional',
                periodo: 'anual',
                fechaLimite: '',
                comoSeAlcanzara: '',
                imagenUrl: '',
                montoFinanciero: '',
                progreso: 0,
                completada: false
              })
            }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Botón para mostrar formulario */}
      {!mostrarFormulario && (
        <button className="btn btn-add-meta" onClick={() => setMostrarFormulario(true)}>
          + Crear Nueva Meta
        </button>
      )}

      {/* Grid de metas */}
      <div className="metas-grid">
        {metasFiltradas.length === 0 ? (
          <div className="metas-vacio">
            <p>No hay metas {periodo === 'anual' ? 'anuales' : 'mensuales'} aún</p>
          </div>
        ) : (
          metasFiltradas.map(meta => {
            const tipo = tipoInfo(meta.tipo)
            const ahorroData = meta.tipo === 'financiero' ? calcularAhorroMensual(meta.montoFinanciero, meta.fechaLimite) : null

            return (
              <div key={meta.id} className={`meta-card ${meta.completada ? 'completada' : ''}`}>
                {/* Cabecera con imagen */}
                {meta.imagenUrl && (
                  <div className="meta-imagen">
                    <img src={meta.imagenUrl} alt={meta.titulo} />
                    <div className="meta-type-badge" style={{ backgroundColor: tipo.color }}>
                      <span>{tipo.icon} {tipo.label}</span>
                    </div>
                  </div>
                )}

                {!meta.imagenUrl && (
                  <div className="meta-imagen-placeholder" style={{ backgroundColor: tipo.color + '15', borderTop: `2px solid ${tipo.color}` }}>
                    <span className="placeholder-icon">{tipo.icon}</span>
                    <span className="placeholder-label">{tipo.label}</span>
                  </div>
                )}

                {/* Contenido */}
                <div className="meta-content">
                  <div className="meta-header-content">
                    <h4 className={meta.completada ? 'completada' : ''}>{meta.titulo}</h4>
                    <button className="btn-opciones" onClick={() => {
                      if (window.confirm('¿Deseas eliminar esta meta?')) {
                        eliminarMeta(meta.id)
                      }
                    }}>
                      ✕
                    </button>
                  </div>

                  <p className="meta-descripcion">{meta.descripcion}</p>

                  {/* Detalles SMART */}
                  <div className="meta-detalles">
                    <div className="detalle-item">
                      <span className="detalle-label">📅 Fecha Límite:</span>
                      <span className="detalle-valor">{new Date(meta.fechaLimite).toLocaleDateString('es-PY')}</span>
                    </div>
                    <div className="detalle-item">
                      <span className="detalle-label">🎯 Estrategia:</span>
                      <span className="detalle-valor">{meta.comoSeAlcanzara}</span>
                    </div>
                  </div>

                  {/* Cálculo de ahorro para metas financieras */}
                  {ahorroData && !ahorroData.error && (
                    <div className="ahorro-desglose">
                      <h5>💵 Plan de Ahorro</h5>
                      <div className="ahorro-grid">
                        <div className="ahorro-item">
                          <span className="ahorro-label">Monto Total</span>
                          <span className="ahorro-valor">${ahorroData.montoTotal.toLocaleString('es-PY')}</span>
                        </div>
                        <div className="ahorro-item">
                          <span className="ahorro-label">Días Restantes</span>
                          <span className="ahorro-valor">{ahorroData.diasRestantes}</span>
                        </div>
                        <div className="ahorro-item">
                          <span className="ahorro-label">Ahorro Mensual</span>
                          <span className="ahorro-valor" style={{ color: '#4ECDC4', fontWeight: 'bold' }}>
                            ${ahorroData.ahorroMensual.toLocaleString('es-PY')}
                          </span>
                        </div>
                        <div className="ahorro-item">
                          <span className="ahorro-label">Ahorro Semanal</span>
                          <span className="ahorro-valor">${ahorroData.ahorroSemanal.toLocaleString('es-PY')}</span>
                        </div>
                        <div className="ahorro-item">
                          <span className="ahorro-label">Ahorro Diario</span>
                          <span className="ahorro-valor">${ahorroData.ahorroDiario.toLocaleString('es-PY')}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {ahorroData?.error && (
                    <div className="error-message">{ahorroData.error}</div>
                  )}

                  {/* Barra de progreso */}
                  <div className="progreso-section">
                    <div className="progreso-header">
                      <span className="progreso-label">Progreso</span>
                      <span className="progreso-porcentaje">{meta.progreso}%</span>
                    </div>
                    <div className="progreso-bar">
                      <div
                        className="progreso-fill"
                        style={{ width: `${meta.progreso}%` }}
                      ></div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={meta.progreso}
                      onChange={(e) => actualizarProgreso(meta.id, parseInt(e.target.value))}
                      className="progreso-slider"
                    />
                  </div>

                  {/* Botones de acción */}
                  <div className="meta-acciones">
                    <button
                      className="btn btn-small btn-completar"
                      onClick={() => completarMeta(meta.id)}
                    >
                      {meta.completada ? '↩ Reactivar' : '✓ Completar'}
                    </button>
                    <button
                      className="btn btn-small btn-editar"
                      onClick={() => editarMeta(meta)}
                    >
                      ✎ Editar
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default MetasAnuales
