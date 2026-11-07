import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'

const TABLE = 'workspace_items'
const SAVE_DELAY = 500

const readCache = (key) => {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * Lista persistida en Supabase (tabla workspace_items), con copia local
 * para mostrar los datos al instante y seguir funcionando sin conexión.
 *
 * kind:      'cliente' | 'tarea' | 'meta' | 'recordatorio' | 'nota' | 'favorito'
 * legacyKey: clave antigua de localStorage; si la cuenta aún no tiene datos
 *            en la nube, lo guardado ahí se sube una sola vez.
 *
 * Devuelve [items, setItems, status]. status: 'loading' | 'saved' | 'saving' | 'local' | 'error'
 */
export function useCloudCollection(kind, legacyKey) {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('loading')
  const [ready, setReady] = useState(false)

  const ctx = useRef({ userId: null, cacheKey: null, remote: new Map(), online: false })
  const timer = useRef(null)
  const latest = useRef(items)
  latest.current = items

  const sync = useCallback(async () => {
    const { userId, remote } = ctx.current
    if (!ctx.current.online || !userId) return
    const list = latest.current

    const upserts = []
    const seen = new Set()
    for (const item of list) {
      const id = String(item.id)
      seen.add(id)
      const json = JSON.stringify(item)
      if (remote.get(id) !== json) upserts.push({ user_id: userId, kind, id, data: item, json })
    }
    const deletes = [...remote.keys()].filter((id) => !seen.has(id))
    if (!upserts.length && !deletes.length) {
      setStatus('saved')
      return
    }

    setStatus('saving')
    try {
      if (upserts.length) {
        const { error } = await supabase
          .from(TABLE)
          .upsert(upserts.map(({ json, ...row }) => row), { onConflict: 'user_id,kind,id' })
        if (error) throw error
        upserts.forEach((u) => remote.set(u.id, u.json))
      }
      if (deletes.length) {
        const { error } = await supabase.from(TABLE).delete().eq('kind', kind).in('id', deletes)
        if (error) throw error
        deletes.forEach((id) => remote.delete(id))
      }
      setStatus('saved')
    } catch (err) {
      console.error(`No se pudo guardar ${kind} en la base de datos:`, err)
      setStatus('error')
    }
  }, [kind])

  // carga inicial
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id || null
      const cacheKey = `${legacyKey}:${userId || 'local'}`
      ctx.current = { userId, cacheKey, remote: new Map(), online: false }

      const cached = readCache(cacheKey) ?? readCache(legacyKey) ?? []
      if (!cancelled) setItems(cached)

      if (!userId) {
        if (!cancelled) { setStatus('local'); setReady(true) }
        return
      }

      const { data, error } = await supabase
        .from(TABLE)
        .select('id, data')
        .eq('kind', kind)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })

      if (cancelled) return

      if (error) {
        console.error(`No se pudo leer ${kind} de la base de datos:`, error)
        setStatus('error')
        setReady(true)
        return
      }

      ctx.current.online = true
      data.forEach((row) => ctx.current.remote.set(row.id, JSON.stringify(row.data)))

      if (data.length) {
        setItems(data.map((row) => row.data))
        setStatus('saved')
      } else {
        // cuenta sin datos en la nube: subir lo que había en este equipo
        setStatus(cached.length ? 'saving' : 'saved')
      }
      setReady(true)
    })()

    return () => { cancelled = true }
  }, [kind, legacyKey])

  // guardar cada cambio (solo después de cargar, para no pisar datos)
  useEffect(() => {
    if (!ready) return
    const { cacheKey } = ctx.current
    if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(items))
    if (!ctx.current.online) return

    clearTimeout(timer.current)
    timer.current = setTimeout(() => { timer.current = null; sync() }, SAVE_DELAY)
  }, [items, ready, sync])

  // no perder el último cambio al salir de la hoja
  useEffect(() => () => {
    if (timer.current) {
      clearTimeout(timer.current)
      sync()
    }
  }, [sync])

  return [items, setItems, status]
}

export const SYNC_LABELS = {
  loading: 'Cargando…',
  saving: 'Guardando…',
  saved: 'Guardado en la nube',
  local: 'Guardado solo en este equipo',
  error: 'No se pudo guardar en la nube'
}
