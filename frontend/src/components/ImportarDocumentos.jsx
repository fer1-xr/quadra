import React, { useState } from 'react'
import PageHead, { Figures } from './PageHead'
import axios from 'axios'
import { Card, CardBody, CardHeader, Button, Spinner, Progress, Chip } from '@heroui/react'
import { Upload, File, X, FileUp, CheckCircle2, Paperclip, Download, FileSpreadsheet, AlertTriangle, RotateCcw } from 'lucide-react'
import { API_BASE_URL, authHeaders } from '../services/api'
import '../styles/ImportarDocumentos.css'

/** baja un archivo ya generado (blob URL) con su nombre */
const bajar = (url, nombre) => {
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', nombre)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function ImportarDocumentos({ contribuyente }) {
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [step, setStep] = useState('upload') // upload, processing, complete
  const [processingProgress, setProcessingProgress] = useState('')
  const [resumen, setResumen] = useState(null)
  // Excel de la última lectura, para volver a bajarlo sin procesar de nuevo
  const [descarga, setDescarga] = useState(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files))
    }
  }

  const addFiles = (newFiles) => {
    const validFiles = newFiles.filter((file) => {
      const isImage = /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name)
      const isPDF = /\.pdf$/i.test(file.name)
      return isImage || isPDF
    })

    if (validFiles.length !== newFiles.length) {
      setError(`${newFiles.length - validFiles.length} archivo(s) no soportado(s)`)
    }

    setFiles((prev) => [...prev, ...validFiles])
    setError(validFiles.length !== newFiles.length ? `${newFiles.length - validFiles.length} archivo(s) no soportado(s): usá JPG, PNG, WEBP o PDF` : '')
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const processFiles = async () => {
    if (files.length === 0) {
      setError('Selecciona al menos un archivo')
      return
    }

    setLoading(true)
    setStep('processing')
    setError('')
    setSuccess('')
    setProcessingProgress(`Procesando ${files.length} archivo(s)...`)

    try {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('files', file)
      })
      if (contribuyente) {
        formData.append('contribuyenteRuc', contribuyente.ruc || '')
        formData.append('contribuyenteNombre', contribuyente.razonSocial || '')
      }

      const auth = await authHeaders()
      const response = await axios.post(`${API_BASE_URL}/api/ocr/batch`, formData, {
        responseType: 'blob',
        headers: {
          ...auth,
        },
      })

      // resumen de la lectura (cuántas facturas se leyeron y cuáles no)
      let r = { leidas: files.length, fallidas: [], observadas: 0 }
      try {
        const h = response.headers['x-ocr-resumen']
        if (h) r = JSON.parse(decodeURIComponent(h))
      } catch { /* sin resumen: se asume que se leyeron todas */ }
      setResumen(r)

      // Descargar Excel directamente (queda guardado para volver a bajarlo)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const nombre = `FACTURAS_LEIDAS_${contribuyente?.ruc ? `${contribuyente.ruc}_` : ''}${new Date().toISOString().split('T')[0]}.xlsx`
      if (descarga) window.URL.revokeObjectURL(descarga.url)
      setDescarga({ url, nombre, total: files.length })
      bajar(url, nombre)
      setStep('complete')
      setFiles([])
    } catch (err) {
      // con responseType 'blob' el error del servidor también llega como blob
      let mensaje = ''
      const data = err.response?.data
      try {
        const json = data instanceof Blob ? JSON.parse(await data.text()) : data
        mensaje = json?.error || ''
      } catch { /* respuesta sin JSON */ }
      setError(mensaje || (err.response ? `Error del servidor (${err.response.status}) al procesar los archivos.` : 'No se pudo conectar con el servidor. Intentá de nuevo.'))
      setStep('upload')
    } finally {
      setLoading(false)
      setProcessingProgress('')
    }
  }


  const renderUploadStep = () => (
    <div className="upload-container">
      <div
        className={`drop-zone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="drop-icon"><FileUp size={24} strokeWidth={1.6} /></div>
        <h3>Arrastra archivos aquí</h3>
        <p>o haz clic para seleccionar múltiples archivos</p>
        <p className="file-types">Soporta: JPG, PNG, WEBP o PDF · hasta 10 MB y 20 archivos por vez</p>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.pdf"
          onChange={handleFileInput}
          className="file-input"
          multiple
        />
      </div>

      {files.length > 0 && (
        <div className="files-list">
          <h3>Archivos seleccionados ({files.length})</h3>
          <div className="files-items">
            {files.map((file, idx) => (
              <div key={idx} className="file-item">
                <span className="file-icon"><Paperclip size={15} strokeWidth={1.6} /></span>
                <span className="file-name">{file.name}</span>
                <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                <button
                  className="btn-remove"
                  onClick={() => removeFile(idx)}
                  title="Eliminar archivo"
                >
                  <X size={14} strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>

          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={processFiles}
              disabled={loading || files.length === 0}
            >
              {loading ? 'Procesando...' : `Procesar ${files.length} archivo(s)`}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  const nuevaLectura = () => {
    setStep('upload')
    setSuccess('')
    setResumen(null)
  }

  const renderCompleteStep = () => {
    const leidas = resumen?.leidas ?? 0
    const fallidas = resumen?.fallidas || []
    const observadas = resumen?.observadas || 0
    const parcial = fallidas.length > 0
    return (
      <div className="idoc-res" role="status">
        <div className={`idoc-res__icono ${parcial ? 'is-warn' : ''}`} aria-hidden="true">
          {parcial ? <AlertTriangle size={30} strokeWidth={1.8} /> : <CheckCircle2 size={30} strokeWidth={1.8} />}
        </div>
        <h2 className="idoc-res__titulo">{parcial ? 'Excel descargado, con archivos sin leer' : 'Listo, tu Excel ya se descargó'}</h2>
        <p className="idoc-res__lede">
          {leidas === 1 ? 'Se leyó 1 factura' : `Se leyeron ${leidas} facturas`}
          {descarga?.total ? ` de ${descarga.total} archivo${descarga.total === 1 ? '' : 's'}` : ''}.
          {descarga && <> Archivo: <b>{descarga.nombre}</b></>}
        </p>

        <dl className="idoc-res__cifras">
          <div className="is-ok"><dt>Leídas</dt><dd>{leidas}</dd></div>
          <div className={observadas ? 'is-warn' : ''}><dt>Para revisar</dt><dd>{observadas}</dd></div>
          <div className={fallidas.length ? 'is-err' : ''}><dt>Sin leer</dt><dd>{fallidas.length}</dd></div>
        </dl>

        {observadas > 0 && (
          <p className="idoc-res__aviso is-warn">
            <AlertTriangle size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>{observadas === 1 ? '1 factura tiene' : `${observadas} facturas tienen`} algo para revisar (IVA, totales o RUC). Está anotado en la columna <b>Observaciones</b>.</span>
          </p>
        )}
        {parcial && (
          <div className="idoc-res__aviso is-err">
            <AlertTriangle size={16} strokeWidth={1.8} aria-hidden="true" />
            <div>
              <b>No se pudieron leer:</b>
              <ul>{fallidas.map((f) => <li key={f.archivo}><b>{f.archivo}</b>: {f.motivo}</li>)}</ul>
              También están en la hoja «No leídos» del Excel.
            </div>
          </div>
        )}

        <ul className="idoc-res__hojas" aria-label="Hojas del Excel">
          <li><FileSpreadsheet size={16} strokeWidth={1.7} aria-hidden="true" /><span><b>Libro Compras</b> una fila por factura, con IVA y totales</span></li>
          <li><FileSpreadsheet size={16} strokeWidth={1.7} aria-hidden="true" /><span><b>Ítems</b> el detalle de cada factura</span></li>
          <li><FileSpreadsheet size={16} strokeWidth={1.7} aria-hidden="true" /><span><b>Datos completos</b> emisor, timbrado, cliente, totales en letras</span></li>
        </ul>

        <div className="idoc-res__acciones">
          {descarga && (
            <button type="button" className="idoc-btn idoc-btn--linea" onClick={() => bajar(descarga.url, descarga.nombre)}>
              <Download size={16} strokeWidth={1.8} aria-hidden="true" /> Descargar de nuevo
            </button>
          )}
          <button type="button" className="idoc-btn idoc-btn--primario" onClick={nuevaLectura}>
            <RotateCcw size={16} strokeWidth={1.8} aria-hidden="true" /> Leer más facturas
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="importar-documentos">
      <PageHead
        title="Importar Documentos"
        lede="Subí fotos o PDF de las facturas de tus proveedores: Quadra lee emisor, timbrado, número, fecha, cliente, ítems, totales e IVA, y te devuelve todo en un Excel."
        equation={[{ v: 'Factura' }, { op: '→' }, { v: 'Datos' }, { op: '→' }, { v: 'Excel' }]}
        caption="extracción automática"
      />
      <div className="card">

        {error && <div className="alert alert-error">{error}</div>}
        {success && step !== 'complete' && <div className="alert alert-success">{success}</div>}

        {step === 'upload' && renderUploadStep()}
        {step === 'processing' && (
          <div className="processing">
            <div className="spinner"></div>
            <p>{processingProgress || 'Procesando archivos...'}</p>
            <p className="subtitle">Suele tardar unos segundos por factura. Si Google está con mucha demanda, Quadra reintenta sola y puede demorar hasta un minuto.</p>
          </div>
        )}
        {step === 'complete' && renderCompleteStep()}
      </div>
    </div>
  )
}

export default ImportarDocumentos
