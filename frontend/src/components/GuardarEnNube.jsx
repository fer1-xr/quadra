import React, { useEffect, useState } from 'react'
import { CloudUpload, CloudCheck, HardDrive, AlertCircle } from 'lucide-react'
import { guardarEnHistorial, useContribuyente } from '../services/historialService'
import '../styles/Historial.css'

/**
 * Botón "Guardar en la nube" para cualquier resultado de un módulo.
 * Se reinicia cuando cambia `datos` (un resultado nuevo se puede volver a guardar).
 */
function GuardarEnNube({ modulo, titulo, resumen, datos, disabled, className = '' }) {
  const contribuyente = useContribuyente()
  const [estado, setEstado] = useState('idle') // idle | saving | nube | local | error
  const [mensaje, setMensaje] = useState('')

  useEffect(() => { setEstado('idle'); setMensaje('') }, [datos])

  if (!contribuyente) return null

  const guardar = async () => {
    setEstado('saving')
    setMensaje('')
    try {
      const { destino } = await guardarEnHistorial({ contribuyente, modulo, titulo, resumen, datos })
      setEstado(destino)
    } catch (err) {
      setEstado('error')
      setMensaje(err.message || 'No se pudo guardar')
    }
  }

  const guardado = estado === 'nube' || estado === 'local'
  const Icon = estado === 'nube' ? CloudCheck : estado === 'local' ? HardDrive : estado === 'error' ? AlertCircle : CloudUpload
  const label = {
    idle: 'Guardar en la nube',
    saving: 'Guardando…',
    nube: 'Guardado en el historial',
    local: 'Guardado en este equipo',
    error: 'Reintentar guardado'
  }[estado]

  return (
    <span className={`q-save ${className}`}>
      <button
        type="button"
        className={`q-save__btn is-${estado}`}
        onClick={guardar}
        disabled={disabled || estado === 'saving' || guardado}
      >
        <Icon size={16} strokeWidth={1.8} />
        {label}
      </button>
      <span className="q-save__hint" role="status">
        {estado === 'nube' && 'Disponible en el Historial'}
        {estado === 'local' && 'Sin conexión a la nube: se subirá al abrir el Historial'}
        {estado === 'error' && mensaje}
        {estado === 'idle' && `Se guarda en el Historial de ${contribuyente.razonSocial}`}
      </span>
    </span>
  )
}

export default GuardarEnNube
