import React, { createContext, useContext, useMemo } from 'react'
import { useCloudCollection } from '../../services/useCloudCollection'
import { armarPlan, nuevoId, analizarRuc } from '../../services/contabilidad'

const Ctx = createContext(null)
export const useContable = () => useContext(Ctx)

/** colección del contribuyente activo: [items, guardar(item), eliminar(id), status] */
const usePorCliente = (kind, key, clienteId) => {
  const [todos, setTodos, status] = useCloudCollection(kind, key)
  const items = useMemo(() => todos.filter((x) => String(x.clienteId) === clienteId), [todos, clienteId])
  const guardar = (item) => {
    const id = item.id || nuevoId()
    const completo = { ...item, id, clienteId, creadoEn: item.creadoEn || new Date().toISOString() }
    setTodos((prev) => (prev.some((x) => x.id === id) ? prev.map((x) => (x.id === id ? completo : x)) : [...prev, completo]))
    return completo
  }
  const eliminar = (id) => setTodos((prev) => prev.filter((x) => x.id !== id))
  return { items, guardar, eliminar, status }
}

/**
 * Datos contables de un contribuyente, cargados una sola vez para todas las hojas.
 * Comprobantes, cuentas propias, activos y timbrados son de cada contribuyente;
 * las personas (RUC de clientes y proveedores) se comparten entre todos.
 */
export function ContableProvider({ contribuyente, children }) {
  const clienteId = String(contribuyente.clienteId)
  const comprobantes = usePorCliente('comprobante', 'quadra_ct_comprobantes', clienteId)
  const cuentas = usePorCliente('cuenta', 'quadra_ct_cuentas', clienteId)
  const activos = usePorCliente('activo', 'quadra_ct_activos', clienteId)
  const timbrados = usePorCliente('timbrado', 'quadra_ct_timbrados', clienteId)

  const [personasTodas, setPersonas, statusPersonas] = useCloudCollection('persona', 'quadra_ct_personas')
  const personas = {
    items: personasTodas,
    status: statusPersonas,
    guardar: (p) => {
      const id = p.id || nuevoId()
      const completo = { ...p, id, creadoEn: p.creadoEn || new Date().toISOString() }
      setPersonas((prev) => (prev.some((x) => x.id === id) ? prev.map((x) => (x.id === id ? completo : x)) : [...prev, completo]))
      return completo
    },
    eliminar: (id) => setPersonas((prev) => prev.filter((x) => x.id !== id)),
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
    comprobantes,
    cuentas,
    activos,
    timbrados,
    personas,
    plan,
    imputables,
    nombreCuenta
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
