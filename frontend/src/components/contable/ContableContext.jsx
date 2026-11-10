import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useCloudCollection } from '../../services/useCloudCollection'
import { supabase } from '../../services/supabaseClient'
import { armarPlan, nuevoId, analizarRuc, TIPOS } from '../../services/contabilidad'

const Ctx = createContext(null)
export const useContable = () => useContext(Ctx)

/* ── auditoría ──────────────────────────────────────────────── */

// campos de control: no cuentan como cambio
const INTERNOS = new Set(['id', 'clienteId', 'creadoEn', 'creadoPor', 'modificadoEn', 'modificadoPor', 'editadoEn'])

/** descripción corta del registro, para leer la auditoría sin abrirlo */
export const resumenDe = (coleccion, x) => {
  if (!x) return ''
  if (coleccion === 'comprobante') return [TIPOS[x.tipo]?.label || x.tipo, x.numero, x.personaNombre].filter(Boolean).join(' · ')
  if (coleccion === 'cuenta') return `${x.codigo || ''} ${x.nombre || ''}`.trim()
  if (coleccion === 'activo') return x.descripcion || ''
  if (coleccion === 'timbrado') return `Timbrado ${x.numero || ''} · ${x.establecimiento || ''}-${x.punto || ''}`
  if (coleccion === 'persona') return `${x.nombre || ''} · RUC ${x.ruc || ''}`
  return ''
}

const valorCorto = (v) => {
  if (v == null || v === '') return ''
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
  return s.length > 120 ? `${s.slice(0, 117)}…` : s
}

/** campos que cambiaron entre dos versiones, con el valor anterior y el nuevo */
const diferencias = (antes, despues) => {
  const claves = new Set([...Object.keys(antes || {}), ...Object.keys(despues || {})])
  const out = []
  claves.forEach((k) => {
    if (INTERNOS.has(k)) return
    const a = JSON.stringify(antes?.[k] ?? null)
    const b = JSON.stringify(despues?.[k] ?? null)
    if (a !== b) out.push({ campo: k, antes: valorCorto(antes?.[k]), despues: valorCorto(despues?.[k]) })
  })
  return out
}

/* ── colecciones ────────────────────────────────────────────── */

/**
 * Colección del contribuyente activo: { items, guardar(item), eliminar(id), status }.
 * Si recibe `registrar`, cada alta, modificación o baja deja su rastro en la auditoría
 * y el registro guarda quién lo creó y quién lo modificó por última vez.
 */
const usePorCliente = (kind, key, clienteId, registrar, usuario) => {
  const [todos, setTodos, status] = useCloudCollection(kind, key)
  const ultimo = useRef(todos)
  ultimo.current = todos
  const items = useMemo(() => todos.filter((x) => String(x.clienteId) === clienteId), [todos, clienteId])
  const guardar = (item) => {
    const id = item.id || nuevoId()
    const previo = ultimo.current.find((x) => x.id === id)
    const ahora = new Date().toISOString()
    const completo = {
      ...item,
      id,
      clienteId,
      creadoEn: item.creadoEn || previo?.creadoEn || ahora,
      ...(registrar ? {
        creadoPor: item.creadoPor || previo?.creadoPor || usuario,
        ...(previo ? { modificadoEn: ahora, modificadoPor: usuario } : {})
      } : {})
    }
    if (registrar) {
      const cambios = diferencias(previo, completo)
      if (!previo || cambios.length) registrar({ accion: previo ? 'modificacion' : 'alta', coleccion: kind, docId: id, ref: resumenDe(kind, completo), cambios: previo ? cambios : [] })
    }
    setTodos((prev) => (prev.some((x) => x.id === id) ? prev.map((x) => (x.id === id ? completo : x)) : [...prev, completo]))
    return completo
  }
  const eliminar = (id) => {
    const previo = ultimo.current.find((x) => x.id === id)
    if (registrar && previo) registrar({ accion: 'baja', coleccion: kind, docId: id, ref: resumenDe(kind, previo), cambios: [] })
    setTodos((prev) => prev.filter((x) => x.id !== id))
  }
  return { items, guardar, eliminar, status }
}

