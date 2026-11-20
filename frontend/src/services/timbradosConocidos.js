/**
 * Padrón propio de timbrados de Quadra (tabla public.timbrados_conocidos,
 * ver supabase/migrations/20261120100000_timbrados_conocidos.sql).
 * Se alimenta solo con cada conciliación RG90 (el backend lee el timbrado y el RUC
 * de cada comprobante) y es compartido entre todas las cuentas de Quadra.
 * La DNIT no ofrece una consulta timbrado → RUC.
 */
import { supabase } from './supabaseClient'
import { dvRuc } from './contabilidad'

const cache = new Map()

/**
 * Quién emite el timbrado según el padrón: { ruc: '80012345-6', nombre, usos, otros, compartido: true } | null.
 * Misma forma que `quienTimbro` del ContableContext, para usarlos indistintamente.
 */
export function buscarTimbradoConocido(timbrado) {
  const t = String(timbrado || '').replace(/\D/g, '')
  if (!/^\d{8}$/.test(t)) return Promise.resolve(null)
  if (!cache.has(t)) {
    const p = supabase.rpc('buscar_timbrado', { t })
      .then(({ data, error }) => {
        if (error) throw error
        const lista = (data || [])
          .filter((r) => r.nombre)
          .map((r) => ({
            ruc: `${r.ruc}-${r.dv ?? dvRuc(r.ruc)}`,
            nombre: r.nombre,
            estado: r.estado || '',
            usos: r.usos || 1,
            fecha: r.ultimo || ''
          }))
        if (!lista.length) return null
        return { ...lista[0], otros: lista.slice(1), compartido: true }
      })
      .catch((e) => { cache.delete(t); console.warn('Padrón de timbrados no disponible:', e.message || e); return null })
    cache.set(t, p)
  }
  return cache.get(t)
}
