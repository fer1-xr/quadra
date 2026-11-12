import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'

/**
 * Avisos dentro de la plataforma para las tareas de la semana:
 *   · 5 minutos antes de la hora de inicio (si la tarea sigue pendiente)
 *   · 5 minutos después de la hora de fin
 *
 * Las tareas se leen de la copia local que mantiene useCloudCollection
 * ('quadra_tareas_diarias:<userId>'), así el aviso llega aunque el módulo
 * de tareas no esté abierto. Los avisos se guardan por usuario en este equipo.
 */

export const MARGEN_MIN = 5
const VENTANA_DESPUES_MIN = 60 // si la plataforma estuvo cerrada, el aviso de cierre se recupera hasta 1 h después
const TICK_MS = 15000
const REMOTO_MS = 120000 // tareas cargadas desde otro equipo
const MAX_AVISOS = 50
const DIAS_RETENCION = 14
const DIA_IDX = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5 }
const TAREAS_KEY = 'quadra_tareas_diarias'

const leer = (key, def) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : def
  } catch {
    return def
  }
}

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function aHora(base, hora) {
  if (!/^\d{1,2}:\d{2}$/.test(hora || '')) return null
  const [h, m] = hora.split(':').map(Number)
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0)
}

/**
 * Avisos que corresponde mostrar ahora. Una tarea pertenece a hoy si su día
 * de la semana es el de hoy (igual que en el tablero semanal).
 */
export function avisosVencidos(tareas, ahora = new Date()) {
  const hoy = ahora.getDay()
  const fecha = ymd(ahora)
  const salida = []
  for (const t of tareas || []) {
    if (!t || DIA_IDX[t.dia] !== hoy) continue
    const inicio = aHora(ahora, t.hora)
    if (!inicio) continue
    const fin = aHora(ahora, t.horaFin) || inicio
    const base = { tareaId: t.id, titulo: t.titulo, cliente: t.clienteNombre || '', hora: t.hora, horaFin: t.horaFin || '' }

    const antes = new Date(inicio.getTime() - MARGEN_MIN * 60000)
    if (!t.completada && ahora >= antes && ahora < inicio) {
      const faltan = Math.max(1, Math.ceil((inicio - ahora) / 60000))
      salida.push({
        ...base,
        id: `${t.id}:${fecha}:antes:${t.hora}`,
        tipo: 'antes',
        titular: `Empieza en ${faltan} min`,
        mensaje: `${t.titulo} · ${t.hora}${t.horaFin ? `–${t.horaFin}` : ''}`
      })
    }

    const despues = new Date(fin.getTime() + MARGEN_MIN * 60000)
    if (ahora >= despues && ahora < new Date(despues.getTime() + VENTANA_DESPUES_MIN * 60000)) {
      salida.push({
        ...base,
        id: `${t.id}:${fecha}:despues:${t.horaFin || t.hora}`,
        tipo: 'despues',
        completada: !!t.completada,
        titular: t.completada ? 'Tarea finalizada' : '¿Terminaste esta tarea?',
        mensaje: t.completada
          ? `${t.titulo} · terminó a las ${t.horaFin || t.hora}`
          : `${t.titulo} · terminó a las ${t.horaFin || t.hora} y sigue pendiente`
      })
    }
  }
  return salida
}

/**
 * Hook global (montado en el Dashboard). Devuelve los avisos guardados,
 * los recién llegados (para mostrar como toast) y acciones.
 */
export function useNotificacionesTareas() {
  const [userId, setUserId] = useState(null)
  const [avisos, setAvisos] = useState([])
  const [nuevos, setNuevos] = useState([])
  const claves = useRef(null)
  const remotas = useRef([])

  useEffect(() => {
    let cancelado = false
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelado) setUserId(data?.session?.user?.id || 'local')
    }).catch(() => { if (!cancelado) setUserId('local') })
    return () => { cancelado = true }
  }, [])

  useEffect(() => {
    if (!userId) return
    claves.current = {
      avisos: `quadra_notificaciones:${userId}`,
      enviados: `quadra_notificaciones_enviadas:${userId}`,
      tareas: `${TAREAS_KEY}:${userId}`
    }
    setAvisos(leer(claves.current.avisos, []))
  }, [userId])

  const guardar = useCallback((lista) => {
    if (!claves.current) return
    localStorage.setItem(claves.current.avisos, JSON.stringify(lista))
    setAvisos(lista)
  }, [])

  const revisar = useCallback(() => {
    const k = claves.current
    if (!k) return
    const locales = leer(k.tareas, null) ?? leer(TAREAS_KEY, [])
    const lista = Array.isArray(locales) ? locales : []
    // la copia local manda (refleja lo último editado en este equipo); de la nube se suman las que falten
    const ids = new Set(lista.map((t) => String(t?.id)))
    const tareas = [...lista, ...remotas.current.filter((t) => !ids.has(String(t?.id)))]
    const ahora = new Date()
    const pendientes = avisosVencidos(tareas, ahora)
    if (!pendientes.length) return

    // se relee del almacenamiento para no duplicar si hay otra pestaña abierta
    const enviados = leer(k.enviados, {})
    const llegan = pendientes.filter((a) => !enviados[a.id])
    if (!llegan.length) return

    const limite = ahora.getTime() - DIAS_RETENCION * 86400000
    const enviadosVigentes = Object.fromEntries(Object.entries(enviados).filter(([, ts]) => ts > limite))
    llegan.forEach((a) => { enviadosVigentes[a.id] = ahora.getTime() })
    localStorage.setItem(k.enviados, JSON.stringify(enviadosVigentes))

    const conFecha = llegan.map((a) => ({ ...a, creada: ahora.toISOString(), leida: false }))
    guardar([...conFecha, ...leer(k.avisos, [])].slice(0, MAX_AVISOS))
    setNuevos((prev) => [...prev, ...conFecha])
  }, [guardar])

  useEffect(() => {
    if (!userId || userId === 'local') return
    let cancelado = false
    const traer = async () => {
      const { data, error } = await supabase.from('workspace_items').select('data').eq('kind', 'tarea')
      if (!cancelado && !error && Array.isArray(data)) remotas.current = data.map((r) => r.data)
    }
    traer()
    const id = setInterval(traer, REMOTO_MS)
    return () => { cancelado = true; clearInterval(id) }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    revisar()
    const id = setInterval(revisar, TICK_MS)
    const alVolver = () => { if (document.visibilityState === 'visible') revisar() }
    const alCambiarOtraPestana = (e) => {
      if (claves.current && e.key === claves.current.avisos) setAvisos(leer(e.key, []))
    }
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('storage', alCambiarOtraPestana)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('storage', alCambiarOtraPestana)
    }
  }, [userId, revisar])

  const marcarLeida = useCallback((id) => {
    guardar(leer(claves.current?.avisos, []).map((a) => (a.id === id ? { ...a, leida: true } : a)))
  }, [guardar])

  const marcarTodasLeidas = useCallback(() => {
    guardar(leer(claves.current?.avisos, []).map((a) => ({ ...a, leida: true })))
  }, [guardar])

  const borrarTodas = useCallback(() => guardar([]), [guardar])

  const descartarNuevo = useCallback((id) => {
    setNuevos((prev) => prev.filter((a) => a.id !== id))
  }, [])

  return {
    avisos,
    nuevos,
    sinLeer: avisos.filter((a) => !a.leida).length,
    marcarLeida,
    marcarTodasLeidas,
    borrarTodas,
    descartarNuevo
  }
}
