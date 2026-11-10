import React, { useState, useEffect, useRef } from 'react'
import PageHead from './PageHead'
import { useCloudCollection } from '../services/useCloudCollection'
import jsPDF from 'jspdf'
import { Plus, X, GraduationCap, Briefcase, Wallet, Download } from 'lucide-react'
import '../styles/MetasAnuales.css'
import '../styles/ClienteAgenda.css'
import Toast from './Toast'
import MetasResumen from './MetasResumen'
import MetaCard, { MontoInput, PasosEditor } from './MetaCard'
import { avanceDe, conAvance, ahorradoDe, planAhorro, gs, fechaPY, esFinanciera, estaPagado, cuotasPendientes, pasoHecho } from './metasCalc'

const TIPOS_META = [
  { id: 'educativo', label: 'Educativo', icon: GraduationCap },
  { id: 'profesional', label: 'Profesional', icon: Briefcase },
  { id: 'financiero', label: 'Financiero', icon: Wallet }
]

const PERIODOS = [
  { id: 'anual', label: 'Anual' },
  { id: 'mensual', label: 'Mensual' }
]

const META_VACIA = {
  titulo: '',
  descripcion: '',
  tipo: 'profesional',
  periodo: 'anual',
  fechaLimite: '',
  comoSeAlcanzara: '',
  imagenUrl: '',
  montoFinanciero: 0,
  aportes: [],
  pasos: [],
  progreso: 0,
  completada: false
}

/** Descarta pasos y sub-pasos sin texto; un paso con sub-pasos queda hecho solo si lo están todos. */
const limpiarPasos = (pasos = []) =>
  pasos
    .filter((p) => p.texto.trim())
    .map((p) => {
      const subpasos = (p.subpasos || []).filter((s) => s.texto.trim())
      return subpasos.length ? { ...p, subpasos, hecho: subpasos.every((s) => s.hecho) } : { ...p, subpasos: [] }
    })

/**
 * Sin `cliente`: metas personales del usuario.
 * Con `cliente` (contribuyente activo): metas propias de ese cliente, totalmente
 * independientes de las personales y de las de otros clientes.
 * Ambas viven en la colección 'meta'; las de cliente llevan `clienteId`.
 *
 * El avance no se edita a mano: sale de los ahorros registrados (financieras)
 * o de los pasos tildados (educativas y profesionales). Ver metasCalc.js.
 */
