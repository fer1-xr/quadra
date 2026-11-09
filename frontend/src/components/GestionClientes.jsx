import React, { useState, useEffect } from 'react'
import PageHead, { Figures } from './PageHead'
import { useCloudCollection } from '../services/useCloudCollection'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import { Card, CardBody, CardHeader, Button, Input, Select, SelectItem, Spinner, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip } from '@heroui/react'
import { Plus, Edit2, Trash2, Download, Users, X, Pencil, Check, LogIn } from 'lucide-react'
import '../styles/GestionClientes.css'
import CampoDnit from './CampoDnit'
import { rucDnitExacto } from '../services/rucDnit'

// Impuestos vigentes en Paraguay
export const TIPOS_IMPUESTO = [
  { id: 'iva', label: 'IVA' },
  { id: 'irp', label: 'IRP' },
  { id: 'irp_rsp', label: 'IRP Servicios Profesionales' },
  { id: 'irp_rgc', label: 'IRP Ganancia de Capital' },
  { id: 'ire_simple', label: 'IRE Simple' },
  { id: 'ire_resimple', label: 'IRE Resimple' },
  { id: 'ire_general', label: 'IRE General' }
]

// Valores de la lista anterior: se siguen mostrando en clientes ya cargados
// y se descartan al editar el cliente.
const IMPUESTOS_ANTERIORES = {
  mre: 'MRE',
  ipc: 'IPC',
  exento: 'Exento',
  monotributo: 'Monotributo'
}

export const impuestoLabel = (id) => (
  TIPOS_IMPUESTO.find((t) => t.id === id)?.label || IMPUESTOS_ANTERIORES[id] || id
)

export const SUCURSAL_INICIAL = { codigo: '001', nombre: 'Casa matriz' }

const CLIENTE_VACIO = {
  razonSocial: '',
  ruc: '',
  sena: '',
  impuestos: ['iva'],
  sucursales: [SUCURSAL_INICIAL],
  alDia: false,
  honorarios: '',
  pagoAlDia: false,
  facturado: false
}

// Los clientes cargados antes tenían un solo `tipoImpuesto` y ninguna sucursal.
export const impuestosDe = (c) => (
  Array.isArray(c?.impuestos) ? c.impuestos : (c?.tipoImpuesto ? [c.tipoImpuesto] : [])
)
export const sucursalesDe = (c) => (
  Array.isArray(c?.sucursales) && c.sucursales.length ? c.sucursales : [SUCURSAL_INICIAL]
)

