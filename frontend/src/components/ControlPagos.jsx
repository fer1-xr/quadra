import React, { useMemo, useState } from 'react'
import PageHead from './PageHead'
import axios from 'axios'
import { utils, writeFile } from 'xlsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { Card, CardBody } from '@heroui/react'
import { Upload, FileText, Download, X, PencilLine, Loader2 } from 'lucide-react'
import GuardarEnNube from './GuardarEnNube'
import { API_BASE_URL, authHeaders } from '../services/api'
import '../styles/ControlPagos.css'

const DOC_VACIO = {
  emisor: '', numeroDocumento: '', moneda: 'PYG', montoTotal: '', cantidadCuotas: '',
  montoCuota: '', primerVencimiento: '', tasaInteresAnual: '', cuotas: []
}

const hoyISO = () => new Date().toISOString().slice(0, 10)
const fFecha = (iso) => (iso ? iso.split('-').reverse().join('/') : '—')
const fMonto = (n, moneda = 'PYG') =>
  n == null || n === '' ? '—'
    : `${moneda === 'USD' ? 'US$' : '₲'} ${Number(n).toLocaleString('es-PY', { minimumFractionDigits: moneda === 'USD' ? 2 : 0, maximumFractionDigits: 2 })}`

// Suma meses a una fecha ISO respetando fin de mes (31/01 + 1 → 28/02)
const sumarMeses = (iso, meses) => {
  const [y, m, d] = iso.split('-').map(Number)
  const ultimoDia = new Date(y, m - 1 + meses + 1, 0).getDate()
  const f = new Date(y, m - 1 + meses, Math.min(d, ultimoDia))
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
}

/** Arma las cuotas solo con datos confirmados por el usuario. Nada se inventa ni se marca como pagado. */
function armarCuotas(doc) {
  if (doc.cuotas?.length) {
    return doc.cuotas.map((c, i) => ({ numero: c.numero || i + 1, vencimiento: c.vencimiento, monto: Number(c.monto), fechaPago: null, montoPagado: 0 }))
  }
  const n = Number(doc.cantidadCuotas)
  const total = Number(doc.montoTotal) || 0
  const fija = Number(doc.montoCuota) || 0
  const base = fija || Math.round((total / n) * 100) / 100
  return Array.from({ length: n }, (_, i) => {
    // sin cuota fija: la última ajusta el redondeo para que la suma dé el total
    const monto = !fija && total && i === n - 1 ? Math.round((total - base * (n - 1)) * 100) / 100 : base
    return { numero: i + 1, vencimiento: sumarMeses(doc.primerVencimiento, i), monto, fechaPago: null, montoPagado: 0 }
  })
}

