import React, { useState } from 'react'
import axios from 'axios'
import { CheckSquare, Target, CreditCard, FileText, Truck, TrendingUp, DollarSign, Users, Scale, Calculator, LogOut, Menu, ArrowRight, ArrowUpRight, Play, Download, RotateCcw, Plus, Check, X, Landmark, KeyRound, BarChart3 } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, Input, Spinner, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react'
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
import '../styles/Dashboard.css'
import '../styles/QuadraModules.css'

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
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
        { rg90Data: monthlyData, libroData: marangatuData },
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
  const numCls = (a, b) => `q-num ${Math.abs(a - b) <= 1 ? 'is-ok' : 'is-err'}`

  const viewTitles = {
    inicio: 'Inicio',
    leccion: 'Lección del Día',
    todo: 'TO DO del Día',
    metas: 'Metas Anuales',
    rg90: 'Conciliación RG90',
    'rg90-results': 'Resultados de Conciliación',
    bancaria: 'Conciliación Bancaria',
    'importar-documentos': 'Importar Documentos',
    'control-pagos': 'Control de Pagos',
    liquidacion: 'Liquidación Salarial',
    activofijo: 'Activo Fijo',
    flujo: 'Flujo de Caja',
    cotizacion: 'Cotización',
    clientes: 'Gestión de Clientes',
    cuenta: 'Mi Cuenta'
  }

  const today = new Date().toLocaleDateString('es-PY', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  const secondaryModules = [
    { id: 'liquidacion', title: 'Liquidación Salarial', desc: 'Calcula y gestiona liquidaciones de sueldo de tus empleados', icon: DollarSign },
    { id: 'control-pagos', title: 'Control de Pagos', desc: 'Administra pólizas de seguros y préstamos', icon: CreditCard },
    { id: 'activofijo', title: 'Venta Activo Fijo', desc: 'Registra y calcula la venta de bienes de uso', icon: TrendingUp },
    { id: 'importar-documentos', title: 'Importar Documentos', desc: 'Carga y procesa archivos de tus proveedores', icon: Truck },
    { id: 'clientes', title: 'Gestión de Clientes', desc: 'Administra la información de tus clientes', icon: Users }
  ]

  return (
    <div className="dashboard q-app">
      <Sidebar
        currentView={view}
        onNavigate={handleNavigate}
        user={user}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="q-main">
        <header className="q-topbar">
          <div className="q-topbar__lead">
            <button type="button" className="q-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú">
              <Menu size={20} strokeWidth={1.6} />
            </button>
            <div>
              <p className="q-topbar__date">{today}</p>
              <h2 className="q-topbar__title">{viewTitles[view] || 'QUADRA'}</h2>
            </div>
          </div>
          <div className="q-topbar__meta">
            <span className="q-topbar__hello">Hola, <strong>{user?.name || user?.email}</strong></span>
            <span className="q-quota">
              <span className="q-quota__value">8/10</span> Conciliaciones
            </span>
            <button type="button" className="q-ghost-icon" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut size={18} strokeWidth={1.6} />
            </button>
          </div>
        </header>

        <main className="main-content q-content">
          <div className="container">
            {showChangePassword && (
              <ChangePassword
                onClose={() => setShowChangePassword(false)}
                onSuccess={() => setShowChangePassword(false)}
              />
            )}

            {view === 'inicio' && (
              <div className="dashboard-view q-home">
                <section className="q-hero">
                  <div className="q-hero__copy">
                    <h1 className="q-hero__title">Bienvenido a <em>Quadra.</em></h1>
                    <p className="q-hero__lede">Plataforma integral de conciliación y gestión contable</p>
                    <div className="q-hero__actions">
                      <button type="button" className="q-btn q-btn--light" onClick={() => handleNavigate('rg90')}>
                        Nueva conciliación RG90
                        <ArrowRight size={16} strokeWidth={1.8} />
                      </button>
                      <button type="button" className="q-btn q-btn--ghost" onClick={() => handleNavigate('todo')}>
                        Ver TO DO del Día
                      </button>
                    </div>
                  </div>

                  <figure className="q-hero__figure" aria-hidden="true">
                    <svg viewBox="0 0 320 220" className="q-plot">
                      <defs>
                        <linearGradient id="q-curve" x1="0" x2="1" y1="0" y2="0">
                          <stop offset="0" stopColor="#12B886" stopOpacity="0.2" />
                          <stop offset="1" stopColor="#7EE8C4" />
                        </linearGradient>
                        <linearGradient id="q-area" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0" stopColor="#12B886" stopOpacity="0.3" />
                          <stop offset="1" stopColor="#12B886" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <g className="q-plot__grid">
                        {Array.from({ length: 9 }).map((_, i) => <line key={`v${i}`} x1={20 + i * 35} y1="10" x2={20 + i * 35} y2="190" />)}
                        {Array.from({ length: 6 }).map((_, i) => <line key={`h${i}`} x1="20" y1={10 + i * 36} x2="300" y2={10 + i * 36} />)}
                      </g>
                      <line className="q-plot__axis" x1="20" y1="190" x2="304" y2="190" />
                      <line className="q-plot__axis" x1="20" y1="190" x2="20" y2="6" />
                      <path d="M20 170 C 70 168, 95 150, 125 128 S 190 70, 230 52 S 285 30, 300 26 L 300 190 L 20 190 Z" fill="url(#q-area)" />
                      <path className="q-plot__curve" d="M20 170 C 70 168, 95 150, 125 128 S 190 70, 230 52 S 285 30, 300 26" fill="none" stroke="url(#q-curve)" strokeWidth="2" />
                      <circle cx="230" cy="52" r="4" className="q-plot__point" />
                      <line className="q-plot__guide" x1="230" y1="52" x2="230" y2="190" />
                    </svg>
                    <figcaption className="q-hero__formula">
                      <span>Σ</span><i>Debe</i> − <span>Σ</span><i>Haber</i> = 0
                    </figcaption>
                  </figure>
                </section>

                <section className="q-modules">
                  <header className="q-section-head">
                    <h3>Módulos</h3>
                    <p>Accesos directos a tus herramientas de trabajo</p>
                  </header>

                  <div className="q-modules__grid">
                    <button type="button" className="q-feature" onClick={() => handleNavigate('rg90')}>
                      <span className="q-feature__icon"><FileText size={22} strokeWidth={1.6} /></span>
                      <span className="q-feature__body">
                        <span className="q-feature__title">Conciliación RG90</span>
                        <span className="q-feature__desc">Concilia tus archivos Maragnatu con reportes de compras y ventas</span>
                      </span>
                      <span className="q-feature__eq" aria-hidden="true">
                        <span>Libro</span>
                        <span className="q-feature__op">≡</span>
                        <span>RG90</span>
                      </span>
                      <span className="q-feature__cta">Abrir módulo <ArrowRight size={15} strokeWidth={1.8} /></span>
                    </button>

                    <ul className="q-ledger">
                      {secondaryModules.map((m) => {
                        const Icon = m.icon
                        return (
                          <li key={m.id}>
                            <button type="button" className="q-ledger__row" onClick={() => handleNavigate(m.id)}>
                              <span className="q-ledger__icon"><Icon size={18} strokeWidth={1.6} /></span>
                              <span className="q-ledger__text">
                                <span className="q-ledger__title">{m.title}</span>
                                <span className="q-ledger__desc">{m.desc}</span>
                              </span>
                              <ArrowUpRight className="q-ledger__arrow" size={17} strokeWidth={1.6} />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </section>
              </div>
            )}

            {view === 'rg90' && (
              <Card className="q-card max-w-4xl" shadow="none">
                <CardHeader className="q-card__head">
                  <span className="q-card__icon"><BarChart3 size={20} strokeWidth={1.6} /></span>
                  <div>
                    <h2 className="q-card__title">Conciliación RG90</h2>
                    <p className="q-card__sub">Libro Maragnatu frente a reportes de compras, ventas y notas de crédito</p>
                  </div>
                </CardHeader>
                <CardBody className="q-card__body">
                  {error && (
                    <div className="q-alert" role="alert">
                      <X size={16} strokeWidth={2} />
                      {error}
                    </div>
                  )}

                  <div className="q-field-group">
                    <span className="q-label">Archivos Maragnatu</span>
                    <div className="q-drop-grid">
                      {Array.from({ length: marangatuInputCount }).map((_, index) => (
                        <label key={index} htmlFor={`maragnatu-${index}`} className={`q-drop ${libroFiles[index] ? 'is-filled' : ''}`}>
                          {libroFiles[index] ? <Check size={20} strokeWidth={1.8} /> : <FileText size={20} strokeWidth={1.6} />}
                          <span>{libroFiles[index] ? libroFiles[index].name : 'Seleccionar archivo'}</span>
                          <small>.csv · .xlsx · .xls</small>
                          <input
                            id={`maragnatu-${index}`}
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            className="hidden"
                            onChange={(e) => handleMarangatuFile(index, e.target.files[0])}
                          />
                        </label>
                      ))}
                    </div>
                    <button type="button" className="q-btn q-btn--line" onClick={addMarangatuInput}>
                      <Plus size={16} strokeWidth={1.8} /> Agregar archivo Maragnatu
                    </button>
                  </div>

                  <div className="q-field-group">
                    <span className="q-label">Reportes (Compras/Ventas/Notas de Crédito)</span>
                    <div className="q-drop-grid">
                      {Array.from({ length: monthlyInputCount }).map((_, index) => (
                        <label key={index} htmlFor={`monthly-${index}`} className={`q-drop ${rg90Files[index] ? 'is-filled' : ''}`}>
                          {rg90Files[index] ? <Check size={20} strokeWidth={1.8} /> : <CreditCard size={20} strokeWidth={1.6} />}
                          <span>{rg90Files[index] ? rg90Files[index].name : 'Seleccionar archivo'}</span>
                          <small>.csv · .xlsx · .xls</small>
                          <input
                            id={`monthly-${index}`}
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            className="hidden"
                            onChange={(e) => handleMonthlyFile(index, e.target.files[0])}
                          />
                        </label>
                      ))}
                    </div>
                    <button type="button" className="q-btn q-btn--line" onClick={addMonthlyInput}>
                      <Plus size={16} strokeWidth={1.8} /> Agregar archivo RG90
                    </button>
                  </div>

                  <button
                    type="button"
                    className="q-btn q-btn--primary q-btn--block"
                    onClick={handleReconciliation}
                    disabled={loading || rg90Files.length === 0 || libroFiles.length === 0}
                  >
                    {loading ? <Spinner size="sm" color="current" /> : <Play size={16} strokeWidth={1.8} />}
                    {loading ? 'Procesando...' : 'Ejecutar Conciliación'}
                  </button>
                </CardBody>
              </Card>
            )}

            {view === 'rg90-results' && discrepancies.length > 0 && (
              <Card className="q-card max-w-6xl" shadow="none">
                <CardHeader className="q-card__head q-card__head--split">
                  <div>
                    <h2 className="q-card__title">Resultados de Conciliación</h2>
                    <p className="q-card__sub">Tolerancia de ± 1,00 por concepto</p>
                  </div>
                  <div className="q-tally">
                    <div className="q-tally__item q-tally__item--ok">
                      <span className="q-tally__label"><Check size={14} strokeWidth={2} /> Coinciden</span>
                      <span className="q-tally__value">{totalCoincidencias}</span>
                    </div>
                    <div className="q-tally__item q-tally__item--err">
                      <span className="q-tally__label"><X size={14} strokeWidth={2} /> Discrepancias</span>
                      <span className="q-tally__value">{totalErrors}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="q-card__body overflow-x-auto">
                  <Table
                    aria-label="Resultados de conciliación"
                    className="w-full q-table"
                    isCompact
                    removeWrapper
                  >
                    <TableHeader>
                      <TableColumn>Razón Social</TableColumn>
                      <TableColumn>RUC</TableColumn>
                      <TableColumn align="right">Total Libro</TableColumn>
                      <TableColumn align="right">Total RG90</TableColumn>
                      <TableColumn align="right">IVA 10% Libro</TableColumn>
                      <TableColumn align="right">IVA 10% RG90</TableColumn>
                      <TableColumn align="right">IVA 5% Libro</TableColumn>
                      <TableColumn align="right">IVA 5% RG90</TableColumn>
                      <TableColumn align="right">Exenta Libro</TableColumn>
                      <TableColumn align="right">Exenta RG90</TableColumn>
                      <TableColumn>Mensaje</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {discrepancies.map((d, i) => (
                        <TableRow key={i} className={d.status === 'error' ? 'q-row is-err' : 'q-row is-ok'}>
                          <TableCell className="font-semibold">{d.razonSocial}</TableCell>
                          <TableCell className="q-num">{d.ruc}</TableCell>
                          <TableCell className={numCls(d.totalLibro, d.totalRG90)}>{fmt(d.totalLibro)}</TableCell>
                          <TableCell className={numCls(d.totalLibro, d.totalRG90)}>{fmt(d.totalRG90)}</TableCell>
                          <TableCell className={numCls(d.iva10Libro, d.iva10RG90)}>{fmt(d.iva10Libro)}</TableCell>
                          <TableCell className={numCls(d.iva10Libro, d.iva10RG90)}>{fmt(d.iva10RG90)}</TableCell>
                          <TableCell className={numCls(d.iva5Libro, d.iva5RG90)}>{fmt(d.iva5Libro)}</TableCell>
                          <TableCell className={numCls(d.iva5Libro, d.iva5RG90)}>{fmt(d.iva5RG90)}</TableCell>
                          <TableCell className={numCls(d.exentaLibro, d.exentaRG90)}>{fmt(d.exentaLibro)}</TableCell>
                          <TableCell className={numCls(d.exentaLibro, d.exentaRG90)}>{fmt(d.exentaRG90)}</TableCell>
                          <TableCell className="text-sm max-w-[150px]">{d.mensaje}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="q-actions">
                    <button type="button" className="q-btn q-btn--primary" onClick={handleExport}>
                      <Download size={16} strokeWidth={1.8} /> Descargar Excel
                    </button>
                    <button
                      type="button"
                      className="q-btn q-btn--line"
                      onClick={() => {
                        setDiscrepancies([])
                        setRg90Files([])
                        setLibroFiles([])
                        setMarangatuInputCount(1)
                        setMonthlyInputCount(1)
                        setView('rg90')
                      }}
                    >
                      <RotateCcw size={16} strokeWidth={1.8} /> Nueva Conciliación
                    </button>
                  </div>
                </CardBody>
              </Card>
            )}

            {view === 'bancaria' && (
              <section className="q-panel">
                <span className="q-card__icon"><Landmark size={20} strokeWidth={1.6} /></span>
                <h2 className="q-card__title">Conciliación Bancaria</h2>
                <p className="q-card__sub">Esta funcionalidad está en desarrollo.</p>
              </section>
            )}

            {view === 'calculadora' && (
              <section className="q-panel">
                <span className="q-card__icon"><Calculator size={20} strokeWidth={1.6} /></span>
                <h2 className="q-card__title">Calculadora Venta AF</h2>
                <p className="q-card__sub">Esta funcionalidad está en desarrollo.</p>
              </section>
            )}

            {view === 'reportes' && (
              <section className="q-panel">
                <span className="q-card__icon"><TrendingUp size={20} strokeWidth={1.6} /></span>
                <h2 className="q-card__title">Reportes</h2>
                <p className="q-card__sub">Esta funcionalidad está en desarrollo.</p>
              </section>
            )}

            {view === 'documentacion' && (
              <section className="q-panel">
                <span className="q-card__icon"><FileText size={20} strokeWidth={1.6} /></span>
                <h2 className="q-card__title">Documentación</h2>
                <p className="q-card__sub">Centro de ayuda y documentación.</p>
                <h3 className="q-label q-label--spaced">Guías disponibles</h3>
                <ul className="q-list">
                  <li>Cómo realizar una conciliación RG90</li>
                  <li>Guía de conciliación bancaria</li>
                  <li>Uso de la calculadora de ventas AF</li>
                  <li>Preguntas frecuentes</li>
                </ul>
              </section>
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
              <section className="q-panel">
                <span className="q-card__icon"><TrendingUp size={20} strokeWidth={1.6} /></span>
                <h2 className="q-card__title">Flujo de Caja</h2>
                <p className="q-card__sub">Proyecta y analiza tu flujo de efectivo mensual</p>
                <div className="q-form-grid">
                  <div className="q-field">
                    <label className="q-label" htmlFor="flujo-periodo">Mes/Período</label>
                    <input id="flujo-periodo" className="q-input" type="text" placeholder="Ej: Enero 2026" />
                  </div>
                  <div className="q-field">
                    <label className="q-label" htmlFor="flujo-ingresos">Ingresos Totales</label>
                    <input id="flujo-ingresos" className="q-input q-input--num" type="number" placeholder="Monto" />
                  </div>
                  <div className="q-field">
                    <label className="q-label" htmlFor="flujo-egresos">Egresos Totales</label>
                    <input id="flujo-egresos" className="q-input q-input--num" type="number" placeholder="Monto" />
                  </div>
                  <div className="q-field">
                    <label className="q-label" htmlFor="flujo-saldo">Saldo Anterior</label>
                    <input id="flujo-saldo" className="q-input q-input--num" type="number" placeholder="Saldo" />
                  </div>
                  <div className="q-field">
                    <label className="q-label" htmlFor="flujo-inversiones">Inversiones</label>
                    <input id="flujo-inversiones" className="q-input q-input--num" type="number" placeholder="Monto" />
                  </div>
                  <div className="q-field">
                    <label className="q-label" htmlFor="flujo-financiamientos">Financiamientos</label>
                    <input id="flujo-financiamientos" className="q-input q-input--num" type="number" placeholder="Monto" />
                  </div>
                </div>
                <button type="button" className="q-btn q-btn--primary">Calcular Flujo de Caja</button>
              </section>
            )}

            {view === 'cuenta' && (
              <section className="q-panel q-panel--narrow">
                <span className="q-card__icon q-card__icon--serif">{(user?.name || user?.email || 'Q').charAt(0).toUpperCase()}</span>
                <h2 className="q-card__title">Mi Cuenta</h2>
                <dl className="q-dl">
                  <div>
                    <dt>Email</dt>
                    <dd>{user?.email}</dd>
                  </div>
                  {user?.name && (
                    <div>
                      <dt>Nombre</dt>
                      <dd>{user.name}</dd>
                    </div>
                  )}
                </dl>
                <button type="button" className="q-btn q-btn--primary" onClick={() => setShowChangePassword(true)}>
                  <KeyRound size={16} strokeWidth={1.8} /> Cambiar contraseña
                </button>
              </section>
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
        </main>
      </div>
    </div>
  )
}

export default Dashboard
