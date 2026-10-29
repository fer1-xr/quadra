import React, { useState } from 'react'
import axios from 'axios'
import { CheckSquare, Target, CreditCard, FileText, Truck, TrendingUp, DollarSign, Users, Scale, Calculator, LogOut } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, Input, Spinner, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Navbar, NavbarBrand, NavbarContent, NavbarItem } from '@heroui/react'
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
      <Navbar isBordered className="bg-white dark:bg-slate-900">
        <NavbarBrand>
          <p className="font-bold text-2xl text-primary">QUΔDRA</p>
        </NavbarBrand>
        <NavbarContent justify="end" className="gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Hola, {user?.name || user?.email}</span>
            <Chip variant="flat" color="primary" className="font-semibold">
              8/10 Conciliaciones
            </Chip>
            <Button isIconOnly variant="light" size="lg" onClick={onLogout}>
              <LogOut size={20} className="text-primary" />
            </Button>
          </div>
        </NavbarContent>
      </Navbar>

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
                <div className="welcome-section">
                  <div className="welcome-header">
                    <h1 className="text-4xl font-bold text-primary mb-2">Bienvenido a QUADRA</h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400">Plataforma integral de conciliación y gestión contable</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                    <div onClick={() => handleNavigate('rg90')} className="hover:shadow-lg transition-all cursor-pointer">
                      <Card>
                        <CardBody className="gap-4 p-6">
                          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900">
                            <FileText className="text-blue-600 dark:text-blue-300" size={24} />
                          </div>
                          <h3 className="text-xl font-semibold text-primary">Conciliación RG90</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Concilia tus archivos Maragnatu con reportes de compras y ventas</p>
                        </CardBody>
                      </Card>
                    </div>

                    <div onClick={() => handleNavigate('liquidacion')} className="hover:shadow-lg transition-all cursor-pointer">
                      <Card>
                        <CardBody className="gap-4 p-6">
                          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900">
                            <DollarSign className="text-green-600 dark:text-green-300" size={24} />
                          </div>
                          <h3 className="text-xl font-semibold text-primary">Liquidación Salarial</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Calcula y gestiona liquidaciones de sueldo de tus empleados</p>
                        </CardBody>
                      </Card>
                    </div>

                    <div onClick={() => handleNavigate('control-pagos')} className="hover:shadow-lg transition-all cursor-pointer">
                      <Card>
                        <CardBody className="gap-4 p-6">
                          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900">
                            <CreditCard className="text-purple-600 dark:text-purple-300" size={24} />
                          </div>
                          <h3 className="text-xl font-semibold text-primary">Control de Pagos</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Administra pólizas de seguros y préstamos</p>
                        </CardBody>
                      </Card>
                    </div>

                    <div onClick={() => handleNavigate('activofijo')} className="hover:shadow-lg transition-all cursor-pointer">
                      <Card>
                        <CardBody className="gap-4 p-6">
                          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900">
                            <TrendingUp className="text-orange-600 dark:text-orange-300" size={24} />
                          </div>
                          <h3 className="text-xl font-semibold text-primary">Venta Activo Fijo</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Registra y calcula la venta de bienes de uso</p>
                        </CardBody>
                      </Card>
                    </div>

                    <div onClick={() => handleNavigate('importar-documentos')} className="hover:shadow-lg transition-all cursor-pointer">
                      <Card>
                        <CardBody className="gap-4 p-6">
                          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900">
                            <Truck className="text-indigo-600 dark:text-indigo-300" size={24} />
                          </div>
                          <h3 className="text-xl font-semibold text-primary">Importar Documentos</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Carga y procesa archivos de tus proveedores</p>
                        </CardBody>
                      </Card>
                    </div>

                    <div onClick={() => handleNavigate('clientes')} className="hover:shadow-lg transition-all cursor-pointer">
                      <Card>
                        <CardBody className="gap-4 p-6">
                          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900">
                            <Users className="text-red-600 dark:text-red-300" size={24} />
                          </div>
                          <h3 className="text-xl font-semibold text-primary">Gestión de Clientes</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Administra la información de tus clientes</p>
                        </CardBody>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {view === 'rg90' && (
              <Card className="max-w-4xl">
                <CardHeader className="flex flex-col items-start px-[26px] py-[18px] gap-3">
                  <h2 className="text-2xl font-bold text-primary">📊 Conciliación RG90</h2>
                </CardHeader>
                <CardBody className="px-[26px] py-[18px] gap-6">
                  {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <label className="block text-lg font-semibold text-primary">Archivos Maragnatu</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {Array.from({ length: marangatuInputCount }).map((_, index) => (
                        <div key={index} className="relative">
                          <label htmlFor={`maragnatu-${index}`} className="cursor-pointer">
                            <div className="border-2 border-dashed border-primary rounded-lg p-4 text-center hover:bg-blue-50 dark:hover:bg-slate-800 transition">
                              <FileText className="inline-block mb-2" size={24} color="var(--primary)" />
                              <p className="text-sm font-medium text-primary">
                                {libroFiles[index] ? `✓ ${libroFiles[index].name}` : 'Seleccionar archivo'}
                              </p>
                            </div>
                            <input
                              id={`maragnatu-${index}`}
                              type="file"
                              accept=".csv,.xlsx,.xls"
                              className="hidden"
                              onChange={(e) => handleMarangatuFile(index, e.target.files[0])}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="bordered"
                      color="primary"
                      onClick={addMarangatuInput}
                      className="w-full"
                    >
                      + Agregar archivo Maragnatu
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-lg font-semibold text-primary">Reportes (Compras/Ventas/Notas de Crédito)</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {Array.from({ length: monthlyInputCount }).map((_, index) => (
                        <div key={index} className="relative">
                          <label htmlFor={`monthly-${index}`} className="cursor-pointer">
                            <div className="border-2 border-dashed border-accent rounded-lg p-4 text-center hover:bg-indigo-50 dark:hover:bg-slate-800 transition">
                              <CreditCard className="inline-block mb-2" size={24} color="var(--accent)" />
                              <p className="text-sm font-medium text-accent">
                                {rg90Files[index] ? `✓ ${rg90Files[index].name}` : 'Seleccionar archivo'}
                              </p>
                            </div>
                            <input
                              id={`monthly-${index}`}
                              type="file"
                              accept=".csv,.xlsx,.xls"
                              className="hidden"
                              onChange={(e) => handleMonthlyFile(index, e.target.files[0])}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="bordered"
                      color="secondary"
                      onClick={addMonthlyInput}
                      className="w-full"
                    >
                      + Agregar archivo RG90
                    </Button>
                  </div>

                  <Button
                    color="primary"
                    size="lg"
                    onClick={handleReconciliation}
                    disabled={loading || rg90Files.length === 0 || libroFiles.length === 0}
                    className="w-full font-semibold"
                  >
                    {loading ? <Spinner size="sm" color="current" /> : null}
                    {loading ? 'Procesando...' : '▶ Ejecutar Conciliación'}
                  </Button>
                </CardBody>
              </Card>
            )}

            {view === 'rg90-results' && discrepancies.length > 0 && (
              <Card className="max-w-6xl">
                <CardHeader className="flex flex-col items-start px-[26px] py-[18px] gap-4">
                  <h2 className="text-2xl font-bold text-primary">📋 Resultados de Conciliación</h2>
                  <div className="flex gap-4 w-full">
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <span className="text-green-700 dark:text-green-200 font-semibold">✓ Coinciden:</span>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-300">{totalCoincidencias}</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900 rounded-lg">
                      <span className="text-red-700 dark:text-red-200 font-semibold">✗ Discrepancias:</span>
                      <span className="text-2xl font-bold text-red-600 dark:text-red-300">{totalErrors}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="px-[26px] py-[18px] gap-4 overflow-x-auto">
                  <Table
                    aria-label="Resultados de conciliación"
                    className="w-full"
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
                        <TableRow key={i} className={d.status === 'error' ? 'bg-red-50 dark:bg-red-950' : 'bg-green-50 dark:bg-green-950'}>
                          <TableCell className="font-semibold">{d.razonSocial}</TableCell>
                          <TableCell>{d.ruc}</TableCell>
                          <TableCell className={Math.abs(d.totalLibro - d.totalRG90) <= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {fmt(d.totalLibro)}
                          </TableCell>
                          <TableCell className={Math.abs(d.totalLibro - d.totalRG90) <= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {fmt(d.totalRG90)}
                          </TableCell>
                          <TableCell className={Math.abs(d.iva10Libro - d.iva10RG90) <= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {fmt(d.iva10Libro)}
                          </TableCell>
                          <TableCell className={Math.abs(d.iva10Libro - d.iva10RG90) <= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {fmt(d.iva10RG90)}
                          </TableCell>
                          <TableCell className={Math.abs(d.iva5Libro - d.iva5RG90) <= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {fmt(d.iva5Libro)}
                          </TableCell>
                          <TableCell className={Math.abs(d.iva5Libro - d.iva5RG90) <= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {fmt(d.iva5RG90)}
                          </TableCell>
                          <TableCell className={Math.abs(d.exentaLibro - d.exentaRG90) <= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {fmt(d.exentaLibro)}
                          </TableCell>
                          <TableCell className={Math.abs(d.exentaLibro - d.exentaRG90) <= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {fmt(d.exentaRG90)}
                          </TableCell>
                          <TableCell className="text-sm max-w-[150px]">{d.mensaje}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex gap-4 mt-6 w-full">
                    <Button
                      color="success"
                      size="lg"
                      className="flex-1 font-semibold"
                      onClick={handleExport}
                    >
                      ⬇ Descargar Excel
                    </Button>
                    <Button
                      color="primary"
                      size="lg"
                      variant="bordered"
                      className="flex-1 font-semibold"
                      onClick={() => {
                        setDiscrepancies([])
                        setRg90Files([])
                        setLibroFiles([])
                        setMarangatuInputCount(1)
                        setMonthlyInputCount(1)
                        setView('rg90')
                      }}
                    >
                      🔄 Nueva Conciliación
                    </Button>
                  </div>
                </CardBody>
              </Card>
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