/** Errores del formulario de revisión; vacío si se puede armar la planilla. */
function validarDoc(doc) {
  if (doc.cuotas?.length) return []
  const errores = []
  const n = Number(doc.cantidadCuotas)
  if (!Number.isInteger(n) || n < 1 || n > 600) errores.push('Indicá la cantidad de cuotas (entre 1 y 600).')
  if (!(Number(doc.montoTotal) > 0) && !(Number(doc.montoCuota) > 0)) errores.push('Indicá el monto total o el monto de cada cuota.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.primerVencimiento || '')) errores.push('Indicá la fecha del primer vencimiento.')
  return errores
}

/** Planillas guardadas con la versión anterior (formato payments[]) */
function desdeFormatoAnterior(pd) {
  return (pd.payments || []).map((p, i) => ({
    numero: i + 1,
    vencimiento: p.fechaVencimiento || p.dueDate,
    monto: Number(p.montoPagable ?? p.amount) || 0,
    fechaPago: p.fechaPago || p.paymentDate || null,
    montoPagado: Number(p.montoPagado ?? p.paidAmount) || 0
  }))
}

function ControlPagos({ restaurar = null }) {
  const previo = restaurar?.paymentData || null
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [documentType, setDocumentType] = useState(restaurar?.documentType || 'poliza')
  const [doc, setDoc] = useState(previo?.documento ? { ...DOC_VACIO, ...previo.documento } : DOC_VACIO)
  const [faltantes, setFaltantes] = useState([])
  const [cuotas, setCuotas] = useState(previo ? (previo.version === 2 ? previo.cuotas : desdeFormatoAnterior(previo)) : [])
  const [step, setStep] = useState(previo ? 'planilla' : 'upload') // upload | processing | revisar | planilla

  const moneda = doc.moneda || 'PYG'

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.length) validateAndSetFile(e.dataTransfer.files[0])
  }

  const handleFileInput = (e) => {
    if (e.target.files?.length) validateAndSetFile(e.target.files[0])
  }

  const validateAndSetFile = (newFile) => {
    if (!/\.(pdf|jpe?g|png|gif)$/i.test(newFile.name)) {
      setError('Formato no soportado. Usá PDF o imagen (JPG, PNG).')
      setFile(null)
      return
    }
    setFile(newFile)
    setError('')
  }

  const cargarManual = () => {
    setDoc(DOC_VACIO)
    setFaltantes([])
    setAviso('')
    setError('')
    setStep('revisar')
  }

  const processFile = async () => {
    if (!file) {
      setError('Seleccioná un archivo')
      return
    }
    setLoading(true)
    setStep('processing')
    setError('')
    setAviso('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', documentType)
      const auth = await authHeaders()
      const { data } = await axios.post(`${API_BASE_URL}/api/control-pagos/process`, formData, {
        headers: { ...auth, 'Content-Type': 'multipart/form-data' }
      })
      const d = data.documento || {}
      setDoc({
        ...DOC_VACIO,
        ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ?? (k === 'cuotas' ? [] : '')])),
        moneda: d.moneda || 'PYG'
      })
      setFaltantes(data.faltantes || [])
      setAviso(d.cuotas?.length
        ? `Se leyeron ${d.cuotas.length} cuotas del documento. Revisá los datos antes de armar la planilla.`
        : 'Revisá los datos leídos del documento y completá lo que falte.')
      setStep('revisar')
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo procesar el archivo. Podés cargar los datos a mano.')
      setStep('upload')
    } finally {
      setLoading(false)
    }
  }

  const erroresDoc = validarDoc(doc)

  const armarPlanilla = () => {
    if (erroresDoc.length) return
    setCuotas(armarCuotas(doc))
    setAviso('')
    setStep('planilla')
  }

  const alternarPago = (numero) => {
    setCuotas((prev) => prev.map((c) => (c.numero !== numero ? c
      : c.fechaPago ? { ...c, fechaPago: null, montoPagado: 0 }
        : { ...c, fechaPago: hoyISO(), montoPagado: c.monto })))
  }

  const cambiarPago = (numero, campo, valor) => {
    setCuotas((prev) => prev.map((c) => (c.numero === numero ? { ...c, [campo]: campo === 'montoPagado' ? Number(valor) || 0 : valor } : c)))
  }

  const resumen = useMemo(() => {
    const hoy = hoyISO()
    const total = cuotas.reduce((s, c) => s + (Number(c.monto) || 0), 0)
    const pagado = cuotas.reduce((s, c) => s + (c.fechaPago ? Number(c.montoPagado) || 0 : 0), 0)
    const vencidas = cuotas.filter((c) => !c.fechaPago && c.vencimiento < hoy).length
    return { total, pagado, pendiente: total - pagado, vencidas, pagadas: cuotas.filter((c) => c.fechaPago).length }
  }, [cuotas])

  const estadoDe = (c) => (c.fechaPago ? 'Pagado' : c.vencimiento < hoyISO() ? 'Vencido' : 'Pendiente')

  const filas = useMemo(() => {
    let acumulado = 0
    return cuotas.map((c) => {
      acumulado += Number(c.monto) || 0
      return { ...c, estado: estadoDe(c), saldo: resumen.total - acumulado }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuotas, resumen.total])

  const paymentData = {
    version: 2,
    documento: doc,
    cuotas,
    documentNumber: doc.numeroDocumento || null,
    issuer: doc.emisor || null,
    totalAmount: resumen.total
  }

  const exportToExcel = () => {
    const ws = utils.json_to_sheet(filas.map((f) => ({
      Cuota: f.numero,
      Vencimiento: fFecha(f.vencimiento),
      Monto: f.monto,
      Estado: f.estado,
      'Fecha de pago': f.fechaPago ? fFecha(f.fechaPago) : '',
      'Monto pagado': f.fechaPago ? f.montoPagado : '',
      'Saldo del plan': f.saldo
    })))
    ws['!cols'] = [{ wch: 7 }, { wch: 13 }, { wch: 15 }, { wch: 11 }, { wch: 14 }, { wch: 15 }, { wch: 15 }]
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Control Pagos')
    writeFile(wb, `control-pagos-${documentType}-${hoyISO()}.xlsx`)
  }

  const exportToPDF = async () => {
    const element = document.getElementById('payment-preview')
    const canvas = await html2canvas(element, { scale: 2 })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgWidth = 210
    const pageHeight = 297
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    let position = 0
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }
    pdf.save(`control-pagos-${documentType}-${hoyISO()}.pdf`)
  }

  const reiniciar = () => {
    setStep('upload')
    setCuotas([])
    setDoc(DOC_VACIO)
    setFile(null)
    setAviso('')
    setError('')
  }

  const selectorTipo = (
    <div className="flex flex-col items-start gap-3">
      <span className="q-label">Tipo de Documento</span>
      <div className="periodo-selector" role="radiogroup" aria-label="Tipo de Documento">
        {[
          { value: 'poliza', label: 'Póliza de Seguros' },
          { value: 'prestamo', label: 'Liquidación de Préstamo' }
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={documentType === opt.value}
            className={`periodo-btn ${documentType === opt.value ? 'activo' : ''}`}
            onClick={() => setDocumentType(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )

  const renderUploadStep = () => (
    <div className="space-y-6">
      {selectorTipo}

      <div
        className={`drop-zone p-8 text-center cursor-pointer ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="drop-icon"><Upload size={24} strokeWidth={1.6} /></div>
        <h3 className="mb-1">Arrastrá el documento aquí</h3>
        <p className="mb-2">o hacé clic para seleccionar un archivo</p>
        <p className="file-types mb-4">Soporta: PDF, JPG, PNG</p>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif" onChange={handleFileInput} className="hidden" id="file-input" />
        <label htmlFor="file-input" className="cursor-pointer">
          <span className="btn btn-secondary">Seleccionar Archivo</span>
        </label>
      </div>

      {file && (
        <div className="cp-archivo">
          <FileText size={20} strokeWidth={1.6} aria-hidden="true" />
          <div className="cp-archivo__info">
            <p className="cp-archivo__nombre">{file.name}</p>
            <p className="cp-archivo__peso">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button type="button" className="q-btn q-btn--line cp-accion" onClick={() => setFile(null)} aria-label="Quitar archivo">
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>
      )}

      <div className="cp-botones">
        {file && (
          <button type="button" className="q-btn q-btn--primary" onClick={processFile} disabled={loading}>
            {loading ? <Loader2 size={16} className="cp-gira" /> : <Upload size={16} />}
            {loading ? 'Leyendo documento...' : 'Leer documento'}
          </button>
        )}
        <button type="button" className="q-btn q-btn--line" onClick={cargarManual}>
          <PencilLine size={16} /> Cargar datos a mano
        </button>
      </div>
    </div>
  )

  const campo = (id, label, props = {}) => (
    <div className="q-field">
      <label className="q-label" htmlFor={`cp-${id}`}>
        {label}{faltantes.includes(id) && <span className="cp-falta"> · no figura en el documento</span>}
      </label>
      <input
        id={`cp-${id}`}
        className={`q-input ${props.type === 'number' ? 'q-input--num' : ''}`}
        value={doc[id] ?? ''}
        onChange={(e) => setDoc({ ...doc, [id]: e.target.value })}
        {...props}
      />
    </div>
  )

  const renderRevisarStep = () => (
    <div className="space-y-6">
      {selectorTipo}
      <div className="q-form-grid">
        {campo('emisor', documentType === 'poliza' ? 'Aseguradora' : 'Entidad financiera', { type: 'text' })}
        {campo('numeroDocumento', documentType === 'poliza' ? 'N.º de póliza' : 'N.º de operación', { type: 'text' })}
        <div className="q-field">
          <label className="q-label" htmlFor="cp-moneda">Moneda</label>
          <select id="cp-moneda" className="q-input" value={moneda} onChange={(e) => setDoc({ ...doc, moneda: e.target.value })}>
            <option value="PYG">Guaraníes (PYG)</option>
            <option value="USD">Dólares (USD)</option>
          </select>
        </div>
        {campo('montoTotal', 'Monto total', { type: 'number', min: 0, step: 'any' })}
        {campo('cantidadCuotas', 'Cantidad de cuotas', { type: 'number', min: 1, max: 600, step: 1, disabled: doc.cuotas?.length > 0 })}
        {campo('montoCuota', 'Monto de cada cuota (si es fija)', { type: 'number', min: 0, step: 'any', disabled: doc.cuotas?.length > 0 })}
        {campo('primerVencimiento', 'Primer vencimiento', { type: 'date', disabled: doc.cuotas?.length > 0 })}
        {campo('tasaInteresAnual', 'Tasa de interés anual % (informativa)', { type: 'number', min: 0, step: 'any' })}
      </div>

      {doc.cuotas?.length > 0 && (
        <p className="cp-resumen__nota">
          El documento trae el detalle de {doc.cuotas.length} cuotas; la planilla se arma con esas fechas y montos.{' '}
          <button type="button" className="cp-link" onClick={() => setDoc({ ...doc, cuotas: [] })}>Ignorarlas y usar los datos de arriba</button>
        </p>
      )}

      {erroresDoc.length > 0 && (
        <ul className="q-alert" role="alert">
          {erroresDoc.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}

      <div className="cp-botones">
        <button type="button" className="q-btn q-btn--primary" onClick={armarPlanilla} disabled={erroresDoc.length > 0}>Armar planilla</button>
        <button type="button" className="q-btn q-btn--line" onClick={reiniciar}>Cancelar</button>
      </div>
    </div>
  )

  const renderPlanillaStep = () => (
    <div className="space-y-6">
      <section className="cp-resumen" aria-label="Resumen de la planilla">
        <h2 className="cp-resumen__titulo">Planilla de Control de Pagos</h2>
        <dl className="cp-resumen__datos">
          <div><dt>Tipo</dt><dd>{documentType === 'poliza' ? 'Póliza de Seguros' : 'Liquidación de Préstamo'}</dd></div>
          {doc.numeroDocumento && <div><dt>Documento</dt><dd>{doc.numeroDocumento}</dd></div>}
          {doc.emisor && <div><dt>Emisor</dt><dd>{doc.emisor}</dd></div>}
          <div><dt>Total del plan</dt><dd className="cp-num">{fMonto(resumen.total, moneda)}</dd></div>
          <div><dt>Pagado</dt><dd className="cp-num">{fMonto(resumen.pagado, moneda)} · {resumen.pagadas}/{cuotas.length}</dd></div>
          <div><dt>Pendiente</dt><dd className="cp-num">{fMonto(resumen.pendiente, moneda)}</dd></div>
          {resumen.vencidas > 0 && <div><dt>Vencidas sin pagar</dt><dd className="cp-num cp-alerta">{resumen.vencidas}</dd></div>}
        </dl>
        <p className="cp-resumen__nota">Marcá cada cuota cuando se pague; podés corregir la fecha y el monto pagado.</p>
      </section>

      <div id="payment-preview" className="cp-tabla-wrap">
        <table className="q-table cp-tabla" aria-label="Tabla de control de pagos">
          <thead>
            <tr>
              <th>Cuota</th>
              <th>Vencimiento</th>
              <th className="cp-der">Monto</th>
              <th>Estado</th>
              <th>Fecha de pago</th>
              <th className="cp-der">Monto pagado</th>
              <th className="cp-der">Saldo del plan</th>
              <th><span className="sr-only">Acción</span></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.numero}>
                <td>{f.numero}</td>
                <td className="cp-num">{fFecha(f.vencimiento)}</td>
                <td className="cp-der cp-num">{fMonto(f.monto, moneda)}</td>
                <td><span className={`cp-estado cp-estado--${f.estado.toLowerCase()}`}>{f.estado}</span></td>
                <td>
                  {f.fechaPago
                    ? <input type="date" className="q-input cp-mini" aria-label={`Fecha de pago cuota ${f.numero}`} value={f.fechaPago} onChange={(e) => cambiarPago(f.numero, 'fechaPago', e.target.value || hoyISO())} />
                    : '—'}
                </td>
                <td className="cp-der">
                  {f.fechaPago
                    ? <input type="number" min="0" step="any" className="q-input q-input--num cp-mini" aria-label={`Monto pagado cuota ${f.numero}`} value={f.montoPagado} onChange={(e) => cambiarPago(f.numero, 'montoPagado', e.target.value)} />
                    : '—'}
                </td>
                <td className="cp-der cp-num">{fMonto(f.saldo, moneda)}</td>
                <td>
                  <button type="button" className="q-btn q-btn--line cp-accion" onClick={() => alternarPago(f.numero)}>
                    {f.fechaPago ? 'Deshacer' : 'Marcar pagada'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cp-botones">
        <GuardarEnNube
          modulo="control-pagos"
          titulo={`Control de pagos · ${documentType === 'prestamo' ? 'Préstamo' : 'Póliza'}${doc.numeroDocumento ? ` · ${doc.numeroDocumento}` : file?.name ? ` · ${file.name}` : ''}`}
          resumen={{ Cuotas: cuotas.length, Pagadas: resumen.pagadas, Total: resumen.total, Pendiente: resumen.pendiente }}
          datos={{ documentType, archivo: file?.name || restaurar?.archivo || null, paymentData }}
        />
        <button type="button" className="q-btn q-btn--line" onClick={exportToExcel}><Download size={16} /> Descargar Excel</button>
        <button type="button" className="q-btn q-btn--line" onClick={exportToPDF}><Download size={16} /> Descargar PDF</button>
        <button type="button" className="q-btn q-btn--line" onClick={() => setStep('revisar')}><PencilLine size={16} /> Editar datos</button>
        <button type="button" className="q-btn q-btn--line" onClick={reiniciar}>Procesar otro documento</button>
      </div>
    </div>
  )

  return (
    <div className="q-sheet control-pagos-sheet">
      <PageHead
        title="Control de Pagos"
        lede="Cargá una póliza o liquidación de préstamo, revisá los datos y llevá el control de cada cuota."
        equation={[{ v: 'Saldo', sub: 'n' }, { op: '=' }, { v: 'Saldo', sub: 'n−1' }, { op: '−' }, { v: 'Pago', sub: 'n' }]}
        caption="cuota por cuota"
      />
      <Card className="q-card" shadow="none">
        <CardBody className="q-card__body">
          {error && <div className="q-alert" role="alert">{error}</div>}
          {aviso && <div className="q-alert q-alert--ok" role="status">{aviso}</div>}

          {step === 'upload' && renderUploadStep()}
          {step === 'processing' && (
            <div className="cp-procesando" role="status">
              <Loader2 size={28} className="cp-gira" aria-hidden="true" />
              <p className="cp-procesando__titulo">Leyendo el documento...</p>
              <p className="cp-resumen__nota">Esto puede tomar unos segundos</p>
            </div>
          )}
          {step === 'revisar' && renderRevisarStep()}
          {step === 'planilla' && renderPlanillaStep()}
        </CardBody>
      </Card>
    </div>
  )
}

export default ControlPagos
