import React, { useState } from 'react'
import axios from 'axios'
import History from './History'
import ChangePassword from './ChangePassword'

function Dashboard({ user, onLogout }) {
  const [rg90File, setRg90File] = useState(null)
  const [libroFile, setLibroFile] = useState(null)
  const [discrepancies, setDiscrepancies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [view, setView] = useState('upload')
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
      setView('results')
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
    setView('results')
  }

  const fmt = (n) => parseFloat(n).toLocaleString('es-PY', { minimumFractionDigits: 2 })
  const totalErrors = discrepancies.filter(d => d.status === 'error').length

  return (
    <div className="dashboard">
      <nav className="navbar">
        <h1>QUΔDRA</h1>
        <div className="nav-right">
          <div className="nav-buttons">
            <button className={view === 'upload' ? 'nav-btn active' : 'nav-btn'} onClick={() => setView('upload')}>📄 Nueva Conciliación</button>
            <button className={view === 'history' ? 'nav-btn active' : 'nav-btn'} onClick={() => setView('history')}>📋 Historial</button>
          </div>
          <span>Hola, {user?.name || user?.email}</span>
          <button
            onClick={() => setShowChangePassword(true)}
            style={{
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              marginRight: '8px'
            }}
            title="Cambiar contraseña"
          >
            🔐 Seguridad
          </button>
          <button onClick={onLogout} className="logout-btn">Cerrar sesión</button>
        </div>
      </nav>

      {showChangePassword && (
        <ChangePassword
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => setShowChangePassword(false)}
        />
      )}

      <div className="container">
        {view === 'upload' && (
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

        {view === 'results' && discrepancies.length > 0 && (
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
              <button className="btn btn-primary" onClick={() => { setDiscrepancies([]); setView('upload') }}>🔄 Nueva Conciliación</button>
            </div>
          </div>
        )}

        {view === 'history' && <History onSelectSession={handleViewHistory} />}
      </div>
    </div>
  )
}

export default Dashboard