function MetasAnuales({ cliente = null }) {
  const [todas, setTodas, syncStatus] = useCloudCollection('meta', 'quadra_metas_anuales')
  const clienteActivoId = cliente ? String(cliente.clienteId) : null
  const esDelAmbito = (m) => (clienteActivoId ? String(m.clienteId ?? '') === clienteActivoId : !m.clienteId)
  const metas = todas.filter(esDelAmbito)
  const setMetas = (lista) => {
    const conCliente = lista.map((m) => (clienteActivoId ? { ...m, clienteId: clienteActivoId } : m))
    setTodas([...todas.filter((m) => !esDelAmbito(m)), ...conCliente])
  }
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [periodo, setPeriodo] = useState('anual')
  const [nuevaMeta, setNuevaMeta] = useState(META_VACIA)
  const [editandoId, setEditandoId] = useState(null)
  const [notificacion, setNotificacion] = useState(null)
  const formRef = useRef(null)

  // al editar, llevar el formulario a la vista
  useEffect(() => {
    if (mostrarFormulario && editandoId) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [mostrarFormulario, editandoId])

  const mostrarNotificacion = (mensaje, tipo = 'success') => {
    setNotificacion({ mensaje, tipo })
  }

  const exportarPDF = () => {
    const doc = new jsPDF()
    const lista = metas.filter(m => (m.periodo || 'anual') === periodo)

    doc.setFontSize(20)
    doc.text(`Resumen de Metas ${periodo === 'anual' ? 'Anuales' : 'Mensuales'}${cliente ? ` · ${cliente.razonSocial}` : ''}`, 20, 20)

    doc.setFontSize(10)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-PY')}`, 20, 30)
    doc.text(`Total de metas: ${lista.length}`, 20, 37)
    doc.text(`Cumplidas: ${lista.filter(m => avanceDe(m) >= 100).length}`, 20, 44)

    let y = 55
    const linea = (txt, salto = 6) => {
      if (y > 275) { doc.addPage(); y = 20 }
      doc.text(txt, 25, y)
      y += salto
    }

    lista.forEach((meta, index) => {
      const tipo = TIPOS_META.find(t => t.id === meta.tipo)
      const avance = Math.round(avanceDe(meta))
      if (y > 250) { doc.addPage(); y = 20 }

      doc.setFontSize(12)
      doc.setTextColor(avance >= 100 ? 150 : 0)
      doc.text(`${index + 1}. ${meta.titulo}`, 20, y)
      y += 8

      doc.setFontSize(9)
      doc.setTextColor(100)
      linea(`Tipo: ${tipo?.label || meta.tipo} | Avance: ${avance}% | Fecha límite: ${fechaPY(meta.fechaLimite)}`)
      if (meta.descripcion) linea(`Descripción: ${meta.descripcion.substring(0, 90)}`)

      if (esFinanciera(meta)) {
        const plan = planAhorro(meta)
        if (plan) linea(`Ahorrado: ${gs(plan.ahorrado)} de ${gs(plan.objetivo)} · faltan ${gs(plan.falta)}`)
        ;(meta.aportes || []).filter(estaPagado).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')).forEach((a) => {
          linea(`   ${fechaPY(a.fecha)}   + ${gs(a.monto)}${a.serie ? `   (cuota ${a.cuota}/${a.de})` : ''}`, 5)
        })
        const pend = cuotasPendientes(meta)
        if (pend.length) linea(`Cuotas pendientes: ${pend.length} de ${gs(pend[0].monto)} · próxima ${fechaPY(pend[0].fecha)}`)
      } else if (meta.pasos?.length) {
        meta.pasos.forEach((p) => {
          linea(`   [${pasoHecho(p) ? 'x' : ' '}] ${p.texto}`, 5)
          ;(p.subpasos || []).forEach((s) => linea(`         [${s.hecho ? 'x' : ' '}] ${s.texto}`, 5))
        })
      }

      y += 4
    })

    doc.save(`metas-${periodo}-${Date.now()}.pdf`)
    mostrarNotificacion('PDF exportado exitosamente', 'success')
  }

  const agregarMeta = () => {
    if (!nuevaMeta.titulo.trim() || !nuevaMeta.descripcion.trim() || !nuevaMeta.fechaLimite) {
      mostrarNotificacion('Completa todos los campos requeridos', 'warning')
      return
    }

    if (nuevaMeta.tipo === 'financiero' && !Number(nuevaMeta.montoFinanciero)) {
      mostrarNotificacion('Para metas financieras, ingresa el monto objetivo', 'warning')
      return
    }

    const meta = conAvance({
      ...nuevaMeta,
      id: editandoId || Date.now(),
      creadaEn: nuevaMeta.creadaEn || new Date().toISOString(),
      montoFinanciero: nuevaMeta.tipo === 'financiero' ? Number(nuevaMeta.montoFinanciero) : null,
      pasos: limpiarPasos(nuevaMeta.pasos)
    })

    if (editandoId) {
      setMetas(metas.map(m => m.id === editandoId ? meta : m))
      setEditandoId(null)
      mostrarNotificacion('Meta actualizada correctamente', 'success')
    } else {
      setMetas([...metas, meta])
      mostrarNotificacion('Meta creada exitosamente', 'success')
    }

    setNuevaMeta(META_VACIA)
    setMostrarFormulario(false)
  }

  const eliminarMeta = (id) => {
    setMetas(metas.filter(m => m.id !== id))
    mostrarNotificacion('Meta eliminada', 'info')
  }

  /** Guarda un aporte o un paso tildado y recalcula el avance. */
  const cambiarMeta = (actualizada) => {
    const antes = metas.find((m) => m.id === actualizada.id)
    const nueva = conAvance(actualizada)
    setMetas(metas.map((m) => (m.id === nueva.id ? nueva : m)))
    if (nueva.completada && antes && avanceDe(antes) < 100) {
      mostrarNotificacion('¡Felicitaciones! Meta cumplida', 'success')
    } else if (esFinanciera(nueva) && antes && ahorradoDe(nueva) > ahorradoDe(antes)) {
      mostrarNotificacion(`Ahorro registrado: ${gs(ahorradoDe(nueva) - ahorradoDe(antes))}`, 'success')
    } else if (esFinanciera(nueva) && antes && cuotasPendientes(nueva).length > cuotasPendientes(antes).length) {
      mostrarNotificacion(`${cuotasPendientes(nueva).length - cuotasPendientes(antes).length} cuotas programadas`, 'success')
    }
  }

  const editarMeta = (meta) => {
    setNuevaMeta({ ...META_VACIA, ...meta, montoFinanciero: meta.montoFinanciero ?? 0, pasos: meta.pasos || [] })
    setEditandoId(meta.id)
    setMostrarFormulario(true)
  }

  const metasFiltradas = metas.filter(m => (m.periodo || 'anual') === periodo)
  const tipoInfo = (tipoId) => TIPOS_META.find(t => t.id === tipoId) || TIPOS_META[1]
  const campo = (k) => (e) => setNuevaMeta({ ...nuevaMeta, [k]: e.target.value })

  const abrirNueva = () => {
    setEditandoId(null)
    setNuevaMeta({ ...META_VACIA, periodo })
    setMostrarFormulario(true)
  }

  const cerrarFormulario = () => {
    setMostrarFormulario(false)
    setEditandoId(null)
    setNuevaMeta(META_VACIA)
  }

  const campoImagen = (
    <div className="form-group">
      <label htmlFor="meta-imagen">Imagen de cabecera (URL)</label>
      <input id="meta-imagen" type="url" value={nuevaMeta.imagenUrl || ''} onChange={campo('imagenUrl')} placeholder="https://…/imagen.jpg" />
    </div>
  )

  return (
    <div className="metas-anuales">
      {notificacion && (
        <Toast
          message={notificacion.mensaje}
          type={notificacion.tipo}
          onClose={() => setNotificacion(null)}
        />
      )}

      <PageHead
        title={cliente ? 'Metas y objetivos del cliente' : 'Metas y Objetivos'}
        lede={cliente
          ? `Objetivos propios de ${cliente.razonSocial}, independientes de tus metas personales y de los demás clientes.`
          : 'Establece y alcanza tus objetivos.'}
        status={syncStatus}
      />

      {/* Selector de período y acciones */}
      <div className="periodo-acciones">
        <div className="periodo-selector" role="tablist" aria-label="Período">
          {PERIODOS.map(p => (
            <button
              key={p.id}
              role="tab"
              aria-selected={periodo === p.id}
              className={`periodo-btn ${periodo === p.id ? 'activo' : ''}`}
              onClick={() => setPeriodo(p.id)}
            >
              {p.label}
              <span className="periodo-btn__n">{metas.filter(m => (m.periodo || 'anual') === p.id).length}</span>
            </button>
          ))}
        </div>
        <div className="periodo-acciones__right">
          <button className="btn btn-exportar" onClick={exportarPDF} disabled={!metasFiltradas.length}>
            <Download size={15} strokeWidth={1.8} /> Exportar PDF
          </button>
          {!mostrarFormulario && (
            <button className="btn btn-add-meta" onClick={abrirNueva}>
              <Plus size={16} strokeWidth={1.8} /> Nueva meta
            </button>
          )}
        </div>
      </div>

      {/* Formulario compacto: 3 campos por fila */}
      {mostrarFormulario && (
        <form ref={formRef} className="meta-form" style={{ scrollMarginTop: 24 }} onSubmit={(e) => { e.preventDefault(); agregarMeta() }}>
          <header className="meta-form__head">
            <h4>{editandoId ? 'Editar meta' : 'Nueva meta'}</h4>
            <button type="button" className="meta-form__close" onClick={cerrarFormulario} aria-label="Cerrar formulario">
              <X size={16} strokeWidth={1.8} />
            </button>
          </header>

          <div className="meta-form__grid">
            <div className="form-group span-2">
              <label htmlFor="meta-titulo">Título *</label>
              <input
                id="meta-titulo"
                type="text"
                value={nuevaMeta.titulo}
                onChange={campo('titulo')}
                placeholder={cliente ? 'Ej: Regularizar las declaraciones de IVA atrasadas' : 'Ej: Obtener certificación en Excel Avanzado'}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="meta-tipo">Tipo *</label>
              <select id="meta-tipo" value={nuevaMeta.tipo} onChange={campo('tipo')}>
                {TIPOS_META.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>{tipo.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="meta-periodo">Período</label>
              <select id="meta-periodo" value={nuevaMeta.periodo || 'anual'} onChange={campo('periodo')}>
                {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="meta-fecha">Fecha límite *</label>
              <input id="meta-fecha" type="date" value={nuevaMeta.fechaLimite} onChange={campo('fechaLimite')} />
            </div>

            {nuevaMeta.tipo === 'financiero' ? (
              <div className="form-group">
                <label htmlFor="meta-monto">Monto objetivo (Gs.) *</label>
                <MontoInput
                  id="meta-monto"
                  value={nuevaMeta.montoFinanciero}
                  onChange={(v) => setNuevaMeta({ ...nuevaMeta, montoFinanciero: v })}
                  placeholder="Ej: 50.000.000"
                />
              </div>
            ) : campoImagen}

            <div className="form-group">
              <label htmlFor="meta-desc">Descripción *</label>
              <textarea id="meta-desc" value={nuevaMeta.descripcion} onChange={campo('descripcion')} placeholder="¿Qué querés lograr?" rows="2" />
            </div>

            <div className={`form-group ${nuevaMeta.tipo === 'financiero' ? '' : 'span-2'}`}>
              <label htmlFor="meta-estrategia">¿Cómo lo vas a lograr?</label>
              <textarea id="meta-estrategia" value={nuevaMeta.comoSeAlcanzara || ''} onChange={campo('comoSeAlcanzara')} placeholder="Pasos o acciones concretas" rows="2" />
            </div>

            {nuevaMeta.tipo === 'financiero' ? campoImagen : (
              <div className="form-group span-3">
                <label htmlFor="meta-paso-nuevo">Pasos para lograrla</label>
                <PasosEditor
                  pasos={nuevaMeta.pasos || []}
                  onChange={(pasos) => setNuevaMeta({ ...nuevaMeta, pasos })}
                />
              </div>
            )}
          </div>

          <div className="form-buttons">
            <button type="button" className="btn btn-secondary" onClick={cerrarFormulario}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{editandoId ? 'Guardar cambios' : 'Crear meta'}</button>
          </div>
        </form>
      )}

      {/* Resumen gráfico del período */}
      {metasFiltradas.length > 0 && <MetasResumen metas={metasFiltradas} />}

      {/* Grid de metas */}
      <div className="metas-grid">
        {metasFiltradas.length === 0 ? (
          <div className="metas-vacio">
            <p>No hay metas {periodo === 'anual' ? 'anuales' : 'mensuales'} aún.</p>
            {!mostrarFormulario && (
              <button className="btn btn-secondary" onClick={abrirNueva}>
                <Plus size={15} strokeWidth={1.8} /> Crear la primera
              </button>
            )}
          </div>
        ) : (
          metasFiltradas.map(meta => (
            <MetaCard
              key={meta.id}
              meta={meta}
              tipo={tipoInfo(meta.tipo)}
              onEditar={() => editarMeta(meta)}
              onEliminar={() => eliminarMeta(meta.id)}
              onCambiar={cambiarMeta}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default MetasAnuales