/**
 * Datos contables de un contribuyente, cargados una sola vez para todas las hojas.
 * Comprobantes, cuentas propias, activos y timbrados son de cada contribuyente;
 * las personas (RUC de clientes y proveedores) se comparten entre todos.
 * Cada cambio queda en la auditoría del contribuyente con el usuario que lo hizo.
 */
export function ContableProvider({ contribuyente, onNavigate, children }) {
  const clienteId = String(contribuyente.clienteId)
  const [usuario, setUsuario] = useState('Este equipo')
  useEffect(() => {
    let vivo = true
    supabase.auth.getSession()
      .then(({ data }) => { if (vivo && data?.session?.user?.email) setUsuario(data.session.user.email) })
      .catch(() => {})
    return () => { vivo = false }
  }, [])

  const auditoria = usePorCliente('auditoria', 'quadra_ct_auditoria', clienteId)
  const registrar = (e) => auditoria.guardar({ ...e, fecha: new Date().toISOString(), usuario })

  const comprobantes = usePorCliente('comprobante', 'quadra_ct_comprobantes', clienteId, registrar, usuario)
  const cuentas = usePorCliente('cuenta', 'quadra_ct_cuentas', clienteId, registrar, usuario)
  const activos = usePorCliente('activo', 'quadra_ct_activos', clienteId, registrar, usuario)
  const timbrados = usePorCliente('timbrado', 'quadra_ct_timbrados', clienteId, registrar, usuario)

  const [personasTodas, setPersonas, statusPersonas] = useCloudCollection('persona', 'quadra_ct_personas')
  const personasRef = useRef(personasTodas)
  personasRef.current = personasTodas
  const personas = {
    items: personasTodas,
    status: statusPersonas,
    guardar: (p) => {
      const id = p.id || nuevoId()
      const previo = personasRef.current.find((x) => x.id === id)
      const completo = { ...p, id, creadoEn: p.creadoEn || new Date().toISOString() }
      const cambios = diferencias(previo, completo)
      if (!previo || cambios.length) registrar({ accion: previo ? 'modificacion' : 'alta', coleccion: 'persona', docId: id, ref: resumenDe('persona', completo), cambios: previo ? cambios : [] })
      setPersonas((prev) => (prev.some((x) => x.id === id) ? prev.map((x) => (x.id === id ? completo : x)) : [...prev, completo]))
      return completo
    },
    eliminar: (id) => {
      const previo = personasRef.current.find((x) => x.id === id)
      if (previo) registrar({ accion: 'baja', coleccion: 'persona', docId: id, ref: resumenDe('persona', previo), cambios: [] })
      setPersonas((prev) => prev.filter((x) => x.id !== id))
    },
    /** agrega la persona si su RUC todavía no está catastrado */
    asegurar: (ruc, nombre, tipo) => {
      if (!ruc || !nombre) return
      setPersonas((prev) => {
        if (prev.some((x) => x.ruc === ruc)) return prev
        return [...prev, { id: nuevoId(), ruc, nombre, tipo, creadoEn: new Date().toISOString(), valido: analizarRuc(ruc).valido }]
      })
    }
  }

  const plan = useMemo(() => armarPlan(cuentas.items), [cuentas.items])
  const nombreCuenta = useMemo(() => {
    const m = new Map(plan.map((c) => [c.codigo, c.nombre]))
    return (codigo) => m.get(codigo) || 'Cuenta no encontrada'
  }, [plan])
  const imputables = useMemo(() => plan.filter((c) => c.imputable), [plan])

  const value = {
    contribuyente,
    ejercicio: Number(contribuyente.ejercicio) || new Date().getFullYear(),
    usuario,
    comprobantes,
    cuentas,
    activos,
    timbrados,
    personas,
    auditoria,
    plan,
    imputables,
    nombreCuenta,
    /** abre otra hoja de Quadra (libros, conciliación…) */
    ir: onNavigate || (() => {})
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
