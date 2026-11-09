/**
 * Padrón de RUC de la DNIT (tabla public.ruc_dnit, ver supabase/migrations/20261111000000_ruc_dnit.sql).
 * Busca por RUC o por nombre para autocompletar formularios.
 */
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const cache = new Map()

const clave = (q) => String(q || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9-]+/g, ' ').trim()

/** ¿lo escrito alcanza para consultar? (3 dígitos de RUC o 3 letras de nombre) */
export const consultable = (q) => {
  const k = clave(q)
  return /^[\d.\s]+(-\s*\d?)?$/.test(k) ? k.split('-')[0].replace(/\D/g, '').length >= 3 : k.replace(/[^A-Z0-9]/g, '').length >= 3
}

/** [{ ruc: '80012345-6', base, dv, nombre, estado }] */
export async function buscarRucDnit(q, limite = 8) {
  const k = clave(q)
  if (!consultable(k)) return []
  const id = `${k}|${limite}`
  if (!cache.has(id)) {
    const p = supabase.rpc('buscar_ruc', { q: k, limite })
      .then(({ data, error }) => {
        if (error) throw error
        return (data || []).map((r) => ({ ruc: `${r.ruc}-${r.dv}`, base: r.ruc, dv: r.dv, nombre: r.nombre, estado: r.estado }))
      })
      .catch((e) => { cache.delete(id); console.warn('Padrón DNIT no disponible:', e.message || e); return [] })
    cache.set(id, p)
  }
  return cache.get(id)
}

/** el contribuyente con exactamente ese RUC (con o sin DV), o null */
export async function rucDnitExacto(ruc) {
  const base = String(ruc || '').split('-')[0].replace(/\D/g, '')
  if (base.length < 3) return null
  const lista = await buscarRucDnit(base, 3)
  return lista.find((r) => r.base === base) || null
}

/** resultados del padrón para lo que el usuario va escribiendo (con espera de 250 ms) */
export function useRucDnit(texto, limite = 8) {
  const [estado, setEstado] = useState({ q: '', resultados: [], cargando: false })
  useEffect(() => {
    if (!consultable(texto)) { setEstado({ q: '', resultados: [], cargando: false }); return undefined }
    let vigente = true
    setEstado((s) => ({ ...s, cargando: true }))
    const t = setTimeout(() => {
      buscarRucDnit(texto, limite).then((resultados) => { if (vigente) setEstado({ q: texto, resultados, cargando: false }) })
    }, 250)
    return () => { vigente = false; clearTimeout(t) }
  }, [texto, limite])
  return estado
}

/** etiqueta corta del estado ante la DNIT ('' si está activo) */
export const estadoDnit = (estado) => {
  if (!estado || estado === 'ACTIVO') return ''
  if (estado.startsWith('SUSPENSION')) return 'suspendido'
  if (estado.startsWith('CANCELADO')) return 'cancelado'
  if (estado === 'BLOQUEADO') return 'bloqueado'
  return estado.toLowerCase()
}
