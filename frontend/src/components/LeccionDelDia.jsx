import React, { useState, useEffect } from 'react'
import { BookOpen, Share2, Bookmark, BookmarkCheck, Trash2, ArrowLeft } from 'lucide-react'
import '../styles/LeccionDelDia.css'
import {
  obtenerLeccionDelDia,
  obtenerLeccionPorId,
  leccionAHtml,
} from '../services/leccionesCatalogo'
import { useCloudCollection } from '../services/useCloudCollection'

// Clave antigua (por usuario) donde se guardaban los favoritos en este equipo.
// useCloudCollection la usa para subirlos a la nube la primera vez.
const obtenerClaveFavoritos = () => {
  try {
    const user = JSON.parse(localStorage.getItem('quaedra_user') || 'null')
    const id = user?.id || user?.email
    return id ? `quadra_lecciones_favoritas_${id}` : 'quadra_lecciones_favoritas'
  } catch (e) {
    return 'quadra_lecciones_favoritas'
  }
}

const DIAS_NOMBRE = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES_NOMBRE = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const etiquetaFecha = (fecha) =>
  `${DIAS_NOMBRE[fecha.getDay()]} ${fecha.getDate()} de ${MESES_NOMBRE[fecha.getMonth()]}`

function LeccionDelDia() {
  const [hoy] = useState(() => new Date())
  const [leccionHoy] = useState(() => obtenerLeccionDelDia(hoy))
  const [leccion, setLeccion] = useState(leccionHoy)
  const [vista, setVista] = useState('hoy') // 'hoy' | 'favoritos'
  // Favoritos en la nube (workspace_items, kind 'favorito'): se ven desde cualquier equipo
  const [claveFavoritos] = useState(obtenerClaveFavoritos)
  const [guardados, setFavoritos] = useCloudCollection('favorito', claveFavoritos)
  // Solo favoritos con id de lección (formato actual)
  const favoritos = guardados.filter(f => f && typeof f.id === 'string')
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(''), 2500)
    return () => clearTimeout(t)
  }, [aviso])

  const esFavorito = (l) => !!l && favoritos.some(f => f.id === l.id)

  const alternarFavorito = (l) => {
    if (esFavorito(l)) {
      setFavoritos(prev => prev.filter(f => f.id !== l.id))
      setAviso('Lección quitada de favoritos')
    } else {
      setFavoritos(prev => [{ id: l.id, guardadoEn: new Date().toISOString() }, ...prev])
      setAviso('Lección guardada en favoritos')
    }
  }

  const compartir = async (l) => {
    const texto = `${l.titulo} — Lección del día en Quadra Academy`
    try {
      if (navigator.share) {
        await navigator.share({ title: l.titulo, text: texto })
      } else {
        await navigator.clipboard.writeText(texto)
        setAviso('Título copiado al portapapeles')
      }
    } catch (e) {
      // El usuario canceló o el navegador bloqueó la acción
    }
  }

  const abrirLeccion = (l) => {
    setLeccion(l)
    setVista('hoy')
  }

  const volverAHoy = () => {
    setLeccion(leccionHoy)
    setVista('hoy')
  }

  const leccionesFavoritas = [...favoritos]
    .sort((a, b) => String(b.guardadoEn || '').localeCompare(String(a.guardadoEn || '')))
    .map(f => {
      const l = obtenerLeccionPorId(f.id)
      return l ? { ...l, guardadoEn: f.guardadoEn } : null
    })
    .filter(Boolean)

  const formatearFecha = (iso) => {
    try {
      return new Date(iso).toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch (e) {
      return ''
    }
  }

  const viendoOtraLeccion = leccion && leccionHoy && leccion.id !== leccionHoy.id

  return (
    <div className="leccion-del-dia-container">
      <div className="leccion-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={vista === 'hoy'}
          className={`leccion-tab ${vista === 'hoy' ? 'active' : ''}`}
          onClick={volverAHoy}
        >
          <BookOpen size={16} /> Lección de hoy
        </button>
        <button
          role="tab"
          aria-selected={vista === 'favoritos'}
          className={`leccion-tab ${vista === 'favoritos' ? 'active' : ''}`}
          onClick={() => setVista('favoritos')}
        >
          <Bookmark size={16} /> Mis favoritos
          <span className="leccion-tab-count">{leccionesFavoritas.length}</span>
        </button>
      </div>

      {aviso && <div className="leccion-aviso" role="status">{aviso}</div>}

      {vista === 'favoritos' && (
        <section className="leccion-favoritos">
          {leccionesFavoritas.length === 0 ? (
            <div className="favoritos-vacio">
              <Bookmark size={32} />
              <h3>Aún no tienes lecciones guardadas</h3>
              <p>Cuando una lección te resulte útil, pulsa «Guardar como favorito» y la encontrarás aquí para releerla cuando quieras.</p>
              <button className="btn btn-primary" onClick={volverAHoy}>Ir a la lección de hoy</button>
            </div>
          ) : (
            <ul className="favoritos-lista">
              {leccionesFavoritas.map(l => (
                <li key={l.id} className="favorito-item">
                  <button className="favorito-abrir" onClick={() => abrirLeccion(l)}>
                    <div className="favorito-imagen" style={{ backgroundImage: `url(${l.imagen})` }} />
                    <div className="favorito-info">
                      <span className="favorito-dia">{l.categoria}</span>
                      <h3 className="favorito-titulo">{l.titulo}</h3>
                      {l.guardadoEn && <span className="favorito-fecha">Guardado el {formatearFecha(l.guardadoEn)}</span>}
                    </div>
                  </button>
                  <button
                    className="favorito-quitar"
                    onClick={() => alternarFavorito(l)}
                    aria-label={`Quitar ${l.titulo} de favoritos`}
                    title="Quitar de favoritos"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {vista === 'hoy' && viendoOtraLeccion && (
        <button className="leccion-volver" onClick={volverAHoy}>
          <ArrowLeft size={16} /> Volver a la lección de hoy
        </button>
      )}

      {vista === 'hoy' && leccion && (
        <article className="leccion-blog">
          {/* Imagen de fondo */}
          <div className="leccion-header" style={{ backgroundImage: `url(${leccion.imagen})` }}>
            <div className="leccion-header-overlay">
              <div className="leccion-header-content">
                <span className="leccion-dia">{leccion.categoria}</span>
                <h1 className="leccion-titulo">{leccion.titulo}</h1>
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div className="leccion-body">
            <div className="leccion-meta">
              <span className="meta-item">{etiquetaFecha(hoy)}</span>
              <span className="meta-item">Quadra Academy</span>
              <span className="meta-item">5 min de lectura</span>
            </div>

            <div className="leccion-content" dangerouslySetInnerHTML={{ __html: leccionAHtml(leccion) }} />

            <div className="leccion-footer">
              <div className="footer-section">
                <h3>Resumen de Aprendizaje</h3>
                <p>{leccion.resumen}</p>
                <p className="leccion-aviso-legal">Contenido educativo de carácter general. Verifique el texto vigente de la norma y consulte a un profesional antes de aplicarlo.</p>
              </div>

              <div className="footer-actions">
                <button
                  className={`btn btn-primary ${esFavorito(leccion) ? 'is-saved' : ''}`}
                  onClick={() => alternarFavorito(leccion)}
                  aria-pressed={esFavorito(leccion)}
                >
                  {esFavorito(leccion)
                    ? <><BookmarkCheck size={16} /> Guardado en favoritos</>
                    : <><Bookmark size={16} /> Guardar como favorito</>}
                </button>
                <button className="btn btn-secondary" onClick={() => compartir(leccion)}>
                  <Share2 size={16} /> Compartir
                </button>
              </div>
            </div>
          </div>
        </article>
      )}
    </div>
  )
}

export default LeccionDelDia
