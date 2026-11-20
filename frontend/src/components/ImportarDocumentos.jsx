import React, { useState } from 'react'
import PageHead, { Figures } from './PageHead'
import axios from 'axios'
import { Card, CardBody, CardHeader, Button, Spinner, Progress, Chip } from '@heroui/react'
import { Upload, File, X, FileUp, CheckCircle2, Paperclip } from 'lucide-react'
import { API_BASE_URL, authHeaders } from '../services/api'
import '../styles/ImportarDocumentos.css'

function ImportarDocumentos({ contribuyente }) {
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [step, setStep] = useState('upload') // upload, processing, complete
  const [processingProgress, setProcessingProgress] = useState('')
  const [resumen, setResumen] = useState(null)

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

      // Descargar Excel directamente
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `FACTURAS_LEIDAS_${contribuyente?.ruc ? `${contribuyente.ruc}_` : ''}${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setSuccess(`${r.leidas} de ${files.length} factura(s) leídas${r.fallidas.length ? `; ${r.fallidas.length} no se pudieron leer` : ''}`)
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

  const renderCompleteStep = () => (
    <div className="complete-container">
      <div className="complete-icon"><CheckCircle2 size={28} strokeWidth={1.6} /></div>
      <h2>¡Listo!</h2>
      <p>Tu Excel se descargó con las hojas Libro Compras, Ítems y Datos completos de cada factura.</p>
      {resumen?.observadas > 0 && (
        <p className="subtitle">{resumen.observadas} factura(s) tienen observaciones (IVA, totales o RUC por revisar): mirá la columna Observaciones.</p>
      )}
      {resumen?.fallidas?.length > 0 && (
        <div className="alert alert-error" style={{ textAlign: 'left' }}>
          <strong>No se pudieron leer:</strong>
          <ul>{resumen.fallidas.map((f) => <li key={f.archivo}>{f.archivo}: {f.motivo}</li>)}</ul>
          Están en la hoja «No leídos» del Excel. Probá con una foto más nítida y derecha.
        </div>
      )}
      <button
        className="btn btn-primary"
        onClick={() => {
          setStep('upload')
          setSuccess('')
          setResumen(null)
        }}
      >
        Procesar más archivos
      </button>
    </div>
  )

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
        {success && <div className="alert alert-success">{success}</div>}

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
