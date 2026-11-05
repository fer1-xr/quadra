import React, { useEffect, useMemo, useState } from 'react'
import { LogIn, ChevronDown, Users, Plus } from 'lucide-react'
import { useCloudCollection } from '../services/useCloudCollection'
import { impuestoLabel, impuestosDe, sucursalesDe } from './GestionClientes'
import '../styles/SeleccionarContribuyente.css'

export const ACTIVIDADES = [
  { id: 'principal', label: 'Actividad principal' },
  { id: 'comercial', label: 'Comercial' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'industrial', label: 'Industrial' },
  { id: 'agropecuaria', label: 'Agropecuaria' }
]

// Sucursales que el usuario cargó al registrar al cliente en Gestión de Clientes
const opcionesSucursal = (cliente) => sucursalesDe(cliente).map((s) => ({
  id: s.codigo,
  label: s.nombre ? `${s.codigo} · ${s.nombre}` : s.codigo
}))

const thisYear = new Date().getFullYear()
const EJERCICIOS = Array.from({ length: 7 }, (_, i) => thisYear + 1 - i)

const rangoEjercicio = (year) => ({ apertura: `${year}-01-01`, cierre: `${year}-12-31` })

function Field({ label, children, disabled, floating }) {
  return (
    <label className={`q-pick__field ${disabled ? 'is-disabled' : ''} ${floating ? 'has-float' : ''}`}>
      <span className="q-pick__float">{label}</span>
      {children}
    </label>
  )
}

function SelectBox({ value, onChange, disabled, placeholder, options, ariaLabel }) {
  return (
    <span className="q-pick__select">
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} aria-label={ariaLabel}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" />
    </span>
  )
}

