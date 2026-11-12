import React, { useEffect, useRef, useState } from 'react'
import { Bell, BellRing, CheckCheck, Clock, Flag, Trash2, X } from 'lucide-react'
import { useNotificacionesTareas } from '../services/tareaNotificaciones'
import '../styles/Notificaciones.css'

const TOAST_MS = 10000

const haceCuanto = (iso) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  return new Date(iso).toLocaleDateString('es-PY', { day: '2-digit', month: 'short' })
}

function Icono({ aviso }) {
  return aviso.tipo === 'antes'
    ? <Clock size={15} strokeWidth={1.8} aria-hidden="true" />
    : <Flag size={15} strokeWidth={1.8} aria-hidden="true" />
}

function AvisoEmergente({ aviso, onAbrir, onCerrar }) {
  const cerrar = useRef(onCerrar)
  cerrar.current = onCerrar
  useEffect(() => {
    const t = setTimeout(() => cerrar.current(), TOAST_MS)
    return () => clearTimeout(t)
  }, [aviso.id])

  return (
    <div className={`qn-toast is-${aviso.tipo}${aviso.completada ? ' is-ok' : ''}`} role="status">
      <span className="qn-ico"><Icono aviso={aviso} /></span>
      <button type="button" className="qn-toast__body" onClick={onAbrir}>
        <strong>{aviso.titular}</strong>
        <span>{aviso.mensaje}</span>
        {aviso.cliente && <em>{aviso.cliente}</em>}
      </button>
      <button type="button" className="qn-toast__x" onClick={onCerrar} aria-label="Cerrar aviso">
        <X size={14} strokeWidth={1.8} />
      </button>
    </div>
  )
}

/** Campana de la barra superior: lista de avisos de tareas y avisos emergentes. */
function NotificacionesCampana({ onAbrirTareas }) {
  const { avisos, nuevos, sinLeer, marcarLeida, marcarTodasLeidas, borrarTodas, descartarNuevo } = useNotificacionesTareas()
  const [abierto, setAbierto] = useState(false)
  const raiz = useRef(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e) => { if (raiz.current && !raiz.current.contains(e.target)) setAbierto(false) }
    const esc = (e) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', esc)
    }
  }, [abierto])

  const abrirAviso = (aviso) => {
    marcarLeida(aviso.id)
    descartarNuevo(aviso.id)
    setAbierto(false)
    onAbrirTareas?.()
  }

  return (
    <>
      <div className="qn" ref={raiz}>
        <button
          type="button"
          className={`q-ghost-icon qn-bell${sinLeer ? ' has-unread' : ''}`}
          onClick={() => setAbierto((v) => !v)}
          aria-label={sinLeer ? `Notificaciones: ${sinLeer} sin leer` : 'Notificaciones'}
          aria-expanded={abierto}
          aria-haspopup="dialog"
          title="Notificaciones"
        >
          {sinLeer ? <BellRing size={17} strokeWidth={1.6} /> : <Bell size={17} strokeWidth={1.6} />}
          {sinLeer > 0 && <span className="qn-badge" aria-hidden="true">{sinLeer > 9 ? '9+' : sinLeer}</span>}
        </button>

        {abierto && (
          <div className="qn-panel" role="dialog" aria-label="Notificaciones de tareas">
            <header className="qn-panel__head">
              <strong>Notificaciones</strong>
              <span className="qn-panel__tools">
                <button type="button" onClick={marcarTodasLeidas} disabled={!sinLeer} title="Marcar todas como leídas" aria-label="Marcar todas como leídas">
                  <CheckCheck size={15} strokeWidth={1.8} />
                </button>
                <button type="button" onClick={borrarTodas} disabled={!avisos.length} title="Borrar todas" aria-label="Borrar todas las notificaciones">
                  <Trash2 size={14} strokeWidth={1.8} />
                </button>
              </span>
            </header>

            {avisos.length === 0 ? (
              <p className="qn-empty">
                Sin avisos por ahora. Te avisamos 5 minutos antes de que empiece cada tarea y 5 minutos después de que termine.
              </p>
            ) : (
              <ul className="qn-list">
                {avisos.map((a) => (
                  <li key={a.id}>
                    <button type="button" className={`qn-item is-${a.tipo}${a.leida ? '' : ' is-unread'}${a.completada ? ' is-ok' : ''}`} onClick={() => abrirAviso(a)}>
                      <span className="qn-ico"><Icono aviso={a} /></span>
                      <span className="qn-item__body">
                        <strong>{a.titular}</strong>
                        <span>{a.mensaje}</span>
                        <small>{a.cliente ? `${a.cliente} · ` : ''}{haceCuanto(a.creada)}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {nuevos.length > 0 && (
        <div className="qn-toasts" aria-live="polite">
          {nuevos.slice(-3).map((a) => (
            <AvisoEmergente key={a.id} aviso={a} onAbrir={() => abrirAviso(a)} onCerrar={() => descartarNuevo(a.id)} />
          ))}
        </div>
      )}
    </>
  )
}

export default NotificacionesCampana
