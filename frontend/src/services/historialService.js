import { createContext, useContext } from 'react'
import { supabase } from './supabaseClient'

/**
 * Historial de trabajo por contribuyente.
 * Se guarda en Supabase (tabla historial_trabajo) y queda hasta que el usuario lo elimine.
 * Si la nube no está disponible, queda en este equipo y se sube en cuanto se pueda.
 */

const TABLE = 'historial_trabajo'

export const ContribuyenteContext = createContext(null)
export const useContribuyente = () => useContext(ContribuyenteContext)

export const MODULOS = {
  rg90: 'Conciliación RG90',
  bancaria: 'Conciliación Bancaria',
  liquidacion: 'Liquidación Salarial',
  activofijo: 'Venta de Activo Fijo',
  flujo: 'Flujo de Caja',
  cotizacion: 'Cotización',
  'control-pagos': 'Control de Pagos'
}

const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)

async function sesion() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id || null
}

const claveLocal = (userId) => `quadra_historial:${userId || 'local'}`

const leerLocal = (userId) => {
  try {
    const list = JSON.parse(localStorage.getItem(claveLocal(userId)))
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

const escribirLocal = (userId, list) => {
  try {
    localStorage.setItem(claveLocal(userId), JSON.stringify(list))
    return true
  } catch (err) {
    console.error('No se pudo guardar el historial en este equipo:', err)
    return false
  }
}

const aFila = (item) => ({
  id: item.id,
  cliente_id: String(item.clienteId),
  cliente: item.cliente,
  modulo: item.modulo,
  titulo: item.titulo,
  resumen: item.resumen,
  datos: item.datos,
  created_at: item.createdAt
})

const deFila = (row) => ({
  id: row.id,
  clienteId: row.cliente_id,
  cliente: row.cliente,
  modulo: row.modulo,
  titulo: row.titulo,
  resumen: row.resumen || {},
  datos: row.datos,
  createdAt: row.created_at,
  origen: 'nube'
})

const datosCliente = (c) => ({
  razonSocial: c.razonSocial,
  ruc: c.ruc,
  ejercicio: c.ejercicio,
  apertura: c.apertura,
  cierre: c.cierre,
  actividad: c.actividadLabel || c.actividad,
  sucursal: c.sucursalLabel || c.sucursal
})

/** Guarda un resultado. Devuelve { item, destino: 'nube' | 'local' }. */
export async function guardarEnHistorial({ contribuyente, modulo, titulo, resumen = {}, datos }) {
  if (!contribuyente) throw new Error('No hay un contribuyente seleccionado')
  const ahora = new Date()
  const item = {
    id: nuevoId(),
    clienteId: String(contribuyente.clienteId),
    cliente: datosCliente(contribuyente),
    modulo,
    titulo,
    resumen: Object.fromEntries(Object.entries(resumen || {}).filter(([, v]) => v != null && v !== '')),
    // copia profunda y sin funciones/fechas raras
    datos: JSON.parse(JSON.stringify(datos ?? null)),
    createdAt: ahora.toISOString()
  }

  const userId = await sesion()
  if (userId) {
    const { error } = await supabase.from(TABLE).insert(aFila(item))
    if (!error) return { item: { ...item, origen: 'nube' }, destino: 'nube' }
    console.error('No se pudo guardar en la nube, queda en este equipo:', error)
  }

  const local = leerLocal(userId)
  if (!escribirLocal(userId, [{ ...item, origen: 'local' }, ...local])) {
    throw new Error('No se pudo guardar: el almacenamiento del navegador está lleno')
  }
  return { item: { ...item, origen: 'local' }, destino: 'local' }
}

/** Sube a la nube lo que quedó pendiente en este equipo. */
async function subirPendientes(userId) {
  const local = leerLocal(userId)
  if (!local.length) return
  const { error } = await supabase.from(TABLE).upsert(local.map(aFila), { onConflict: 'id' })
  if (!error) escribirLocal(userId, [])
}

/**
 * Lista el historial de un contribuyente (o de todos si clienteId es null).
 * Devuelve { items, nube: boolean }.
 */
export async function listarHistorial(clienteId) {
  const userId = await sesion()
  let remotos = []
  let nube = false

  if (userId) {
    await subirPendientes(userId)
    let q = supabase.from(TABLE).select('*').order('created_at', { ascending: false })
    if (clienteId != null) q = q.eq('cliente_id', String(clienteId))
    const { data, error } = await q
    if (error) {
      console.error('No se pudo leer el historial de la nube:', error)
    } else {
      remotos = data.map(deFila)
      nube = true
    }
  }

  const locales = leerLocal(userId)
    .filter((i) => clienteId == null || String(i.clienteId) === String(clienteId))
    .map((i) => ({ ...i, origen: 'local' }))

  const items = [...locales, ...remotos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return { items, nube }
}

export async function eliminarDeHistorial(item) {
  const userId = await sesion()
  if (item.origen === 'nube') {
    const { error } = await supabase.from(TABLE).delete().eq('id', item.id)
    if (error) throw error
  } else {
    escribirLocal(userId, leerLocal(userId).filter((i) => i.id !== item.id))
  }
}