function SeleccionarContribuyente({ previo, onIngresar, onGestionarClientes }) {
  const [clientes, , status] = useCloudCollection('cliente', 'quadra_clientes')

  const [clienteId, setClienteId] = useState(previo?.clienteId ? String(previo.clienteId) : '')
  const [ejercicio, setEjercicio] = useState(previo?.ejercicio ? String(previo.ejercicio) : String(thisYear))
  const [apertura, setApertura] = useState(previo?.apertura || rangoEjercicio(thisYear).apertura)
  const [cierre, setCierre] = useState(previo?.cierre || rangoEjercicio(thisYear).cierre)
  const [actividad, setActividad] = useState(previo?.actividad || 'principal')
  const [sucursal, setSucursal] = useState(previo?.sucursal || '001')

  const clienteSel = useMemo(() => clientes.find((c) => String(c.id) === clienteId) || null, [clientes, clienteId])
  const sucursales = useMemo(() => opcionesSucursal(clienteSel), [clienteSel])
  const impuestos = impuestosDe(clienteSel).map(impuestoLabel)

  // la sucursal elegida tiene que pertenecer al cliente seleccionado
  useEffect(() => {
    if (!sucursales.some((s) => s.id === sucursal)) setSucursal(sucursales[0]?.id || '')
  }, [sucursales, sucursal])

  const opcionesClientes = useMemo(() => (
    [...clientes]
      .sort((a, b) => (a.razonSocial || '').localeCompare(b.razonSocial || '', 'es'))
      .map((c) => ({ id: String(c.id), label: `${c.razonSocial}${c.ruc ? ` — ${c.ruc}` : ''}` }))
  ), [clientes])

  // si el cliente guardado ya no existe, limpiar la selección
  useEffect(() => {
    if (status === 'loading' || !clienteId) return
    if (!clientes.some((c) => String(c.id) === clienteId)) setClienteId('')
  }, [clientes, clienteId, status])

  const cambiarEjercicio = (year) => {
    setEjercicio(year)
    if (year) {
      const r = rangoEjercicio(year)
      setApertura(r.apertura)
      setCierre(r.cierre)
    }
  }

  const sinCliente = !clienteId
  const fechasInvalidas = apertura && cierre && apertura > cierre
  const puedeIngresar = clienteId && ejercicio && apertura && cierre && !fechasInvalidas

  const ingresar = (e) => {
    e.preventDefault()
    if (!puedeIngresar) return
    const c = clientes.find((x) => String(x.id) === clienteId)
    onIngresar({
      clienteId: c.id,
      razonSocial: c.razonSocial,
      ruc: c.ruc,
      ejercicio: Number(ejercicio),
      apertura,
      cierre,
      actividad,
      actividadLabel: ACTIVIDADES.find((a) => a.id === actividad)?.label,
      sucursal,
      sucursalLabel: sucursales.find((s) => s.id === sucursal)?.label,
      impuestos: impuestosDe(c),
      impuestosLabel: impuestos.join(', ')
    })
  }

  const vacio = status !== 'loading' && clientes.length === 0

  return (
    <div className="q-pick">
      <form className="q-pick__card" onSubmit={ingresar} aria-labelledby="q-pick-title">
        <header className="q-pick__head">
          <svg className="q-pick__mark" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect className="q-pick__mark-a" x="1" y="1" width="11.5" height="11.5" rx="2.5" />
            <rect x="15.5" y="1" width="11.5" height="11.5" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="1" y="15.5" width="11.5" height="11.5" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="15.5" y="15.5" width="11.5" height="11.5" rx="2.5" fill="currentColor" />
          </svg>
          <p className="q-pick__brand">Quadra</p>
          <h1 id="q-pick-title" className="q-pick__title">Seleccionar contribuyente</h1>
          <p className="q-pick__lede">Elegí sobre qué cliente y período vas a trabajar.</p>
        </header>

        {vacio ? (
          <div className="q-pick__empty">
            <Users size={22} strokeWidth={1.6} />
            <p>Todavía no cargaste clientes.</p>
            <button type="button" className="q-btn q-btn--primary" onClick={onGestionarClientes}>
              <Plus size={16} strokeWidth={1.8} /> Agregar cliente
            </button>
          </div>
        ) : (
          <>
            <div className="q-pick__grid">
              <div className="q-pick__row q-pick__row--full">
                <Field label="Contribuyente" floating={!!clienteId}>
                  <SelectBox
                    ariaLabel="Contribuyente"
                    value={clienteId}
                    onChange={setClienteId}
                    placeholder={status === 'loading' ? 'Cargando clientes…' : 'Contribuyente'}
                    options={opcionesClientes}
                    disabled={status === 'loading'}
                  />
                </Field>
                {clienteSel && impuestos.length > 0 && (
                  <p className="q-pick__meta">Impuestos: {impuestos.join(' · ')}</p>
                )}
              </div>

              <div className="q-pick__row q-pick__row--3">
                <Field label="Ejercicio" disabled={sinCliente} floating>
                  <SelectBox
                    ariaLabel="Ejercicio"
                    value={ejercicio}
                    onChange={cambiarEjercicio}
                    disabled={sinCliente}
                    options={EJERCICIOS.map((y) => ({ id: String(y), label: String(y) }))}
                  />
                </Field>
                <Field label="Apertura" disabled={sinCliente} floating>
                  <input className="q-pick__input" type="date" value={apertura} onChange={(e) => setApertura(e.target.value)} disabled={sinCliente} />
                </Field>
                <Field label="Cierre" disabled={sinCliente} floating>
                  <input className="q-pick__input" type="date" value={cierre} onChange={(e) => setCierre(e.target.value)} disabled={sinCliente} />
                </Field>
              </div>

              <div className="q-pick__row q-pick__row--2">
                <Field label="Actividad" disabled={sinCliente} floating>
                  <SelectBox ariaLabel="Actividad" value={actividad} onChange={setActividad} disabled={sinCliente} options={ACTIVIDADES} />
                </Field>
                <Field label="Sucursal" disabled={sinCliente} floating>
                  <SelectBox ariaLabel="Sucursal" value={sucursal} onChange={setSucursal} disabled={sinCliente} options={sucursales} />
                </Field>
              </div>
            </div>

            {fechasInvalidas && <p className="q-pick__error" role="alert">La fecha de apertura no puede ser posterior al cierre.</p>}

            <button type="submit" className="q-btn q-btn--primary q-btn--block q-pick__submit" disabled={!puedeIngresar}>
              <LogIn size={17} strokeWidth={1.8} /> Ingresar
            </button>

            <button type="button" className="q-pick__link" onClick={onGestionarClientes}>
              Gestionar clientes
            </button>
          </>
        )}
      </form>
    </div>
  )
}

export default SeleccionarContribuyente