function GestionClientes({ onTrabajar }) {
  const [clientes, setClientes, syncStatus] = useCloudCollection('cliente', 'quadra_clientes')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [nuevoCliente, setNuevoCliente] = useState(CLIENTE_VACIO)

  const desdeDnit = (r) => setNuevoCliente((c) => ({ ...c, ruc: r.ruc, razonSocial: r.nombre }))
  // RUC escrito sin razón social: la trae del padrón de la DNIT
  const completarRazonSocial = async () => {
    const ruc = nuevoCliente.ruc.trim()
    if (nuevoCliente.razonSocial.trim() || ruc.split('-')[0].replace(/\D/g, '').length < 5) return
    const r = await rucDnitExacto(ruc)
    if (r) setNuevoCliente((c) => (c.razonSocial.trim() || c.ruc.trim() !== ruc ? c : { ...c, ruc: r.ruc, razonSocial: r.nombre }))
  }

  const agregarOActualizarCliente = () => {
    if (!nuevoCliente.razonSocial.trim() || !nuevoCliente.ruc.trim()) {
      alert('Completa razón social y RUC')
      return
    }
    if (nuevoCliente.impuestos.length === 0) {
      alert('Marcá al menos un impuesto')
      return
    }
    const sucursales = nuevoCliente.sucursales
      .map((s) => ({ codigo: s.codigo.trim(), nombre: s.nombre.trim() }))
      .filter((s) => s.codigo || s.nombre)
    if (sucursales.length === 0) {
      alert('Cargá al menos una sucursal')
      return
    }
    if (sucursales.some((s) => !s.codigo)) {
      alert('Cada sucursal necesita un código (ej: 001)')
      return
    }
    if (new Set(sucursales.map((s) => s.codigo)).size !== sucursales.length) {
      alert('Hay códigos de sucursal repetidos')
      return
    }
    const datos = { ...nuevoCliente, sucursales, tipoImpuesto: nuevoCliente.impuestos[0] }

    if (editandoId) {
      setClientes(clientes.map(c =>
        c.id === editandoId ? { ...datos, id: editandoId } : c
      ))
      setEditandoId(null)
    } else {
      setClientes([...clientes, {
        id: Date.now(),
        ...datos
      }])
    }

    setNuevoCliente(CLIENTE_VACIO)
    setMostrarFormulario(false)
  }

  const editarCliente = (cliente) => {
    setNuevoCliente({ ...CLIENTE_VACIO, ...cliente, impuestos: impuestosDe(cliente).filter((id) => TIPOS_IMPUESTO.some((t) => t.id === id)), sucursales: sucursalesDe(cliente) })
    setEditandoId(cliente.id)
    setMostrarFormulario(true)
  }

  const eliminarCliente = (id) => {
    if (window.confirm('¿Eliminar este cliente?')) {
      setClientes(clientes.filter(c => c.id !== id))
    }
  }

  const cancelarEdicion = () => {
    setNuevoCliente(CLIENTE_VACIO)
    setEditandoId(null)
    setMostrarFormulario(false)
  }

  const toggleAlDia = (id) => {
    setClientes(clientes.map(c =>
      c.id === id ? { ...c, alDia: !c.alDia } : c
    ))
  }

  const togglePagoAlDia = (id) => {
    setClientes(clientes.map(c =>
      c.id === id ? { ...c, pagoAlDia: !c.pagoAlDia } : c
    ))
  }

  const toggleFacturado = (id) => {
    setClientes(clientes.map(c =>
      c.id === id ? { ...c, facturado: !c.facturado } : c
    ))
  }

  const getTipoImpuestoLabel = (id) => {
    return impuestoLabel(id)
  }
  const impuestosLabel = (c) => impuestosDe(c).map(getTipoImpuestoLabel).join(', ')
  const sucursalesLabel = (c) => sucursalesDe(c).map((s) => `${s.codigo}${s.nombre ? ` · ${s.nombre}` : ''}`).join(', ')

  const toggleImpuesto = (id) => {
    const actuales = nuevoCliente.impuestos
    setNuevoCliente({
      ...nuevoCliente,
      impuestos: actuales.includes(id) ? actuales.filter((x) => x !== id) : [...actuales, id]
    })
  }

  const cambiarSucursal = (i, campo, valor) => {
    setNuevoCliente({
      ...nuevoCliente,
      sucursales: nuevoCliente.sucursales.map((s, j) => (j === i ? { ...s, [campo]: valor } : s))
    })
  }

  const agregarSucursal = () => {
    const usados = nuevoCliente.sucursales.map((s) => parseInt(s.codigo, 10)).filter((n) => !isNaN(n))
    const siguiente = String((usados.length ? Math.max(...usados) : 0) + 1).padStart(3, '0')
    setNuevoCliente({ ...nuevoCliente, sucursales: [...nuevoCliente.sucursales, { codigo: siguiente, nombre: '' }] })
  }

  const quitarSucursal = (i) => {
    setNuevoCliente({ ...nuevoCliente, sucursales: nuevoCliente.sucursales.filter((_, j) => j !== i) })
  }

  const exportarAExcel = () => {
    const datosExcel = clientes.map(c => ({
      'Razón Social': c.razonSocial,
      'RUC': c.ruc,
      'Seña': c.sena || '',
      'Impuestos': impuestosLabel(c),
      'Sucursales': sucursalesLabel(c),
      '¿Al día?': c.alDia ? 'Sí' : 'No',
      'Honorarios (GS)': c.honorarios || '',
      '¿Pago al día?': c.pagoAlDia ? 'Sí' : 'No',
      '¿Facturado?': c.facturado ? 'Sí' : 'No'
    }))

    const ws = XLSX.utils.json_to_sheet(datosExcel)
    ws['!cols'] = [
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 28 },
      { wch: 10 },
      { wch: 15 },
      { wch: 10 },
      { wch: 12 }
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
    XLSX.writeFile(wb, `Clientes_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const exportarAPDF = () => {
    const doc = new jsPDF()
    const fechaActual = new Date().toLocaleDateString('es-PY')

    doc.setFontSize(16)
    doc.text('Gestión de Clientes', 14, 15)
    doc.setFontSize(10)
    doc.text(`Generado: ${fechaActual}`, 14, 22)
    doc.text(`Total de clientes: ${clientes.length}`, 14, 28)

    let y = 35
    const pageHeight = doc.internal.pageSize.height
    const lineHeight = 7

    clientes.forEach((cliente, index) => {
      if (y > pageHeight - 20) {
        doc.addPage()
        y = 15
      }

      doc.setFontSize(11)
      doc.setFont(undefined, 'bold')
      doc.text(`${index + 1}. ${cliente.razonSocial}`, 14, y)
      y += lineHeight

      doc.setFontSize(9)
      doc.setFont(undefined, 'normal')
      doc.text(`RUC: ${cliente.ruc}`, 14, y)
      y += lineHeight

      if (cliente.sena) {
        doc.text(`Seña: ${cliente.sena}`, 14, y)
        y += lineHeight
      }

      doc.text(`Impuestos: ${impuestosLabel(cliente)}`, 14, y)
      y += lineHeight

      doc.text(`Sucursales: ${sucursalesLabel(cliente)}`, 14, y)
      y += lineHeight

      doc.text(`¿Al día?: ${cliente.alDia ? '✓ Sí' : '✕ No'} | ¿Pago al día?: ${cliente.pagoAlDia ? '✓ Sí' : '✕ No'} | ¿Facturado?: ${cliente.facturado ? '✓ Sí' : '✕ No'}`, 14, y)
      y += lineHeight

      if (cliente.honorarios) {
        doc.text(`Honorarios: ${parseFloat(cliente.honorarios).toLocaleString('es-PY')} GS`, 14, y)
        y += lineHeight
      }

      y += 2
    })

    doc.save(`Clientes_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const clientesFiltrados = clientes.filter(c =>
    c.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.ruc.includes(busqueda)
  )

  const clientesAlDia = clientes.filter(c => c.alDia).length
  const clientesPagosAlDia = clientes.filter(c => c.pagoAlDia).length
  const honorariosTotal = clientes.reduce((sum, c) => sum + (parseFloat(c.honorarios) || 0), 0)

  return (
    <div className="gestion-clientes">
      <PageHead
        title="Gestión de Clientes"
        lede="Administra tu listado de clientes y servicios."
        equation={[{ op: 'Σ' }, { v: 'Honorarios' }, { op: '=' }, { n: honorariosTotal.toLocaleString('es-PY', { maximumFractionDigits: 0 }) }]}
        caption="cartera de clientes"
        status={syncStatus}
      />
      <div className="clientes-header">
        {clientes.length > 0 && (
          <div className="clientes-exportar">
            <button
              className="btn-export btn-export-excel"
              onClick={exportarAExcel}
              title="Descargar en formato Excel"
            >
              Excel
            </button>
            <button
              className="btn-export btn-export-pdf"
              onClick={exportarAPDF}
              title="Descargar en formato PDF"
            >
              PDF
            </button>
          </div>
        )}
        <Figures items={[
          { label: 'Total clientes', value: clientes.length },
          { label: 'Cuentas al día', value: <>{clientesAlDia}<small> / {clientes.length}</small></>, tone: clientesAlDia ? 'ok' : undefined },
          { label: 'Pagos al día', value: <>{clientesPagosAlDia}<small> / {clientes.length}</small></>, tone: clientesPagosAlDia ? 'ok' : undefined },
          { label: 'Honorarios total', value: <>{honorariosTotal.toLocaleString('es-PY', { maximumFractionDigits: 0 })}<small> Gs.</small></> }
        ]} />
      </div>

      {/* Formulario para agregar/editar cliente */}
      {mostrarFormulario && (
        <div className="clientes-form">
          <h4>{editandoId ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}</h4>

          <div className="form-row-2">
            <div className="form-group">
              <label>Razón Social *</label>
              <CampoDnit
                id="cli-razon"
                className=""
                type="text"
                value={nuevoCliente.razonSocial}
                onChange={(t) => setNuevoCliente((c) => ({ ...c, razonSocial: t }))}
                onElegir={desdeDnit}
                placeholder="Ej: Empresa XYZ S.A. (busca en el padrón de la DNIT)"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>RUC *</label>
              <CampoDnit
                id="cli-ruc"
                className=""
                type="text"
                value={nuevoCliente.ruc}
                onChange={(t) => setNuevoCliente((c) => ({ ...c, ruc: t }))}
                onElegir={desdeDnit}
                inputProps={{ onBlur: completarRazonSocial }}
                placeholder="Ej: 80123456-7"
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Seña</label>
              <input
                type="text"
                value={nuevoCliente.sena}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, sena: e.target.value })}
                placeholder="Ej: Sucursal Centro"
              />
            </div>
          </div>

          <fieldset className="form-group form-fieldset">
            <legend>Impuestos *</legend>
            <p className="form-hint">Marcá todas las obligaciones que tiene el cliente.</p>
            <div className="impuestos-chips">
              {TIPOS_IMPUESTO.map((tipo) => {
                const activo = nuevoCliente.impuestos.includes(tipo.id)
                return (
                  <button
                    key={tipo.id}
                    type="button"
                    className={`impuesto-chip ${activo ? 'is-on' : ''}`}
                    aria-pressed={activo}
                    onClick={() => toggleImpuesto(tipo.id)}
                  >
                    {activo && <Check size={13} strokeWidth={2.2} aria-hidden="true" />}
                    {tipo.label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="form-group form-fieldset">
            <legend>Sucursales *</legend>
            <p className="form-hint">Código de establecimiento y nombre. La primera se usa por defecto al ingresar al cliente.</p>
            <div className="sucursales-list">
              {nuevoCliente.sucursales.map((suc, i) => (
                <div className="sucursal-row" key={i}>
                  <input
                    type="text"
                    className="sucursal-codigo"
                    value={suc.codigo}
                    onChange={(e) => cambiarSucursal(i, 'codigo', e.target.value)}
                    placeholder="001"
                    aria-label={`Código de sucursal ${i + 1}`}
                    maxLength={6}
                  />
                  <input
                    type="text"
                    value={suc.nombre}
                    onChange={(e) => cambiarSucursal(i, 'nombre', e.target.value)}
                    placeholder={i === 0 ? 'Casa matriz' : 'Ej: Sucursal San Lorenzo'}
                    aria-label={`Nombre de sucursal ${i + 1}`}
                  />
                  <button
                    type="button"
                    className="btn-accion btn-eliminar"
                    onClick={() => quitarSucursal(i)}
                    disabled={nuevoCliente.sucursales.length === 1}
                    title="Quitar sucursal"
                    aria-label={`Quitar sucursal ${i + 1}`}
                  >
                    <X size={14} strokeWidth={1.8} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-link-add" onClick={agregarSucursal}>
              <Plus size={14} strokeWidth={1.8} /> Agregar sucursal
            </button>
          </fieldset>

          <div className="form-row-2">
            <div className="form-group">
              <label>Honorarios Profesionales</label>
              <div className="input-with-currency">
                <input
                  type="number"
                  value={nuevoCliente.honorarios}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, honorarios: e.target.value })}
                  placeholder="Ej: 500000"
                />
                <span className="currency">GS.</span>
              </div>
            </div>
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={nuevoCliente.alDia}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, alDia: e.target.checked })}
                />
                <span>¿Cuenta al día?</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={nuevoCliente.pagoAlDia}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, pagoAlDia: e.target.checked })}
                />
                <span>¿Pago al día?</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={nuevoCliente.facturado}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, facturado: e.target.checked })}
                />
                <span>¿Facturado?</span>
              </label>
            </div>
          </div>

          <div className="form-buttons">
            <button className="btn btn-primary" onClick={agregarOActualizarCliente}>
              {editandoId ? 'Actualizar Cliente' : 'Agregar Cliente'}
            </button>
            <button className="btn btn-secondary" onClick={cancelarEdicion}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Botón para mostrar formulario */}
      {!mostrarFormulario && (
        <button className="btn btn-add-cliente" onClick={() => setMostrarFormulario(true)}>
          <Plus size={16} strokeWidth={1.8} /> Agregar Cliente
        </button>
      )}

      {/* Búsqueda */}
      {clientes.length > 0 && (
        <div className="busqueda-box">
          <input
            type="text"
            placeholder="Buscar por razón social o RUC..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      )}

      {/* Tabla de clientes */}
      {clientesFiltrados.length === 0 ? (
        <div className="clientes-vacio">
          <p>{clientes.length === 0 ? 'No hay clientes registrados' : 'No se encontraron resultados'}</p>
        </div>
      ) : (
        <div className="clientes-table-wrapper">
          <table className="clientes-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Razón Social</th>
                <th>RUC</th>
                <th>Seña</th>
                <th>Impuestos</th>
                <th>Sucursales</th>
                <th>¿Al día?</th>
                <th>Honorarios</th>
                <th>¿Pago al día?</th>
                <th>¿Facturado?</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((cliente, index) => (
                <tr key={cliente.id} className={`${cliente.alDia ? 'al-dia' : 'atrasado'}`}>
                  <td className="numero">{index + 1}</td>
                  <td className="razon-social">{cliente.razonSocial}</td>
                  <td className="ruc">{cliente.ruc}</td>
                  <td className="sena">{cliente.sena || '-'}</td>
                  <td className="tipo-impuesto">
                    <span className="badges">
                      {impuestosDe(cliente).map((id) => <span key={id} className="badge">{getTipoImpuestoLabel(id)}</span>)}
                    </span>
                  </td>
                  <td className="sucursales-cell">
                    {sucursalesDe(cliente).map((suc) => (
                      <span key={suc.codigo} className="sucursal-item"><b>{suc.codigo}</b>{suc.nombre ? ` ${suc.nombre}` : ''}</span>
                    ))}
                  </td>
                  <td className="checkbox-cell">
                    <button
                      className={`status-badge ${cliente.alDia ? 'si' : 'no'} clickable-badge`}
                      onClick={() => toggleAlDia(cliente.id)}
                      title="Click para cambiar estado"
                    >
                      {cliente.alDia ? <Check size={14} strokeWidth={2} aria-label="Sí" /> : <X size={14} strokeWidth={2} aria-label="No" />}
                    </button>
                  </td>
                  <td className="honorarios">
                    {cliente.honorarios ? `${parseFloat(cliente.honorarios).toLocaleString('es-PY', { maximumFractionDigits: 0 })} GS` : '-'}
                  </td>
                  <td className="checkbox-cell">
                    <button
                      className={`status-badge ${cliente.pagoAlDia ? 'si' : 'no'} clickable-badge`}
                      onClick={() => togglePagoAlDia(cliente.id)}
                      title="Click para cambiar estado"
                    >
                      {cliente.pagoAlDia ? <Check size={14} strokeWidth={2} aria-label="Sí" /> : <X size={14} strokeWidth={2} aria-label="No" />}
                    </button>
                  </td>
                  <td className="checkbox-cell">
                    <button
                      className={`status-badge ${cliente.facturado ? 'si' : 'no'} clickable-badge`}
                      onClick={() => toggleFacturado(cliente.id)}
                      title="Click para cambiar estado"
                    >
                      {cliente.facturado ? <Check size={14} strokeWidth={2} aria-label="Sí" /> : <X size={14} strokeWidth={2} aria-label="No" />}
                    </button>
                  </td>
                  <td className="acciones">
                    {onTrabajar && (
                      <button
                        className="btn-accion btn-trabajar"
                        onClick={() => onTrabajar(cliente.id)}
                        title="Trabajar en este cliente"
                        aria-label={`Trabajar en ${cliente.razonSocial}`}
                      >
                        <LogIn size={14} strokeWidth={1.8} />
                      </button>
                    )}
                    <button
                      className="btn-accion btn-editar"
                      onClick={() => editarCliente(cliente)}
                      title="Editar cliente"
                    >
                      <Pencil size={14} strokeWidth={1.8} />
                    </button>
                    <button
                      className="btn-accion btn-eliminar"
                      onClick={() => eliminarCliente(cliente.id)}
                      title="Eliminar cliente"
                    >
                      <X size={14} strokeWidth={1.8} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}

export default GestionClientes
