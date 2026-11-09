import React, { useState } from 'react'
import axios from 'axios'
import { CheckSquare, Target, CreditCard, FileText, Truck, TrendingUp, DollarSign, Users, Scale, Calculator, BookOpen, Wallet, Building2, LineChart, LogOut, Menu, ArrowRight, ArrowUpRight, Play, Download, RotateCcw, Plus, Check, X, Landmark, ArrowLeftRight, KeyRound, BarChart3, Briefcase, ListChecks, NotebookPen } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, Input, Spinner, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react'
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
import SeleccionarContribuyente from './SeleccionarContribuyente'
import Historial from './Historial'
import MiCuenta from './MiCuenta'
import GuardarEnNube from './GuardarEnNube'
import AyudaMemoria from './AyudaMemoria'
import NotasReuniones from './NotasReuniones'
import Contabilidad, { VISTAS_CONTABLES } from './contable/Contabilidad'
import MenuContable, { MarangatuLink } from './contable/MenuContable'
import { ContribuyenteContext } from '../services/historialService'
import PageHead, { Figures, Eq } from './PageHead'
import { API_BASE_URL, authHeaders } from '../services/api'
import '../styles/Dashboard.css'
import '../styles/QuadraModules.css'
import '../styles/QuadraLedger.css'
import '../styles/QuadraMath.css'

const CONTRIBUYENTE_KEY = 'quadra_contribuyente'
const ULTIMO_CONTRIBUYENTE_KEY = 'quadra_ultimo_contribuyente'
const SIDEBAR_MODE_KEY = 'quadra-sidebar-mode'

const leerJSON = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) || null } catch { return null }
}

// Vistas que solo existen dentro del espacio de trabajo de un contribuyente
const VISTAS_CONTRIBUYENTE = new Set([
  'rg90', 'rg90-results', 'bancaria', 'importar-documentos', 'control-pagos',
  'liquidacion', 'activofijo', 'flujo', 'cotizacion', 'historial', 'memoria', 'notas',
  ...Object.keys(VISTAS_CONTABLES)
])

const FLUJO_VACIO = { periodo: '', ingresos: '', egresos: '', saldo: '', inversiones: '', financiamientos: '' }
const num = (v) => Number(v) || 0

