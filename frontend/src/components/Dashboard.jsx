import React, { useState } from 'react'
import axios from 'axios'
import History from './History'
import ChangePassword from './ChangePassword'
import Sidebar from './Sidebar'
import LiquidacionSalarial from './LiquidacionSalarial'
import '../styles/Sidebar.css'

function Dashboard({ user, onLogout }) {
  const [rg90File, setRg90File] = useState(null)
  const [libroFile, setLibroFile] = useState(null)
  const [discrepancies, setDiscrepancies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [view, setView] = useState('inicio')
  const [totalCoincidencias, setTotalCoincidencias] = useState(0)
  const [showChangePassword, setShowChangePassword] = useState(false)

  const readFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    if (file.name.endsWith('.csv')) {
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = reject
      reader.readAsText(file, 'UTF-8')
    } else {
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    }
  })

  const handleReconciliation = async () => {
    if (!rg90File || !libroFile) { setError('Cargá ambos archivos'); return }
    setLoading(true)
    setError('')
    try {
      const rg90Data = await readFile(rg90File)
      const libroData = await readFile(libroFile)
      const token = localStorage.getItem('quaedra_token')
      const response = await axios.post('/api/reconciliation',
        { rg90Data, libroData },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setDiscrepancies(response.data.discrepancies)
      setSessionId(response.data.sessionId)
      setTotalCoincidencias(response.data.totalCoincidencias)
      setView('rg90-results')
    } catch (err) {
      setError(err.response?.data?.error || 'Error en la conciliación')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    if (!sessionId) return
    try {
      const token = localStorage.getItem('quaedra_token')
      const response = await axios.get(`/api/export/${sessionId}`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `quaedra-${Date.now()}.xlsx`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      setError('Error al descargar')
    }
  }

  const handleViewHistory = (session) => {
    setDiscrepancies(session.data.discrepancies)
    setSessionId(session.id)
    setTotalCoincidencias(session.data.discrepancies.filter(d => d.status === 'success').length)
    setView('rg90-results')
  }

  const handleNavigate = (viewId) => {
    switch (viewId) {
      case 'rg90':
        setView('rg90')
        break
      case 'bancaria':
        setView('bancaria')
        break
      case 'liquidacion':
        setView('liquidacion')
        break
      case 'activofijo':
        setView('activofijo')
        break
      case 'flujo':
        setView('flujo')
        break
      case 'buscar':
        setView('buscar')
        break
      case 'cuenta':
        setView('cuenta')
        break
      default:
        setView('inicio')
    }
  }

  const fmt = (n) => parseFloat(n).toLocaleString('es-PY', { minimumFractionDigits: 2 })
  const totalErrors = discrepancies.filter(d => d.status === 'error').length

  return (
    <div className="dashboard">
      <nav className="navbar">
        <h1>QUΔDRA</h1>
        <div className="nav-right">
          <span>Hola, {user?.name || user?.email}</span>
        </div>
      </nav>

      <div className="dashboard-content">
        <Sidebar currentView={view} onNavigate={handleNavigate} user={user} onLogout={onLogout} />

        <div className="main-content">
          <div className="container">
            {showChangePassword && (
              <ChangePassword
                onClose={() => setShowChangePassword(false)}
                onSuccess={() => setShowChangePassword(false)}
              />
            )}

            {view === 'inicio' && (
              <div className="dashboard-view">
                <div className="dashboard-header">
                  <h1>Bienvenido a QUADRA</h1>
                  <p>Plataforma integral de conciliación y gestión contable</p>
                </div>
                <div className="services-grid">
                  <div className="service-card service-card--rg90" onClick={() => handleNavigate('rg90')}>
                    <div className="card-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="12 3 20 7.5 20 16.5 12 21 4 16.5 4 7.5 12 3"></polyline>
                        <polyline points="12 12 20 7.5"></polyline>
                        <polyline points="12 12 12 21"></polyline>
                        <polyline points="12 12 4 7.5"></polyline>
                      </svg>
                    </div>
                    <h3>Conciliación RG90</h3>
                    <p>Compara tu reporte RG90 con el libro de compras según normativa central</p>
                    <button className="btn btn-primary">Acceder →</button>
                  </div>
                  <div className="service-card service-card--bancaria" onClick={() => handleNavigate('bancaria')}>
                    <div className="card-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>
                      </svg>
                    </div>
                    <h3>Conciliación Bancaria</h3>
                    <p>Reconcilia movimientos bancarios con registros contables</p>
                    <button className="btn btn-primary">Acceder →</button>
                  </div>
                  <div className="service-card service-card--documentos" onClick={() => handleNavigate('buscar')}>
                    <div className="card-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline>
                      </svg>
                    </div>
                    <h3>Importar Documentos</h3>
                    <p>OCR y procesamiento de PDF e imágenes de comprobantes</p>
                    <button className="btn btn-primary">Acceder →</button>
                  </div>
                  <div className="service-card service-card--liquidacion" onClick={() => handleNavigate('liquidacion')}>
                    <div className="card-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                    </div>
                    <h3>Liquidación Salarial</h3>
                    <p>Cálculo y gestión de nóminas con descuentos e impuestos</p>
                    <button className="btn btn-primary">Acceder →</button>
                  </div>
                  <div className="service-card service-card--activos" onClick={() => handleNavigate('activofijo')}>
                    <div className="card-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>
                      </svg>
                    </div>
                    <h3>Calculadora Activo Fijo</h3>
                    <p>Depreciación, amortización y valuación de activos</p>
                    <button className="btn btn-primary">Acceder →</button>
                  </div>
                  <div className="service-card service-card--flujo" onClick={() => handleNavigate('flujo')}>
                    <div className="card-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 2.2"></path>
                      </svg>
                    </div>
                    <h3>Flujo de Caja</h3>
                    <p>Proyecciones y análisis de liquidez y efectivo</p>
                    <button className="btn btn-primary">Acceder →</button>
                  </div>
                </div>
              </div>
            )}

            {view === 'rg90' && (
              <div className="card">
                <h2>📊 Conciliación RG90 vs Libro Compras</h2>
                {error && <div className="error-message">{error}</div>}
                <div className="file-input">
                  <div className="file-input-group">
                    <label>Reporte RG90 (CSV o Excel)</label>
                    <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setRg90File(e.target.files[0])} />
                    {rg90File && <div className="file-name">✓ {rg90File.name}</div>}
                  </div>
                  <div className="file-input-group">
                    <label>Libro Compras (CSV o Excel)</label>
                    <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setLibroFile(e.target.files[0])} />
                    {libroFile && <div className="file-name">✓ {libroFile.name}</div>}
                  </div>
                </div>
                <button className="btn btn-primary" onClick={handleReconciliation} disabled={loading || !rg90File || !libroFile}>
                  {loading ? 'Procesando...' : '▶ Ejecutar Conciliación'}
                </button>
              </div>
            )}

            {view === 'rg90-results' && discrepancies.length > 0 && (
              <div className="card results-card">
                <h2>📋 Resultados</h2>
                <div className="summary">
                  <div className="summary-row"><span>✓ Coinciden:</span><strong className="success">{totalCoincidencias}</strong></div>
                  <div className="summary-row"><span>✗ Discrepancias:</span><strong className="error">{totalErrors}</strong></div>
                </div>
                <div className="table-wrapper">
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>Razón Social</th><th>RUC</th>
                        <th>Total Libro</th><th>Total RG90</th>
                        <th>IVA 10% Libro</th><th>IVA 10% RG90</th>
                        <th>IVA 5% Libro</th><th>IVA 5% RG90</th>
                        <th>Exenta Libro</th><th>Exenta RG90</th>
                        <th>Mensaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {discrepancies.map((d, i) => (
                        <tr key={i} className={`row-${d.status}`}>
                          <td>{d.razonSocial}</td>
                          <td>{d.ruc}</td>
                          <td className={Math.abs(d.totalLibro - d.totalRG90) <= 1 ? 'cell-success' : 'cell-error'}>{fmt(d.totalLibro)}</td>
                          <td className={Math.abs(d.totalLibro - d.totalRG90) <= 1 ? 'cell-success' : 'cell-error'}>{fmt(d.totalRG90)}</td>
                          <td className={Math.abs(d.iva10Libro - d.iva10RG90) <= 1 ? 'cell-success' : 'cell-error'}>{fmt(d.iva10Libro)}</td>
                          <td className={Math.abs(d.iva10Libro - d.iva10RG90) <= 1 ? 'cell-success' : 'cell-error'}>{fmt(d.iva10RG90)}</td>
                          <td className={Math.abs(d.iva5Libro - d.iva5RG90) <= 1 ? 'cell-success' : 'cell-error'}>{fmt(d.iva5Libro)}</td>
                          <td className={Math.abs(d.iva5Libro - d.iva5RG90) <= 1 ? 'cell-success' : 'cell-error'}>{fmt(d.iva5RG90)}</td>
                          <td className={Math.abs(d.exentaLibro - d.exentaRG90) <= 1 ? 'cell-success' : 'cell-error'}>{fmt(d.exentaLibro)}</td>
                          <td className={Math.abs(d.exentaLibro - d.exentaRG90) <= 1 ? 'cell-success' : 'cell-error'}>{fmt(d.exentaRG90)}</td>
                          <td className="mensaje">{d.mensaje}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="button-group">
                  <button className="btn btn-success" onClick={handleExport}>⬇ Descargar Excel</button>
                  <button className="btn btn-primary" onClick={() => { setDiscrepancies([]); setView('rg90') }}>🔄 Nueva Conciliación</button>
                </div>
              </div>
            )}

            {view === 'bancaria' && (
              <div className="card">
                <h2>🏦 Conciliación Bancaria</h2>
                <p style={{ color: '#666', fontSize: '16px' }}>Esta funcionalidad está en desarrollo.</p>
              </div>
            )}

            {view === 'calculadora' && (
              <div className="card">
                <h2>🧮 Calculadora Venta AF</h2>
                <p style={{ color: '#666', fontSize: '16px' }}>Esta funcionalidad está en desarrollo.</p>
              </div>
            )}

            {view === 'reportes' && (
              <div className="card">
                <h2>📈 Reportes</h2>
                <p style={{ color: '#666', fontSize: '16px' }}>Esta funcionalidad está en desarrollo.</p>
              </div>
            )}

            {view === 'documentacion' && (
              <div className="card">
                <h2>📚 Documentación</h2>
                <p style={{ color: '#666', fontSize: '16px' }}>Centro de ayuda y documentación.</p>
                <div style={{ marginTop: '20px' }}>
                  <h3>Guías disponibles:</h3>
                  <ul style={{ marginTop: '10px', lineHeight: '1.8', color: '#666' }}>
                    <li>Cómo realizar una conciliación RG90</li>
                    <li>Guía de conciliación bancaria</li>
                    <li>Uso de la calculadora de ventas AF</li>
                    <li>Preguntas frecuentes</li>
                  </ul>
                </div>
              </div>
            )}

            {view === 'buscar' && (
              <div className="card">
                <h2>📄 Importar Documentos</h2>
                <p style={{ color: '#666', fontSize: '16px', marginBottom: '20px' }}>Importa archivos PDF e imágenes a libro compras/ventas</p>
                <div className="file-input">
                  <div className="file-input-group">
                    <label>Seleccionar archivo (PDF, JPG, PNG)</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" />
                    <div className="file-hint">Máximo 10MB por archivo</div>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: '20px' }}>Procesar Documento</button>
              </div>
            )}

            {view === 'liquidacion' && (
              <LiquidacionSalarial />
            )}

            {view === 'activofijo' && (
              <div className="card">
                <h2>🏢 Calculadora de Activo Fijo</h2>
                <p style={{ color: '#666', fontSize: '16px', marginBottom: '20px' }}>Gestiona la depreciación y valuación de activos fijos</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Descripción del Activo</label>
                    <input type="text" placeholder="Ej: Máquina, Equipo, etc" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Valor Inicial</label>
                    <input type="number" placeholder="Valor inicial" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Vida Útil (años)</label>
                    <input type="number" placeholder="Años" min="1" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Valor Residual</label>
                    <input type="number" placeholder="Valor residual" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                </div>
                <button className="btn btn-primary">Calcular Depreciación</button>
              </div>
            )}

            {view === 'flujo' && (
              <div className="card">
                <h2>💵 Flujo de Caja</h2>
                <p style={{ color: '#666', fontSize: '16px', marginBottom: '20px' }}>Proyecta y analiza tu flujo de efectivo mensual</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Mes/Período</label>
                    <input type="text" placeholder="Ej: Enero 2026" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Ingresos Totales</label>
                    <input type="number" placeholder="Monto" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Egresos Totales</label>
                    <input type="number" placeholder="Monto" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Saldo Anterior</label>
                    <input type="number" placeholder="Saldo" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Inversiones</label>
                    <input type="number" placeholder="Monto" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Financiamientos</label>
                    <input type="number" placeholder="Monto" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                </div>
                <button className="btn btn-primary">Calcular Flujo de Caja</button>
              </div>
            )}

            {view === 'cuenta' && (
              <div className="card">
                <h2>👤 Mi Cuenta</h2>
                <div style={{ display: 'grid', gap: '15px' }}>
                  <div>
                    <strong style={{ color: 'var(--primary)' }}>Email:</strong>
                    <p>{user?.email}</p>
                  </div>
                  {user?.name && (
                    <div>
                      <strong style={{ color: 'var(--primary)' }}>Nombre:</strong>
                      <p>{user.name}</p>
                    </div>
                  )}
                  <div style={{ marginTop: '20px' }}>
                    <button className="btn btn-primary" onClick={() => setShowChangePassword(true)}>🔐 Cambiar contraseña</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
