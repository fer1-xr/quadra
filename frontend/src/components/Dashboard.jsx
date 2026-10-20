import React, { useState } from 'react'
import axios from 'axios'
import { CheckSquare, Target, CreditCard, FileText, Truck, TrendingUp, DollarSign, Users, Scale, Calculator } from 'lucide-react'
import History from './History'
import ChangePassword from './ChangePassword'
import Sidebar from './Sidebar'
import LiquidacionSalarial from './LiquidacionSalarial'
import VentaActivoFijo from './VentaActivoFijo'
import ImportarDocumentos from './ImportarDocumentos'
import ControlPagos from './ControlPagos'
import TodoDelDia from './TodoDelDia'
import MetasAnuales from './MetasAnuales'
import Cotizacion from './Cotizacion'
import LeccionDelDia from './LeccionDelDia'
import GestionClientes from './GestionClientes'
import '../styles/Sidebar.css'
import '../styles/Dashboard.css'

const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://quadra-45d6.onrender.com'

function Dashboard({ user, onLogout }) {
  const [libroFiles, setLibroFiles] = useState([])
  const [rg90Files, setRg90Files] = useState([])
  const [discrepancies, setDiscrepancies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [view, setView] = useState('inicio')
  const [totalCoincidencias, setTotalCoincidencias] = useState(0)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [marangatuInputCount, setMarangatuInputCount] = useState(1)
  const [monthlyInputCount, setMonthlyInputCount] = useState(1)

  const handleMarangatuFile = (index, file) => {
    const newFiles = [...libroFiles]
    if (file) {
      newFiles[index] = file
    } else {
      newFiles.splice(index, 1)
    }
    setLibroFiles(newFiles)
  }

  const handleMonthlyFile = (index, file) => {
    const newFiles = [...rg90Files]
    if (file) {
      newFiles[index] = file
    } else {
      newFiles.splice(index, 1)
    }
    setRg90Files(newFiles)
  }

  const addMarangatuInput = () => {
    setMarangatuInputCount(prev => prev + 1)
  }

  const addMonthlyInput = () => {
    setMonthlyInputCount(prev => prev + 1)
  }

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
    if (rg90Files.length === 0 || libroFiles.length === 0) { setError('Cargá los archivos mensuales y archivos de Maragnatu'); return }
    setLoading(true)
    setError('')
    try {
      const monthlyData = []
      for (const file of rg90Files) {
        const fileData = await readFile(file)
        monthlyData.push(fileData)
      }
      const marangatuData = []
      for (const file of libroFiles) {
        const fileData = await readFile(file)
        marangatuData.push(fileData)
      }
      const token = localStorage.getItem('quaedra_token')
      const response = await axios.post(`${API_BASE_URL}/api/reconciliation`,
        { monthlyData, marangatuData },
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
      const response = await axios.get(`${API_BASE_URL}/api/export/${sessionId}`, {
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
      case 'leccion':
        setView('leccion')
        break
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
      case 'importar-documentos':
        setView('importar-documentos')
        break
      case 'control-pagos':
        setView('control-pagos')
        break
      case 'cotizacion':
        setView('cotizacion')
        break
      case 'cuenta':
        setView('cuenta')
        break
      case 'todo':
        setView('todo')
        break
      case 'metas':
        setView('metas')
        break
      case 'clientes':
        setView('clientes')
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
          <div className="reconciliation-counter">
            <span className="counter-label">Conciliaciones disponibles:</span>
            <span className="counter-value">8/10</span>
          </div>
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
              <div className="dashboard-view dashboard-view--nature">
                <div className="nature-container">
                  <img
                    src="https://images.unsplash.com/photo-1580836343994-aaefa2b9cd94?w=1600&h=900&fit=crop"
                    alt="Naturaleza Paraguaya - Cataratas del Iguazú"
                    className="nature-image"
                  />
                  <div className="nature-overlay">
                    <h1>Bienvenido a QUADRA</h1>
                    <p>Plataforma integral de conciliación y gestión contable</p>
                  </div>
                </div>
              </div>
            )}

            {view === 'rg90' && (
              <div className="card">
                {error && <div className="error-message">{error}</div>}
                <div className="rg90-upload-section">
                  <div style={{ marginBottom: '32px' }}>
                    <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>Archivos Maragnatu</label>
                    <div className="maragnatu-files-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                      {Array.from({ length: marangatuInputCount }).map((_, index) => (
                        <div key={index} className="file-input-group" style={{ position: 'relative' }}>
                          <input type="file" accept=".csv,.xlsx,.xls" className="maragnatu-file-input" onChange={(e) => handleMarangatuFile(index, e.target.files[0])} />
                          {libroFiles[index] && <div className="file-name">✓ {libroFiles[index].name}</div>}
                        </div>
                      ))}
                    </div>
                    <button className="btn" onClick={addMarangatuInput} style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', marginBottom: '20px' }}>+ Agregar archivo</button>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>Reportes (Compras/Ventas/Notas de Crédito)</label>
                    <div className="monthly-files-container" id="monthly-files-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                      {Array.from({ length: monthlyInputCount }).map((_, index) => (
                        <div key={index} className="file-input-group" style={{ position: 'relative' }}>
                          <input type="file" accept=".csv,.xlsx,.xls" className="monthly-file-input" onChange={(e) => handleMonthlyFile(index, e.target.files[0])} />
                          {rg90Files[index] && <div className="file-name">✓ {rg90Files[index].name}</div>}
                        </div>
                      ))}
                    </div>
                    <button className="btn" onClick={addMonthlyInput} style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', marginBottom: '20px' }}>+ Agregar archivo</button>
                  </div>
                </div>
                <button className="btn btn-primary" onClick={handleReconciliation} disabled={loading || rg90Files.length === 0 || libroFiles.length === 0}>
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
                  <button className="btn btn-primary" onClick={() => { setDiscrepancies([]); setRg90Files([]); setLibroFiles([]); setMarangatuInputCount(1); setMonthlyInputCount(1); setView('rg90') }}>🔄 Nueva Conciliación</button>
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

            {view === 'importar-documentos' && (
              <ImportarDocumentos />
            )}

            {view === 'control-pagos' && (
              <ControlPagos />
            )}

            {view === 'liquidacion' && (
              <LiquidacionSalarial />
            )}

            {view === 'activofijo' && (
              <VentaActivoFijo />
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

            {view === 'todo' && (
              <TodoDelDia />
            )}

            {view === 'metas' && (
              <MetasAnuales />
            )}

            {view === 'cotizacion' && (
              <Cotizacion />
            )}

            {view === 'leccion' && (
              <LeccionDelDia />
            )}

            {view === 'clientes' && (
              <GestionClientes />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