function Dashboard({ user, onLogout, onUserUpdate }) {
  const [contribuyente, setContribuyente] = useState(() => leerJSON(CONTRIBUYENTE_KEY))
  const [libroFiles, setLibroFiles] = useState([])
  const [rg90Files, setRg90Files] = useState([])
  const [discrepancies, setDiscrepancies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [view, setView] = useState('inicio')
  const [preseleccion, setPreseleccion] = useState(null)
  const [totalCoincidencias, setTotalCoincidencias] = useState(0)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [marangatuInputCount, setMarangatuInputCount] = useState(1)
  const [monthlyInputCount, setMonthlyInputCount] = useState(1)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarMode, setSidebarMode] = useState(() => {
    const m = localStorage.getItem(SIDEBAR_MODE_KEY)
    return ['fijo', 'auto', 'oculto'].includes(m) ? m : 'fijo'
  })
  const cambiarModoSidebar = (m) => {
    localStorage.setItem(SIDEBAR_MODE_KEY, m)
    setSidebarMode(m)
    setSidebarOpen(false)
  }
  const [flujo, setFlujo] = useState(FLUJO_VACIO)
  const [flujoCalculado, setFlujoCalculado] = useState(null)
  // resultado reabierto desde el Historial: { id, modulo, datos }
  const [restaurado, setRestaurado] = useState(null)

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
      const auth = await authHeaders()
      const response = await axios.post(`${API_BASE_URL}/api/reconciliation`,
        { rg90Data: monthlyData, libroData: marangatuData },
        { headers: { ...auth } }
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
      const auth = await authHeaders()
      const response = await axios.get(`${API_BASE_URL}/api/export/${sessionId}`, {
        responseType: 'blob',
        headers: { ...auth }
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

  const handleNavigate = (viewId) => {
    if (VISTAS_CONTRIBUYENTE.has(viewId) && !contribuyente) {
      setView('seleccionar')
      return
    }
    setRestaurado(null)
    setView(viewId || 'inicio')
  }

  const calcularFlujo = () => {
    const r = {
      periodo: flujo.periodo,
      saldoInicial: num(flujo.saldo),
      ingresos: num(flujo.ingresos),
      egresos: num(flujo.egresos),
      inversiones: num(flujo.inversiones),
      financiamientos: num(flujo.financiamientos)
    }
    r.flujoNeto = r.ingresos - r.egresos - r.inversiones + r.financiamientos
    r.saldoFinal = r.saldoInicial + r.flujoNeto
    setFlujoCalculado(r)
  }

  // Qué módulos se pueden reabrir desde el Historial
  const abrirDesdeHistorial = {
    canOpen: (item) => ['rg90', 'flujo', 'liquidacion', 'activofijo', 'cotizacion', 'control-pagos'].includes(item.modulo),
    open: (item) => {
      const d = item.datos || {}
      if (item.modulo === 'rg90') {
        setDiscrepancies(d.discrepancies || [])
        setTotalCoincidencias(d.totalCoincidencias ?? (d.discrepancies || []).filter((x) => x.status === 'success').length)
        setSessionId(d.sessionId || null)
        setView('rg90-results')
        return
      }
      if (item.modulo === 'flujo') {
        setFlujo({
          periodo: d.periodo || '', ingresos: d.ingresos ?? '', egresos: d.egresos ?? '', saldo: d.saldoInicial ?? '',
          inversiones: d.inversiones ?? '', financiamientos: d.financiamientos ?? ''
        })
        setFlujoCalculado(d)
        setView('flujo')
        return
      }
      setRestaurado({ id: item.id, modulo: item.modulo, datos: d })
      setView(item.modulo)
    }
  }

  const restauradoDe = (modulo) => (restaurado?.modulo === modulo ? restaurado : null)

  const ingresarContribuyente = (datos) => {
    localStorage.setItem(CONTRIBUYENTE_KEY, JSON.stringify(datos))
    localStorage.setItem(ULTIMO_CONTRIBUYENTE_KEY, JSON.stringify(datos))
    setContribuyente(datos)
    setPreseleccion(null)
    setView('inicio')
  }

  // Desde Gestión de Clientes: abrir el selector con ese cliente ya elegido
  const trabajarEnCliente = (clienteId) => {
    localStorage.removeItem(CONTRIBUYENTE_KEY)
    setContribuyente(null)
    setDiscrepancies([])
    setSessionId(null)
    setPreseleccion(clienteId)
    setView('seleccionar')
  }

  const salir = () => {
    localStorage.removeItem(CONTRIBUYENTE_KEY)
    localStorage.removeItem(ULTIMO_CONTRIBUYENTE_KEY)
    onLogout()
  }

  const cambiarContribuyente = () => {
    localStorage.removeItem(CONTRIBUYENTE_KEY)
    setContribuyente(null)
    setDiscrepancies([])
    setSessionId(null)
    setPreseleccion(null)
    setView('seleccionar')
  }

  const fmt = (n) => parseFloat(n).toLocaleString('es-PY', { minimumFractionDigits: 2 })
  const totalErrors = discrepancies.filter(d => d.status === 'error').length
  const numCls = (a, b) => `q-num ${Math.abs(a - b) <= 1 ? 'is-ok' : 'is-err'}`

  const viewTitles = {
    inicio: 'Inicio',
    seleccionar: 'Clientes',
    historial: 'Historial',
    leccion: 'Lección del Día',
    todo: contribuyente ? 'Tareas de la semana' : 'Tareas del Día',
    metas: 'Metas y Objetivos',
    memoria: 'Ayuda memoria',
    notas: 'Notas y Reuniones',
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
    cuenta: 'Mi Cuenta',
    ...Object.fromEntries(Object.entries(VISTAS_CONTABLES).map(([id, v]) => [id, v.titulo]))
  }

  const viewGroups = {
    leccion: 'Agenda',
    todo: contribuyente ? 'Agenda del cliente' : 'Agenda',
    metas: contribuyente ? 'Agenda del cliente' : 'Agenda',
    memoria: 'Agenda del cliente', notas: 'Agenda del cliente',
    rg90: 'Conciliación', 'rg90-results': 'Conciliación', bancaria: 'Conciliación',
    'importar-documentos': 'Conciliación', 'control-pagos': 'Conciliación',
    liquidacion: 'Cálculo', activofijo: 'Cálculo', flujo: 'Cálculo', cotizacion: 'Cálculo',
    clientes: 'Gestión',
    historial: 'Nube',
    ...Object.fromEntries(Object.entries(VISTAS_CONTABLES).map(([id, v]) => [id, v.grupo]))
  }

  const today = new Date().toLocaleDateString('es-PY', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  const accesos = [
    { id: 'seleccionar', title: 'Clientes', desc: 'Elegí un contribuyente y entrá a su espacio de trabajo', icon: Briefcase, eq: [{ v: 'RUC' }, { op: '→' }, { v: 'Espacio' }], destacado: true },
    { id: 'leccion', title: 'Lección del Día', desc: 'Una nota de estudio contable por día hábil', icon: BookOpen, eq: [{ n: '1' }, { op: '/' }, { v: 'día' }] },
    { id: 'todo', title: 'Tareas del Día', desc: 'Tus tareas de hoy y del resto de la semana', icon: CheckSquare, eq: [{ op: 'Σ' }, { v: 'Tareas', sub: 'hoy' }] },
    { id: 'metas', title: 'Metas y Objetivos', desc: 'Objetivos con fecha, estrategia y avance', icon: Target, eq: [{ v: 'Avance en %' }] },
    { id: 'clientes', title: 'Gestión de Clientes', desc: 'Cartera, honorarios y estado de cada cliente', icon: Users, eq: [{ op: 'Σ' }, { v: 'Honorarios' }] }
  ]

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const nombreCorto = (user?.name || user?.email || '').split(/[\s@]/)[0]

  const moduleIndex = [
    {
      group: 'Conciliación',
      items: [
        { id: 'rg90', title: 'Conciliación RG90', desc: 'Libro Maragnatu frente a compras, ventas y notas de crédito', icon: BarChart3, eq: [{ op: 'Σ' }, { v: 'Libro' }, { op: '−' }, { op: 'Σ' }, { v: 'RG90' }, { op: '=' }, { n: '0' }] },
        { id: 'bancaria', title: 'Conciliación Bancaria', desc: 'Extracto contra libro, con partidas en tránsito', icon: Wallet, eq: [{ v: 'S', sub: 'banco' }, { op: '±' }, { v: 'P' }, { op: '=' }, { v: 'S', sub: 'libro' }] },
        { id: 'importar-documentos', title: 'Importar Documentos', desc: 'Facturas de proveedores convertidas a planilla', icon: FileText, eq: [{ v: 'Factura' }, { op: '→' }, { v: 'Excel' }] },
        { id: 'control-pagos', title: 'Control de Pagos', desc: 'Pólizas de seguros y préstamos por cuota', icon: CreditCard, eq: [{ v: 'Saldo', sub: 'n' }, { op: '=' }, { v: 'Saldo', sub: 'n−1' }, { op: '−' }, { v: 'Pago', sub: 'n' }] }
      ]
    },
    {
      group: 'Cálculo',
      items: [
        { id: 'liquidacion', title: 'Liquidación Salarial', desc: 'Haberes, indemnización y aportes por empleado', icon: Calculator, eq: [{ v: 'Neto' }, { op: '=' }, { v: 'H' }, { op: '−' }, { v: 'D' }] },
        { id: 'activofijo', title: 'Venta de Activo Fijo', desc: 'Modalidad de facturación según bien y régimen', icon: Building2, eq: [{ v: 'f' }, { op: '(' }, { v: 'bien' }, { op: ',' }, { v: 'régimen' }, { op: ')' }] },
        { id: 'flujo', title: 'Flujo de Caja', desc: 'Saldo inicial, ingresos y egresos del período', icon: TrendingUp, eq: [{ v: 'S', sub: 'f' }, { op: '=' }, { v: 'S', sub: '0' }, { op: '+' }, { v: 'I' }, { op: '−' }, { v: 'E' }] },
        { id: 'cotizacion', title: 'Cotización', desc: 'Conversión al tipo de cambio de la DNIT', icon: LineChart, eq: [{ v: 'PYG' }, { op: '=' }, { v: 'M' }, { op: '×' }, { v: 'TC' }] }
      ]
    },
    {
      group: 'Contabilidad',
      items: [
        { id: 'ct-libro-compras', title: 'Libro Compras', desc: 'Facturas y notas de proveedores con su crédito fiscal', icon: FileText, eq: [{ v: 'IVA', sub: 'CF' }, { op: '=' }, { v: 'G' }, { op: '÷' }, { n: '11' }] },
        { id: 'ct-libro-ventas', title: 'Libro Ventas', desc: 'Facturas y notas emitidas con su débito fiscal', icon: FileText, eq: [{ v: 'IVA', sub: 'DF' }, { op: '=' }, { v: 'G' }, { op: '÷' }, { n: '11' }] },
        { id: 'ct-libros', title: 'Libros contables', desc: 'Obligatorios y auxiliares, con su estado y descarga en un clic', icon: BookOpen, eq: [{ v: 'Comprobantes' }, { op: '→' }, { v: 'Libros' }] },
        { id: 'ct-balance', title: 'Balance General', desc: 'Activo, pasivo y patrimonio al cierre del ejercicio', icon: Scale, eq: [{ v: 'A' }, { op: '=' }, { v: 'P' }, { op: '+' }, { v: 'PN' }] },
        { id: 'ct-iva', title: 'Liquidación de IVA', desc: 'Débito menos crédito fiscal, mes a mes', icon: Calculator, eq: [{ v: 'DF' }, { op: '−' }, { v: 'CF' }, { op: '−' }, { v: 'Ret' }] },
        { id: 'ct-importar', title: 'Importar', desc: 'Marangatu, Excel o respaldo: Quadra reconoce el archivo', icon: FileText, eq: [{ v: 'Archivo' }, { op: '→' }, { v: 'Libros' }] }
      ]
    },
    {
      group: 'Agenda del cliente',
      items: [
        { id: 'todo', title: 'Tareas de la semana', desc: 'Lo que agendaste para este cliente en tu semana', icon: CheckSquare, eq: [{ op: 'Σ' }, { v: 'Tareas', sub: 'L–V' }] },
        { id: 'memoria', title: 'Ayuda memoria', desc: 'Todo lo que hay que hacer durante el ejercicio', icon: ListChecks, eq: [{ op: 'Σ' }, { v: 'Tareas', sub: 'ejercicio' }] },
        { id: 'metas', title: 'Metas y Objetivos', desc: 'Objetivos propios de este cliente', icon: Target, eq: [{ v: 'Avance en %' }] },
        { id: 'notas', title: 'Notas y Reuniones', desc: 'Conversaciones, minutas y acuerdos', icon: NotebookPen, eq: [{ v: 'Acuerdos' }] }
      ]
    },
    {
      group: 'Gestión',
      items: [
        { id: 'clientes', title: 'Gestión de Clientes', desc: 'Cartera, honorarios y estado de cada cliente', icon: Users, eq: [{ op: 'Σ' }, { v: 'Honorarios' }] }
      ]
    }
  ]

  return (
    <ContribuyenteContext.Provider value={contribuyente}>
    <div className={`dashboard q-app q-app--sb-${sidebarMode}`}>
      <Sidebar
        currentView={view}
        onNavigate={handleNavigate}
        user={user}
        onLogout={salir}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        contribuyente={contribuyente}
        onCambiarContribuyente={cambiarContribuyente}
        mode={sidebarMode}
        onModeChange={cambiarModoSidebar}
      />

      <div className="q-main">
        <div className="q-topwrap">
        <header className="q-topbar q-topbar--compacta">
          <button type="button" className="q-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú" title="Abrir menú">
            <Menu size={18} strokeWidth={1.6} />
          </button>
          <MenuContable vista={view} onNavigate={handleNavigate} habilitado={!!contribuyente} />
          <span className="q-topbar__spacer" />
          {contribuyente && (
            <button
              type="button"
              className="q-taxpayer q-taxpayer--linea"
              onClick={cambiarContribuyente}
              title="Cambiar contribuyente"
              aria-label={`Contribuyente activo: ${contribuyente.razonSocial}, RUC ${contribuyente.ruc}. Cambiar contribuyente`}
            >
              <ArrowLeftRight size={13} strokeWidth={1.8} aria-hidden="true" />
              <span className="q-taxpayer__name">{contribuyente.razonSocial}</span>
            </button>
          )}
          <MarangatuLink />
          <span className="q-quota" title="Conciliaciones usadas este mes">
            <span className="q-quota__value">8/10</span>
          </span>
          <button type="button" className="q-ghost-icon" onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut size={17} strokeWidth={1.6} />
          </button>
        </header>
        <div className="q-ctxbar" role="status">
          <strong className="q-ctxbar__titulo">{viewTitles[view] || 'Quadra'}</strong>
          {contribuyente ? (
            <>
              <span className="q-ctxbar__item"><b>Contribuyente:</b> {contribuyente.ruc} - {contribuyente.razonSocial}</span>
              <span className="q-ctxbar__item"><b>Ejercicio:</b> {contribuyente.ejercicio}{contribuyente.sucursalLabel ? ` / ${contribuyente.sucursalLabel}` : ''}</span>
            </>
          ) : (
            <span className="q-ctxbar__item">Hola, {user?.name || user?.email}</span>
          )}
          <span className="q-ctxbar__fecha">{today}</span>
        </div>
        </div>

        <main className="main-content q-content">
          <div className="container">
            {showChangePassword && (
              <ChangePassword
                onClose={() => setShowChangePassword(false)}
                onSuccess={() => setShowChangePassword(false)}
              />
            )}

            {view === 'seleccionar' && (
              <SeleccionarContribuyente
                key={preseleccion ?? 'ultimo'}
                previo={preseleccion ? { ...(leerJSON(ULTIMO_CONTRIBUYENTE_KEY) || {}), clienteId: preseleccion, sucursal: undefined } : leerJSON(ULTIMO_CONTRIBUYENTE_KEY)}
                onIngresar={ingresarContribuyente}
                onGestionarClientes={() => setView('clientes')}
              />
            )}

            {view === 'inicio' && !contribuyente && (
              <div className="dashboard-view q-home">
                <section className="q-hero q-hero--welcome">
                  <div className="q-hero__copy">
                    <p className="q-hero__eyebrow">{saludo}{nombreCorto ? `, ${nombreCorto}` : ''}</p>
                    <h1 className="q-hero__title">Bienvenido a <em>Quadra.</em></h1>
                    <p className="q-hero__lede">Elegí por dónde empezar: un cliente para trabajar, una lección, tareas del día, o el seguimiento de tus metas y tu cartera.</p>
                  </div>
                  <p className="q-hero__formula" aria-hidden="true">
                    <span>Σ</span><i>Debe</i> − <span>Σ</span><i>Haber</i> = 0
                  </p>
                </section>

                <section aria-labelledby="q-accesos-title">
                  <header className="q-section-head">
                    <h3 id="q-accesos-title">Accesos</h3>
                    <p><span className="q-mono">{accesos.length}</span> atajos para tu jornada</p>
                  </header>
                  <ul className="q-access">
                    {accesos.map((a) => {
                      const Icon = a.icon
                      return (
                        <li key={a.id} className={a.destacado ? 'is-featured' : ''}>
                          <button type="button" className="q-access__card" onClick={() => handleNavigate(a.id)}>
                            <span className="q-access__top">
                              <span className="q-access__icon"><Icon size={20} strokeWidth={1.6} /></span>
                              <ArrowUpRight className="q-access__arrow" size={18} strokeWidth={1.7} />
                            </span>
                            <span className="q-access__title">{a.title}</span>
                            <span className="q-access__desc">{a.desc}</span>
                            <Eq terms={a.eq} className="q-access__eq" />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              </div>
            )}

            {view === 'inicio' && contribuyente && (
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
                        Ver tareas de la semana
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

                <section className="q-modules" aria-labelledby="q-modules-title">
                  <header className="q-section-head">
                    <h3 id="q-modules-title">Módulos</h3>
                    <p><span className="q-mono">{moduleIndex.reduce((n, g) => n + g.items.length, 0)}</span> hojas de trabajo, cada una con su ecuación</p>
                  </header>

                  <div className="q-index">
                    {moduleIndex.map((g) => (
                      <div key={g.group} className="q-index__group">
                        <div className="q-index__head">
                          <h4>{g.group}</h4>
                          <span className="q-index__count">{g.items.length}</span>
                        </div>
                        <ul>
                          {g.items.map((m) => {
                            const Icon = m.icon
                            return (
                              <li key={m.id}>
                                <button type="button" className="q-index__row" onClick={() => handleNavigate(m.id)}>
                                  <Icon className="q-index__icon" size={18} strokeWidth={1.6} />
                                  <span className="q-index__text">
                                    <span className="q-index__title">{m.title}</span>
                                    <span className="q-index__desc">{m.desc}</span>
                                  </span>
                                  <Eq terms={m.eq} className="q-index__eq" />
                                  <ArrowUpRight className="q-index__arrow" size={16} strokeWidth={1.7} />
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {view === 'rg90' && (
              <div className="q-sheet">
              <PageHead
                title="Conciliación RG90"
                lede="Libro Maragnatu frente a reportes de compras, ventas y notas de crédito."
                equation={[{ op: 'Σ' }, { v: 'Libro' }, { op: '−' }, { op: 'Σ' }, { v: 'RG90' }, { op: '=' }, { n: '0' }]}
                caption="tolerancia ± 1,00 por concepto"
              />
              <Card className="q-card" shadow="none">
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
              </div>
            )}

            {view === 'rg90-results' && discrepancies.length > 0 && (
              <div className="q-sheet q-sheet--wide">
              <PageHead
                title="Resultados de conciliación"
                lede="Cada fila compara el libro con la RG90. Las cifras fuera de tolerancia se marcan en rojo."
                equation={[{ op: '|' }, { v: 'Libro' }, { op: '−' }, { v: 'RG90' }, { op: '|' }, { op: '≤' }, { n: '1,00' }]}
                caption="criterio de coincidencia"
              />
              <Figures items={[
                { label: 'Comprobantes', value: discrepancies.length },
                { label: 'Coinciden', value: totalCoincidencias, tone: 'ok' },
                { label: 'Discrepancias', value: totalErrors, tone: totalErrors ? 'err' : undefined },
                { label: 'Exactitud', value: `${((totalCoincidencias / discrepancies.length) * 100).toLocaleString('es-PY', { maximumFractionDigits: 1 })} %` }
              ]} />
              <Card className="q-card" shadow="none">
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
                    <GuardarEnNube
                      modulo="rg90"
                      titulo={`Conciliación RG90 · ${discrepancies.length} comprobantes`}
                      resumen={{
                        Comprobantes: discrepancies.length,
                        Coinciden: totalCoincidencias,
                        Discrepancias: totalErrors,
                        'Exactitud %': Number(((totalCoincidencias / discrepancies.length) * 100).toFixed(1))
                      }}
                      datos={{ discrepancies, totalCoincidencias, sessionId }}
                    />
                    {sessionId && (
                      <button type="button" className="q-btn q-btn--primary" onClick={handleExport}>
                        <Download size={16} strokeWidth={1.8} /> Descargar Excel
                      </button>
                    )}
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
              </div>
            )}

            {view === 'bancaria' && (
              <div className="q-sheet">
                <PageHead
                  title="Conciliación Bancaria"
                  lede="Explica la diferencia entre el extracto del banco y el saldo contable, partida por partida."
                  equation={[{ v: 'S', sub: 'banco' }, { op: '±' }, { v: 'P', sub: 'tránsito' }, { op: '=' }, { v: 'S', sub: 'libro' }]}
                  caption="en desarrollo"
                />
                <section className="q-card q-recon" aria-label="Estructura de la conciliación bancaria">
                  <div className="q-recon__head">
                    <h2 className="q-card__title">Estructura de la conciliación</h2>
                    <span className="q-tag">En desarrollo</span>
                  </div>
                  <table className="q-recon__table">
                    <thead>
                      <tr><th scope="col">Concepto</th><th scope="col">Importe</th></tr>
                    </thead>
                    <tbody>
                      <tr><th scope="row"><span className="q-recon__op" /> Saldo según extracto bancario</th><td /></tr>
                      <tr><th scope="row"><span className="q-recon__op">+</span> Depósitos en tránsito</th><td /></tr>
                      <tr><th scope="row"><span className="q-recon__op">−</span> Cheques emitidos no cobrados</th><td /></tr>
                      <tr><th scope="row"><span className="q-recon__op">±</span> Débitos y créditos bancarios no registrados</th><td /></tr>
                      <tr className="is-total"><th scope="row"><span className="q-recon__op">=</span> Saldo según libros</th><td /></tr>
                    </tbody>
                  </table>
                  <p className="q-recon__note">La carga de extractos y el cruce automático con el libro banco estarán disponibles en una próxima versión.</p>
                </section>
              </div>
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
              <ControlPagos key={restauradoDe('control-pagos')?.id} restaurar={restauradoDe('control-pagos')?.datos} />
            )}

            {view === 'liquidacion' && (
              <LiquidacionSalarial key={restauradoDe('liquidacion')?.id} restaurar={restauradoDe('liquidacion')?.datos} />
            )}

            {view === 'activofijo' && (
              <VentaActivoFijo key={restauradoDe('activofijo')?.id} restaurar={restauradoDe('activofijo')?.datos} />
            )}

            {view === 'flujo' && (
              <div className="q-sheet">
              <PageHead
                title="Flujo de Caja"
                lede="Proyecta y analiza tu flujo de efectivo mensual."
                equation={[{ v: 'S', sub: 'final' }, { op: '=' }, { v: 'S', sub: '0' }, { op: '+' }, { v: 'I' }, { op: '−' }, { v: 'E' }]}
                caption="saldo inicial, ingresos y egresos"
              />
              <section className="q-panel">
                <div className="q-form-grid">
                  <div className="q-field">
                    <label className="q-label" htmlFor="flujo-periodo">Mes/Período</label>
                    <input id="flujo-periodo" className="q-input" type="text" placeholder="Ej: Enero 2026" value={flujo.periodo} onChange={(e) => { setFlujo({ ...flujo, periodo: e.target.value }); setFlujoCalculado(null) }} />
                  </div>
                  <div className="q-field">
                    <label className="q-label" htmlFor="flujo-ingresos">Ingresos Totales</label>
                    <input id="flujo-ingresos" className="q-input q-input--num" type="number" placeholder="Monto" value={flujo.ingresos} onChange={(e) => { setFlujo({ ...flujo, ingresos: e.target.value }); setFlujoCalculado(null) }} />
                  </div>
                  <div className="q-field">
                    <label className="q-label" htmlFor="flujo-egresos">Egresos Totales</label>
                    <input id="flujo-egresos" className="q-input q-input--num" type="number" placeholder="Monto" value={flujo.egresos} onChange={(e) => { setFlujo({ ...flujo, egresos: e.target.value }); setFlujoCalculado(null) }} />
                  </div>
                  <div className="q-field">
                    <label className="q-label" htmlFor="flujo-saldo">Saldo Anterior</label>
                    <input id="flujo-saldo" className="q-input q-input--num" type="number" placeholder="Saldo" value={flujo.saldo} onChange={(e) => { setFlujo({ ...flujo, saldo: e.target.value }); setFlujoCalculado(null) }} />
                  </div>
                  <div className="q-field">
                    <label className="q-label" htmlFor="flujo-inversiones">Inversiones</label>
                    <input id="flujo-inversiones" className="q-input q-input--num" type="number" placeholder="Monto" value={flujo.inversiones} onChange={(e) => { setFlujo({ ...flujo, inversiones: e.target.value }); setFlujoCalculado(null) }} />
                  </div>
                  <div className="q-field">
                    <label className="q-label" htmlFor="flujo-financiamientos">Financiamientos</label>
                    <input id="flujo-financiamientos" className="q-input q-input--num" type="number" placeholder="Monto" value={flujo.financiamientos} onChange={(e) => { setFlujo({ ...flujo, financiamientos: e.target.value }); setFlujoCalculado(null) }} />
                  </div>
                </div>
                <button type="button" className="q-btn q-btn--primary" onClick={calcularFlujo}>Calcular Flujo de Caja</button>
                {flujoCalculado && (
                  <div className="q-flujo-result">
                    <dl className="q-dl">
                      <div><dt>Flujo neto del período</dt><dd className="q-mono">₲ {flujoCalculado.flujoNeto.toLocaleString('es-PY')}</dd></div>
                      <div><dt>Saldo final</dt><dd className="q-mono">₲ {flujoCalculado.saldoFinal.toLocaleString('es-PY')}</dd></div>
                    </dl>
                    <GuardarEnNube
                      modulo="flujo"
                      titulo={`Flujo de Caja${flujoCalculado.periodo ? ` · ${flujoCalculado.periodo}` : ''}`}
                      resumen={{ 'Flujo neto': flujoCalculado.flujoNeto, 'Saldo final': flujoCalculado.saldoFinal }}
                      datos={flujoCalculado}
                    />
                  </div>
                )}
              </section>
              </div>
            )}

            {view === 'cuenta' && (
              <MiCuenta
                user={user}
                onUserUpdate={onUserUpdate}
                onChangePassword={() => setShowChangePassword(true)}
              />
            )}

            {view === 'todo' && (
              <TodoDelDia key={contribuyente?.clienteId ?? 'personal'} cliente={contribuyente} />
            )}

            {view === 'metas' && (
              <MetasAnuales key={contribuyente?.clienteId ?? 'personal'} cliente={contribuyente} />
            )}

            {view === 'memoria' && contribuyente && (
              <AyudaMemoria key={`${contribuyente.clienteId}-${contribuyente.ejercicio}`} cliente={contribuyente} />
            )}

            {view === 'notas' && contribuyente && (
              <NotasReuniones key={contribuyente.clienteId} cliente={contribuyente} />
            )}

            {view === 'cotizacion' && (
              <Cotizacion key={restauradoDe('cotizacion')?.id} restaurar={restauradoDe('cotizacion')?.datos} />
            )}

            {view === 'leccion' && (
              <LeccionDelDia />
            )}

            {view === 'historial' && contribuyente && (
              <Historial onAbrir={abrirDesdeHistorial} />
            )}

            {VISTAS_CONTABLES[view] && contribuyente && (
              <Contabilidad key={`${contribuyente.clienteId}-${contribuyente.ejercicio}`} vista={view} contribuyente={contribuyente} onNavigate={handleNavigate} />
            )}

            {view === 'clientes' && (
              <GestionClientes onTrabajar={trabajarEnCliente} />
            )}
          </div>
        </main>
      </div>
    </div>
    </ContribuyenteContext.Provider>
  )
}

export default Dashboard
