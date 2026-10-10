import React, { useState, useMemo, useRef } from 'react'
import axios from 'axios'
import History from './History'

const TOL = 1

// Cada campo se muestra como un par de columnas: Libro | RG90
const PARES = [
  { key: 'ruc',    label: 'RUC',            libro: 'rucLibro',    rg90: 'rucRG90',    num: false },
  { key: 'razon',  label: 'Razón Social',   libro: 'razonLibro',  rg90: 'razonRG90',  num: false },
  { key: 'comp',   label: 'N° Comprobante', libro: 'compLibro',   rg90: 'compRG90',   num: false },
  { key: 'total',  label: 'Total',          libro: 'totalLibro',  rg90: 'totalRG90',  num: true },
  { key: 'iva10',  label: 'IVA 10%',        libro: 'iva10Libro',  rg90: 'iva10RG90',  num: true },
  { key: 'iva5',   label: 'IVA 5%',         libro: 'iva5Libro',   rg90: 'iva5RG90',   num: true },
  { key: 'exenta', label: 'Exenta',         libro: 'exentaLibro', rg90: 'exentaRG90', num: true }
]

const FILTROS = [
  { id: 'todas',   label: 'Todas' },
  { id: 'error',   label: 'Solo errores' },
  { id: 'success', label: 'Solo coincidencias' },
  { id: 'razon',   label: 'Razón Social distinta' }
]

const TAMANOS_PAGINA = [25, 50, 100, 200]

// Acepta tanto el formato nuevo (pares) como el de sesiones guardadas antes de este cambio
const prepararFila = (d, i) => {
  const f = {
    _i: i,
    rucLibro: d.rucLibro ?? d.ruc ?? null,
    rucRG90: d.rucRG90 ?? d.ruc ?? null,
    razonLibro: d.razonLibro ?? d.razonSocial ?? null,
    razonRG90: d.razonRG90 ?? d.razonSocial ?? null,
    compLibro: d.compLibro ?? null,
    compRG90: d.compRG90 ?? null,
    totalLibro: d.totalLibro ?? null, totalRG90: d.totalRG90 ?? null,
    iva10Libro: d.iva10Libro ?? null, iva10RG90: d.iva10RG90 ?? null,
    iva5Libro: d.iva5Libro ?? null,   iva5RG90: d.iva5RG90 ?? null,
    exentaLibro: d.exentaLibro ?? null, exentaRG90: d.exentaRG90 ?? null,
    mensaje: d.mensaje || '',
    status: d.status
  }
  const n = (a, b) => (Math.abs((a || 0) - (b || 0)) <= TOL ? 'ok' : 'error')
  f.estados = d.estados || {
    ruc: 'ok', razon: 'ok', comp: 'ok',
    total: n(f.totalLibro, f.totalRG90),
    iva10: n(f.iva10Libro, f.iva10RG90),
    iva5: n(f.iva5Libro, f.iva5RG90),
    exenta: n(f.exentaLibro, f.exentaRG90)
  }
  return f
}

const estadoCls = (s) => (s === 'ok' ? 'cell-success' : s === 'warn' ? 'cell-warn' : 'cell-error')

const fmtNum = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('es-PY', { maximumFractionDigits: 0 }))
const fmtText = (v) => (v === null || v === undefined || v === '' ? '—' : v)

const sinTildes = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const pasaFiltro = (d, filtro) => {
  if (filtro === 'error') return d.status === 'error'
  if (filtro === 'success') return d.status === 'success'
  if (filtro === 'razon') return d.estados.razon === 'warn'
  return true
}

// Busca por RUC, razón social o comprobante (de cualquiera de los dos lados)
const pasaBusqueda = (d, q) => {
  if (!q) return true
  const texto = sinTildes([d.rucLibro, d.rucRG90, d.razonLibro, d.razonRG90, d.compLibro, d.compRG90].join(' '))
  return texto.includes(q)
}

