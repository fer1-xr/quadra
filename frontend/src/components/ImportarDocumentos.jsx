import React, { useState } from 'react'
import axios from 'axios'
import '../styles/ImportarDocumentos.css'

const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://quadra-45d6.onrender.com'

function ImportarDocumentos() {
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [step, setStep] = useState('upload') // upload, processing, complete
  const [processingProgress, setProcessingProgress] = useState('')

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
      const isImage = /\.(jpg|jpeg|png|gif|bmp)$/i.test(file.name)
      const isPDF = /\.pdf$/i.test(file.name)
      return isImage || isPDF
    })

    if (validFiles.length !== newFiles.length) {
      setError(`${newFiles.length - validFiles.length} archivo(s) no soportado(s)`)
    }

    setFiles((prev) => [...prev, ...validFiles])
    setError('')
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

      const token = localStorage.getItem('quaedra_token')
      const response = await axios.post(`${API_BASE_URL}/api/ocr/batch`, formData, {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      // Descargar Excel directamente
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `LIBRO_COMPRAS_${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setSuccess(`✅ ${files.length} archivo(s) procesados correctamente`)
      setStep('complete')
      setFiles([])
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar archivos. Intenta de nuevo.')
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
        <div className="drop-icon">📄</div>
        <h3>Arrastra archivos aquí</h3>
        <p>o haz clic para seleccionar múltiples archivos</p>
        <p className="file-types">Soporta: JPG, PNG, GIF, BMP, PDF (con múltiples páginas)</p>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,.gif,.bmp"
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
                <span className="file-icon">📎</span>
                <span className="file-name">{file.name}</span>
                <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                <button
                  className="btn-remove"
                  onClick={() => removeFile(idx)}
                  title="Eliminar archivo"
                >
                  ✕
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
              {loading ? '⏳ Procesando...' : `📥 Procesar ${files.length} archivo(s)`}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  const renderCompleteStep = () => (
    <div className="complete-container">
      <div className="complete-icon">✅</div>
      <h2>¡Listo!</h2>
      <p>Tu archivo Excel ha sido descargado automáticamente</p>
      <button
        className="btn btn-primary"
        onClick={() => {
          setStep('upload')
          setSuccess('')
        }}
      >
        ➕ Procesar más archivos
      </button>
    </div>
  )

  return (
    <div className="importar-documentos">
      <div className="card">
        <div className="header">
          <h1>📄 Importar Documentos</h1>
          <p>Sube imágenes o PDFs de facturas - Se extraerán automáticamente a Excel</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {step === 'upload' && renderUploadStep()}
        {step === 'processing' && (
          <div className="processing">
            <div className="spinner"></div>
            <p>{processingProgress || 'Procesando archivos...'}</p>
            <p className="subtitle">Esto puede tomar unos segundos</p>
          </div>
        )}
        {step === 'complete' && renderCompleteStep()}
      </div>
    </div>
  )
}

export default ImportarDocumentos
