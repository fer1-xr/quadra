import React, { useState, useEffect } from 'react'
import { BookOpen, Share2, Bookmark, BookmarkCheck, Trash2, ArrowLeft } from 'lucide-react'
import '../styles/LeccionDelDia.css'

// Clave de favoritos por usuario para que cada cuenta tenga su propia lista
const obtenerClaveFavoritos = () => {
  try {
    const user = JSON.parse(localStorage.getItem('quaedra_user') || 'null')
    const id = user?.id || user?.email
    return id ? `quadra_lecciones_favoritas_${id}` : 'quadra_lecciones_favoritas'
  } catch (e) {
    return 'quadra_lecciones_favoritas'
  }
}

const cargarFavoritos = () => {
  try {
    const guardados = JSON.parse(localStorage.getItem(obtenerClaveFavoritos()) || '[]')
    return Array.isArray(guardados) ? guardados : []
  } catch (e) {
    return []
  }
}

function LeccionDelDia() {
  const [leccion, setLeccion] = useState(null)
  const [leccionHoy, setLeccionHoy] = useState(null)
  const [diaActual, setDiaActual] = useState('')
  const [vista, setVista] = useState('hoy') // 'hoy' | 'favoritos'
  const [favoritos, setFavoritos] = useState(cargarFavoritos)
  const [aviso, setAviso] = useState('')

  // Lecciones disponibles (Lunes a Viernes)
  const lecciones = [
    {
      dia: 'Lunes',
      diaNumero: 1,
      titulo: 'Ley 6380: Decreto Reglamentario de Sociedades Mercantiles',
      imagen: 'https://images.unsplash.com/photo-1554224311-beee415c15c7?w=800&h=400&fit=crop',
      contenido: `
        <h2>Introducción a la Ley 6380</h2>
        <p>La Ley 6380, promulgada el 3 de noviembre de 2019, es el Código Civil de la República del Paraguay que establece las normas generales sobre sociedades mercantiles y sus características.</p>

        <h3>Características Principales:</h3>
        <ul>
          <li><strong>Aplicabilidad:</strong> Establece normas para la constitución, funcionamiento y disolución de sociedades comerciales</li>
          <li><strong>Personalidad Jurídica:</strong> Reconoce a las sociedades como personas jurídicas independientes de sus miembros</li>
          <li><strong>Capital Social:</strong> Define los requisitos mínimos de capital según el tipo de sociedad</li>
          <li><strong>Responsabilidad:</strong> Establece diferentes regímenes de responsabilidad según el tipo de sociedad</li>
        </ul>

        <h3>Tipos de Sociedades Reconocidas:</h3>
        <p>La ley reconoce varios tipos de sociedades mercantiles, cada una con características específicas de responsabilidad y administración.</p>
      `
    },
    {
      dia: 'Martes',
      diaNumero: 2,
      titulo: 'NIIF 1: Adopción por Primera Vez de las NIIF',
      imagen: 'https://images.unsplash.com/photo-1579532537598-459e926db39f?w=800&h=400&fit=crop',
      contenido: `
        <h2>NIIF 1: Adopción por Primera Vez</h2>
        <p>NIIF 1 proporciona orientación para entidades que informan bajo NIIF por primera vez, estableciendo:
        un punto de partida para la contabilización de todos los activos y pasivos, mejorando la comparabilidad con otros informes.</p>

        <h3>Principios Fundamentales:</h3>
        <ul>
          <li><strong>Retrospectivo:</strong> Reexpresión de estados financieros previos como si siempre hubieran usado NIIF</li>
          <li><strong>Excepciones Obligatorias:</strong> Ciertos aspectos deben tratarse excepcionalmente</li>
          <li><strong>Excepciones Facultativas:</strong> La entidad puede elegir no aplicar ciertos aspectos retrospectivamente</li>
          <li><strong>Transición Suave:</strong> Permite un período de adaptación controlado</li>
        </ul>

        <h3>Fecha de Transición:</h3>
        <p>Es el inicio del período de presentación más antiguo para el cual la entidad presenta información comparativa completa.</p>
      `
    },
    {
      dia: 'Miércoles',
      diaNumero: 3,
      titulo: 'NIIF 8: Segmentos de Operación',
      imagen: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&h=400&fit=crop',
      contenido: `
        <h2>NIIF 8: Información por Segmentos</h2>
        <p>NIIF 8 establece requerimientos para la divulgación de información sobre los segmentos operativos de una entidad, productos, servicios, áreas geográficas y principales clientes.</p>

        <h3>Definiciones Clave:</h3>
        <ul>
          <li><strong>Segmento Operativo:</strong> Componente identificable que se dedica a actividades de negocio</li>
          <li><strong>Criterio Cuantitativo:</strong> Segmentos que cumplen umbrales de ingresos, resultados o activos</li>
          <li><strong>Información Agregada:</strong> Permite combinar segmentos en determinadas circunstancias</li>
          <li><strong>Divulgación Reconciliada:</strong> Debe conciliarse con cifras consolidadas</li>
        </ul>

        <h3>Enfoque Gerencial:</h3>
        <p>La norma requiere un enfoque basado en información interna utilizada por la administración, no en clasificaciones predefinidas.</p>
      `
    },
    {
      dia: 'Jueves',
      diaNumero: 4,
      titulo: 'Ley 6380: Derechos y Deberes de Accionistas',
      imagen: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop',
      contenido: `
        <h2>Derechos y Obligaciones de los Accionistas</h2>
        <p>Bajo la Ley 6380, los accionistas gozan de diversos derechos y asumen obligaciones específicas que regulan su participación en la sociedad anónima.</p>

        <h3>Derechos Fundamentales del Accionista:</h3>
        <ul>
          <li><strong>Voto:</strong> Derecho a participar en asambleas y votar decisiones corporativas</li>
          <li><strong>Información:</strong> Acceso a información financiera y administrativa</li>
          <li><strong>Dividendos:</strong> Derecho a participar en ganancias distribuidas</li>
          <li><strong>Preferencia:</strong> Derecho de compra en aumento de capital</li>
          <li><strong>Liquidación:</strong> Participación proporcional en bienes liquidados</li>
        </ul>

        <h3>Obligaciones del Accionista:</h3>
        <p>Cumplimiento con aportaciones de capital, responsabilidad limitada a su inversión, y cumplimiento de estatutos sociales.</p>
      `
    },
    {
      dia: 'Viernes',
      diaNumero: 5,
      titulo: 'NIIF 15: Ingresos de Actividades Ordinarias',
      imagen: 'https://images.unsplash.com/photo-1527482797697-8795b1a55a45?w=800&h=400&fit=crop',
      contenido: `
        <h2>NIIF 15: Ingresos de Actividades Ordinarias</h2>
        <p>NIIF 15 establece los principios para la información financiera sobre ingresos procedentes de contratos con clientes, reemplazando anteriores normas con un modelo de reconocimiento más consistente.</p>

        <h3>Modelo de 5 Pasos:</h3>
        <ol>
          <li><strong>Identificar el contrato con el cliente</strong></li>
          <li><strong>Identificar las obligaciones de desempeño</strong></li>
          <li><strong>Determinar el precio de la transacción</strong></li>
          <li><strong>Asignar el precio a las obligaciones de desempeño</strong></li>
          <li><strong>Reconocer ingresos cuando se satisface la obligación</strong></li>
        </ol>

        <h3>Principio Fundamental:</h3>
        <p>Los ingresos se reconocen cuando se transfiere el control de los bienes o servicios al cliente, no necesariamente cuando se recibe el pago.</p>

        <h3>Control de Bienes y Servicios:</h3>
        <p>Se debe evaluar si la entidad ha transferido el control al cliente considerando capacidad de uso, posesión legal y otros factores relevantes.</p>
      `
    }
  ]

  useEffect(() => {
    const obtenerLeccionDelDia = () => {
      const ahora = new Date()
      const diaSemana = ahora.getDay() // 0 = domingo, 1 = lunes, etc.

      // Lunes = 1, Martes = 2, ..., Viernes = 5
      // Si es fin de semana (0 o 6), mostrar la del viernes
      let diaParaLeccion = diaSemana
      if (diaSemana === 0) {
        diaParaLeccion = 5 // Domingo muestra la del viernes
      } else if (diaSemana === 6) {
        diaParaLeccion = 5 // Sábado muestra la del viernes
      }

      const leccionDelDia = lecciones.find(l => l.diaNumero === diaParaLeccion)
      setLeccion(leccionDelDia || lecciones[0])
      setLeccionHoy(leccionDelDia || lecciones[0])

      // Obtener nombre del día
      const diasNombre = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      setDiaActual(diasNombre[diaSemana])
    }

    obtenerLeccionDelDia()
  }, [])

  useEffect(() => {
    localStorage.setItem(obtenerClaveFavoritos(), JSON.stringify(favoritos))
  }, [favoritos])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(''), 2500)
    return () => clearTimeout(t)
  }, [aviso])

  const esFavorito = (l) => !!l && favoritos.some(f => f.diaNumero === l.diaNumero)

  const alternarFavorito = (l) => {
    if (esFavorito(l)) {
      setFavoritos(prev => prev.filter(f => f.diaNumero !== l.diaNumero))
      setAviso('Lección quitada de favoritos')
    } else {
      setFavoritos(prev => [{ diaNumero: l.diaNumero, guardadoEn: new Date().toISOString() }, ...prev])
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

  const leccionesFavoritas = favoritos
    .map(f => {
      const l = lecciones.find(x => x.diaNumero === f.diaNumero)
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

  const viendoOtraLeccion = leccion && leccionHoy && leccion.diaNumero !== leccionHoy.diaNumero

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
                <li key={l.diaNumero} className="favorito-item">
                  <button className="favorito-abrir" onClick={() => abrirLeccion(l)}>
                    <div className="favorito-imagen" style={{ backgroundImage: `url(${l.imagen})` }} />
                    <div className="favorito-info">
                      <span className="favorito-dia">{l.dia}</span>
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
                <span className="leccion-dia">{leccion.dia}</span>
                <h1 className="leccion-titulo">{leccion.titulo}</h1>
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div className="leccion-body">
            <div className="leccion-meta">
              <span className="meta-item">{leccion.dia}</span>
              <span className="meta-item">Quadra Academy</span>
              <span className="meta-item">5 min de lectura</span>
            </div>

            <div className="leccion-content" dangerouslySetInnerHTML={{ __html: leccion.contenido }} />

            <div className="leccion-footer">
              <div className="footer-section">
                <h3>Resumen de Aprendizaje</h3>
                <p>Esta lección te proporciona una base sólida en los conceptos clave de {leccion.diaNumero === 1 || leccion.diaNumero === 4 ? 'la Ley 6380' : 'NIIF'}. Te recomendamos revisar los elementos principales y aplicarlos en tu contexto empresarial.</p>
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