function Dashboard({ user, onLogout }) {
  const [rg90File, setRg90File] = useState(null)
  const [libroFile, setLibroFile] = useState(null)
  const [discrepancies, setDiscrepancies] = useState([])
  const [meta, setMeta] = useState({ contribuyente: '', periodo: '', avisos: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [view, setView] = useState('upload')

  // Vista de la tabla: filtro, búsqueda y paginación
  const [filtro, setFiltro] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [tamPagina, setTamPagina] = useState(50)
  const tablaRef = useRef(null)

  const resetVista = () => {
    setFiltro('todas')
    setBusqueda('')
    setPagina(1)
  }

  const cargarFilas = (filas) => {
    setDiscrepancies((filas || []).map(prepararFila))
    resetVista()
  }

  const readFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    if (file.name.toLowerCase().endsWith('.csv')) {
      reader.readAsText(file, 'UTF-8')
    } else {
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
      cargarFilas(response.data.discrepancies)
      setMeta({
        contribuyente: response.data.contribuyente || '',
        periodo: response.data.periodo || '',
        avisos: response.data.avisos || []
      })
      setSessionId(response.data.sessionId)
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
      link.setAttribute('download', `quadra-${Date.now()}.xlsx`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      setError('Error al descargar')
    }
  }

  const handleViewHistory = (session) => {
    cargarFilas(session.data.discrepancies)
    setMeta({
      contribuyente: session.data.contribuyente || '',
      periodo: session.data.periodo || '',
      avisos: session.data.avisos || []
    })
    setSessionId(session.id)
    setView('results')
  }

  // ----- Totales globales (no dependen del filtro) -----
  const totalErrors = discrepancies.filter(d => d.status === 'error').length
  const totalCoincidencias = discrepancies.filter(d => d.status === 'success').length
  const totalRevisar = discrepancies.filter(d => d.status === 'success' && d.estados.razon === 'warn').length

  const conteoFiltros = useMemo(() => ({
    todas: discrepancies.length,
    error: discrepancies.filter(d => pasaFiltro(d, 'error')).length,
    success: discrepancies.filter(d => pasaFiltro(d, 'success')).length,
    razon: discrepancies.filter(d => pasaFiltro(d, 'razon')).length
  }), [discrepancies])

  // ----- Filtro + búsqueda + paginación -----
  const q = sinTildes(busqueda).trim()
  const filtradas = useMemo(
    () => discrepancies.filter(d => pasaFiltro(d, filtro) && pasaBusqueda(d, q)),
    [discrepancies, filtro, q]
  )
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / tamPagina))
  const paginaActual = Math.min(pagina, totalPaginas)
  const desde = (paginaActual - 1) * tamPagina
  const visibles = filtradas.slice(desde, desde + tamPagina)

  const irAPagina = (n) => {
    setPagina(Math.min(Math.max(1, n), totalPaginas))
    if (tablaRef.current) tablaRef.current.scrollTop = 0
  }
  const cambiarFiltro = (id) => { setFiltro(id); setPagina(1) }
  const cambiarBusqueda = (v) => { setBusqueda(v); setPagina(1) }
  const cambiarTamPagina = (n) => { setTamPagina(n); setPagina(1) }

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
          <button onClick={onLogout} className="logout-btn">Cerrar sesión</button>
        </div>
      </nav>

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

            {error && <div className="error-message">{error}</div>}

            {(meta.contribuyente || meta.periodo) && (
              <div className="meta-line">
                {meta.contribuyente && <span><strong>Contribuyente:</strong> {meta.contribuyente}</span>}
                {meta.periodo && <span><strong>Período:</strong> {meta.periodo}</span>}
              </div>
            )}

            {meta.avisos.length > 0 && (
              <div className="notice">
                {meta.avisos.map((a, i) => <div key={i}>⚠ {a}</div>)}
              </div>
            )}

            <div className="summary">
              <div className="summary-row"><span>✓ Coinciden:</span><strong className="success">{totalCoincidencias}</strong></div>
              <div className="summary-row"><span>✗ Discrepancias:</span><strong className="error">{totalErrors}</strong></div>
              {totalRevisar > 0 && (
                <div className="summary-row"><span>Coinciden, pero revisar Razón Social:</span><strong className="warn">{totalRevisar}</strong></div>
              )}
            </div>

            <div className="toolbar">
              <div className="filters" role="group" aria-label="Filtrar resultados">
                {FILTROS.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    className={filtro === f.id ? 'filter-btn active' : 'filter-btn'}
                    aria-pressed={filtro === f.id}
                    onClick={() => cambiarFiltro(f.id)}
                  >
                    {f.label} <span className="filter-count">{conteoFiltros[f.id]}</span>
                  </button>
                ))}
              </div>
              <input
                type="search"
                className="search-input"
                placeholder="Buscar RUC, razón social o comprobante"
                aria-label="Buscar en los resultados"
                value={busqueda}
                onChange={(e) => cambiarBusqueda(e.target.value)}
              />
            </div>

            <div className="table-wrapper" ref={tablaRef}>
              <table className="results-table">
                <thead>
                  <tr className="group-row">
                    {PARES.map(p => <th key={p.key} colSpan={2} className="pair-start">{p.label}</th>)}
                    <th rowSpan={2} className="pair-start th-mensaje">Mensaje</th>
                  </tr>
                  <tr className="sub-row">
                    {PARES.map(p => (
                      <React.Fragment key={p.key}>
                        <th className="pair-start">Libro</th>
                        <th>RG90</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((d) => (
                    <tr key={d._i} className={`row-${d.status}`}>
                      {PARES.map(p => {
                        const cls = estadoCls(d.estados[p.key])
                        const base = p.num ? 'cell-num' : 'cell-text'
                        const vL = d[p.libro]
                        const vR = d[p.rg90]
                        return (
                          <React.Fragment key={p.key}>
                            <td className={`${base} ${cls} pair-start`} title={p.num ? undefined : fmtText(vL)}>{p.num ? fmtNum(vL) : fmtText(vL)}</td>
                            <td className={`${base} ${cls}`} title={p.num ? undefined : fmtText(vR)}>{p.num ? fmtNum(vR) : fmtText(vR)}</td>
                          </React.Fragment>
                        )
                      })}
                      <td className="mensaje pair-start">{d.mensaje}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtradas.length === 0 && (
                <div className="empty-results">
                  Ningún comprobante coincide con este filtro.{' '}
                  <button type="button" className="link-btn" onClick={resetVista}>Quitar filtros</button>
                </div>
              )}
            </div>

            <div className="pagination">
              <span className="page-info">
                {filtradas.length === 0
                  ? 'Sin resultados'
                  : `Mostrando ${desde + 1}–${desde + visibles.length} de ${filtradas.length}`}
                {filtradas.length !== discrepancies.length && ` (filtrado de ${discrepancies.length})`}
              </span>
              <div className="pagination-controls">
                <label className="page-size">
                  Filas por página
                  <select value={tamPagina} onChange={(e) => cambiarTamPagina(Number(e.target.value))}>
                    {TAMANOS_PAGINA.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <button type="button" className="page-btn" onClick={() => irAPagina(1)} disabled={paginaActual === 1} aria-label="Primera página">«</button>
                <button type="button" className="page-btn" onClick={() => irAPagina(paginaActual - 1)} disabled={paginaActual === 1}>Anterior</button>
                <span className="page-current">Página {paginaActual} de {totalPaginas}</span>
                <button type="button" className="page-btn" onClick={() => irAPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas}>Siguiente</button>
                <button type="button" className="page-btn" onClick={() => irAPagina(totalPaginas)} disabled={paginaActual === totalPaginas} aria-label="Última página">»</button>
              </div>
            </div>

            <div className="button-group">
              <button className="btn btn-success" onClick={handleExport}>⬇ Descargar Excel (todos los resultados)</button>
              <button className="btn btn-primary" onClick={() => { setDiscrepancies([]); resetVista(); setView('upload') }}>🔄 Nueva Conciliación</button>
            </div>
          </div>
        )}

        {view === 'history' && <History onSelectSession={handleViewHistory} />}
      </div>
    </div>
  )
}

export default Dashboard
