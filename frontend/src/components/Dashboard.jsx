import React, { useState } from 'react'
import axios from 'axios'
import History from './History'
import ChangePassword from './ChangePassword'
import Sidebar from './Sidebar'
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
      case 'calculadora':
        setView('calculadora')
        break
      case 'reportes':
        setView('reportes')
        break
      case 'documentacion':
        setView('documentacion')
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
              <div className="card">
                <h2>🏠 Bienvenido a QUADRA</h2>
                <p style={{ fontSize: '16px', color: '#666', marginBottom: '20px' }}>
                  Sistema de conciliación de reportes contables y bancarios
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <h3 style={{ color: 'var(--primary)', marginBottom: '10px' }}>📊 Conciliación RG90</h3>
                    <p style={{ color: '#666', marginBottom: '15px' }}>Compara tu reporte RG90 con el libro de compras</p>
                    <button className="btn btn-primary" onClick={() => handleNavigate('rg90')}>Ir a RG90</button>
                  </div>
                  <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <h3 style={{ color: 'var(--primary)', marginBottom: '10px' }}>🏦 Conciliación Bancaria</h3>
                    <p style={{ color: '#666', marginBottom: '15px' }}>Reconcilia tus movimientos bancarios</p>
                    <button className="btn btn-primary" onClick={() => handleNavigate('bancaria')}>Ir a Bancaria</button>
                  </div>
                  <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <h3 style={{ color: 'var(--primary)', marginBottom: '10px' }}>🧮 Calculadora Venta AF</h3>
                    <p style={{ color: '#666', marginBottom: '15px' }}>Calcula ventas a activo fijo</p>
                    <button className="btn btn-primary" onClick={() => handleNavigate('calculadora')}>Ir a Calculadora</button>
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
