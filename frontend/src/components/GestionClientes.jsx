import React, { useState, useEffect } from 'react'
import '../styles/GestionClientes.css'

const TIPOS_IMPUESTO = [
  { id: 'iva', label: 'IVA' },
  { id: 'mre', label: 'MRE' },
  { id: 'ipc', label: 'IPC' },
  { id: 'exento', label: 'Exento' },
  { id: 'monotributo', label: 'Monotributo' }
]

function GestionClientes() {
  const [clientes, setClientes] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [nuevoCliente, setNuevoCliente] = useState({
    razonSocial: '',
    ruc: '',
    sena: '',
    tipoImpuesto: 'iva',
    alDia: false,
    honorarios: '',
    pagoAlDia: false,
    facturado: false
  })

  // Cargar clientes del localStorage
  useEffect(() => {
    const clientesGuardados = localStorage.getItem('quadra_clientes')
    if (clientesGuardados) {
      setClientes(JSON.parse(clientesGuardados))
    }
  }, [])

  // Guardar clientes en localStorage
  useEffect(() => {
    localStorage.setItem('quadra_clientes', JSON.stringify(clientes))
  }, [clientes])

  const agregarOActualizarCliente = () => {
    if (!nuevoCliente.razonSocial.trim() || !nuevoCliente.ruc.trim()) {
      alert('Completa razón social y RUC')
      return
    }

    if (editandoId) {
      setClientes(clientes.map(c =>
        c.id === editandoId ? { ...nuevoCliente, id: editandoId } : c
      ))
      setEditandoId(null)
    } else {
      setClientes([...clientes, {
        id: Date.now(),
        ...nuevoCliente
      }])
    }

    setNuevoCliente({
      razonSocial: '',
      ruc: '',
      sena: '',
      tipoImpuesto: 'iva',
      alDia: false,
      honorarios: '',
      pagoAlDia: false,
      facturado: false
    })
    setMostrarFormulario(false)
  }

  const editarCliente = (cliente) => {
    setNuevoCliente(cliente)
    setEditandoId(cliente.id)
    setMostrarFormulario(true)
  }

  const eliminarCliente = (id) => {
    if (window.confirm('¿Eliminar este cliente?')) {
      setClientes(clientes.filter(c => c.id !== id))
    }
  }

  const cancelarEdicion = () => {
    setNuevoCliente({
      razonSocial: '',
      ruc: '',
      sena: '',
      tipoImpuesto: 'iva',
      alDia: false,
      honorarios: '',
      pagoAlDia: false,
      facturado: false
    })
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
    return TIPOS_IMPUESTO.find(t => t.id === id)?.label || id
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
      <div className="clientes-header">
        <div className="clientes-titulo">
          <h3>👥 Gestión de Clientes</h3>
          <p className="clientes-subtitulo">Administra tu listado de clientes y servicios</p>
        </div>
        <div className="clientes-stats">
          <div className="stat-box">
            <span className="stat-number">{clientes.length}</span>
            <span className="stat-label">Total Clientes</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{clientesAlDia}</span>
            <span className="stat-label">Cuentas al Día</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{clientesPagosAlDia}</span>
            <span className="stat-label">Pagos al Día</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{honorariosTotal.toLocaleString('es-PY', { maximumFractionDigits: 0 })}</span>
            <span className="stat-label">Honorarios Total</span>
          </div>
        </div>
      </div>

      {/* Formulario para agregar/editar cliente */}
      {mostrarFormulario && (
        <div className="clientes-form">
          <h4>{editandoId ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}</h4>

          <div className="form-row-2">
            <div className="form-group">
              <label>Razón Social *</label>
              <input
                type="text"
                value={nuevoCliente.razonSocial}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, razonSocial: e.target.value })}
                placeholder="Ej: Empresa XYZ S.A."
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>RUC *</label>
              <input
                type="text"
                value={nuevoCliente.ruc}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, ruc: e.target.value })}
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
            <div className="form-group">
              <label>Tipo de Impuesto</label>
              <select
                value={nuevoCliente.tipoImpuesto}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, tipoImpuesto: e.target.value })}
              >
                {TIPOS_IMPUESTO.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>{tipo.label}</option>
                ))}
              </select>
            </div>
          </div>

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
              {editandoId ? '✓ Actualizar Cliente' : '+ Agregar Cliente'}
            </button>
            <button className="btn btn-secondary" onClick={cancelarEdicion}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Botón para mostrar formulario */}
      {!mostrarFormulario && (
        <button className="btn btn-add-cliente" onClick={() => setMostrarFormulario(true)}>
          + Agregar Cliente
        </button>
      )}

      {/* Búsqueda */}
      {clientes.length > 0 && (
        <div className="busqueda-box">
          <input
            type="text"
            placeholder="🔍 Buscar por razón social o RUC..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      )}

      {/* Tabla de clientes */}
      {clientesFiltrados.length === 0 ? (
        <div className="clientes-vacio">
          <p>📭 {clientes.length === 0 ? 'No hay clientes registrados' : 'No se encontraron resultados'}</p>
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
                <th>Tipo Impuesto</th>
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
                    <span className="badge">{getTipoImpuestoLabel(cliente.tipoImpuesto)}</span>
                  </td>
                  <td className="checkbox-cell">
                    <button
                      className={`status-badge ${cliente.alDia ? 'si' : 'no'} clickable-badge`}
                      onClick={() => toggleAlDia(cliente.id)}
                      title="Click para cambiar estado"
                    >
                      {cliente.alDia ? '✓' : '✕'}
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
                      {cliente.pagoAlDia ? '✓' : '✕'}
                    </button>
                  </td>
                  <td className="checkbox-cell">
                    <button
                      className={`status-badge ${cliente.facturado ? 'si' : 'no'} clickable-badge`}
                      onClick={() => toggleFacturado(cliente.id)}
                      title="Click para cambiar estado"
                    >
                      {cliente.facturado ? '✓' : '✕'}
                    </button>
                  </td>
                  <td className="acciones">
                    <button
                      className="btn-accion btn-editar"
                      onClick={() => editarCliente(cliente)}
                      title="Editar cliente"
                    >
                      ✎
                    </button>
                    <button
                      className="btn-accion btn-eliminar"
                      onClick={() => eliminarCliente(cliente.id)}
                      title="Eliminar cliente"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Resumen */}
      {clientes.length > 0 && (
        <div className="clientes-resumen">
          <div className="resumen-item">
            <span className="resumen-label">Clientes al día:</span>
            <span className="resumen-valor">{clientesAlDia}/{clientes.length}</span>
          </div>
          <div className="resumen-item">
            <span className="resumen-label">Pagos al día:</span>
            <span className="resumen-valor">{clientesPagosAlDia}/{clientes.length}</span>
          </div>
          <div className="resumen-item">
            <span className="resumen-label">Honorarios totales:</span>
            <span className="resumen-valor">{honorariosTotal.toLocaleString('es-PY', { maximumFractionDigits: 0 })} GS</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default GestionClientes
