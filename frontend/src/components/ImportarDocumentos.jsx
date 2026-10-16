import React, { useState } from 'react'
import axios from 'axios'
import '../styles/ImportarDocumentos.css'

const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://quadra-45d6.onrender.com'

function ImportarDocumentos() {
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState(null)
  const [extractedData, setExtractedData] = useState(null)
  const [validationResult, setValidationResult] = useState(null)
  const [editedData, setEditedData] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [step, setStep] = useState('upload') // upload, processing, review, export

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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0]
      const isImage = /\.(jpg|jpeg|png|gif|bmp)$/i.test(dropped.name)
      const isPDF = /\.pdf$/i.test(dropped.name)

      if (isImage || isPDF) {
        setFile(dropped)
        setError('')
        processFile(dropped)
      } else {
        setError('Formato no permitido. Use JPG, PNG, GIF, BMP o PDF.')
      }
    }
  }

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError('')
      processFile(e.target.files[0])
    }
  }

  const processFile = async (selectedFile) => {
    setLoading(true)
    setStep('processing')
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const token = localStorage.getItem('quaedra_token')
      const response = await axios.post(`${API_BASE_URL}/api/ocr/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.data.success) {
        setExtractedData(response.data.data)
        setValidationResult(response.data.validation)
        setEditedData({ ...response.data.data })
        setStep('review')
        setSuccess('✅ Datos extraídos correctamente')
      } else {
        setError(response.data.errors?.[0] || 'Error al procesar el archivo')
        setStep('upload')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al subir el archivo. Intenta con otro.')
      setStep('upload')
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (section, field, value) => {
    setEditedData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))
  }

  const handleValidate = async () => {
    try {
      const token = localStorage.getItem('quaedra_token')
      const response = await axios.post(`${API_BASE_URL}/api/ocr/validate`,
        { data: editedData },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setValidationResult(response.data)
      if (response.data.valid) {
        setSuccess('✅ Datos validados correctamente')
      }
    } catch (err) {
      setError('Error al validar los datos')
    }
  }

  const handleExport = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('quaedra_token')
      const response = await axios.post(
        `${API_BASE_URL}/api/ocr/export`,
        { invoices: [editedData], format: 'excel' },
        {
          responseType: 'blob',
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `RG90_${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setSuccess('✅ Archivo exportado correctamente')
      setStep('upload')
      setFile(null)
      setExtractedData(null)
      setEditedData(null)
    } catch (err) {
      setError('Error al exportar el archivo')
    } finally {
      setLoading(false)
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
        <h3>Arrastra tu archivo aquí</h3>
        <p>o haz clic para seleccionar</p>
        <p className="file-types">Soporta: JPG, PNG, PDF</p>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,.gif,.bmp"
          onChange={handleFileInput}
          className="file-input"
        />
      </div>
      {file && <div className="file-selected">✓ {file.name}</div>}
    </div>
  )

  const renderReviewStep = () => {
    if (!editedData) return null

    return (
      <div className="review-container">
        <div className="review-header">
          <h2>📋 Verificar Datos Extraídos</h2>
          <p>Revisa los datos extraídos. Puedes editarlos si es necesario.</p>
        </div>

        <div className="review-grid">
          {/* Sección Informante */}
          <div className="review-section">
            <h3>Informante</h3>
            <div className="field-group">
              <label>RUC</label>
              <input
                type="text"
                value={editedData.informante?.ruc || ''}
                onChange={(e) => handleFieldChange('informante', 'ruc', e.target.value)}
              />
            </div>
            <div className="field-group">
              <label>Nombre</label>
              <input
                type="text"
                value={editedData.informante?.nombre || ''}
                onChange={(e) => handleFieldChange('informante', 'nombre', e.target.value)}
              />
            </div>
          </div>

          {/* Sección Informado */}
          <div className="review-section">
            <h3>Proveedor</h3>
            <div className="field-group">
              <label>RUC</label>
              <input
                type="text"
                value={editedData.informado?.ruc || ''}
                onChange={(e) => handleFieldChange('informado', 'ruc', e.target.value)}
              />
            </div>
            <div className="field-group">
              <label>Nombre</label>
              <input
                type="text"
                value={editedData.informado?.nombre || ''}
                onChange={(e) => handleFieldChange('informado', 'nombre', e.target.value)}
              />
            </div>
          </div>

          {/* Sección Comprobante */}
          <div className="review-section">
            <h3>Comprobante</h3>
            <div className="field-group">
              <label>Número</label>
              <input
                type="text"
                value={editedData.comprobante?.numero || ''}
                onChange={(e) => handleFieldChange('comprobante', 'numero', e.target.value)}
              />
            </div>
            <div className="field-group">
              <label>Fecha</label>
              <input
                type="date"
                value={editedData.comprobante?.fechaEmision || ''}
                onChange={(e) => handleFieldChange('comprobante', 'fechaEmision', e.target.value)}
              />
            </div>
            <div className="field-group">
              <label>Timbrado</label>
              <input
                type="text"
                value={editedData.comprobante?.timbrado || ''}
                onChange={(e) => handleFieldChange('comprobante', 'timbrado', e.target.value)}
              />
            </div>
          </div>

          {/* Sección Montos */}
          <div className="review-section">
            <h3>Montos</h3>
            <div className="field-group">
              <label>Total Comprobante</label>
              <input
                type="number"
                value={editedData.financiero?.totalComprobante || 0}
                onChange={(e) =>
                  handleFieldChange('financiero', 'totalComprobante', parseFloat(e.target.value))
                }
              />
            </div>
            <div className="field-group">
              <label>IVA 10%</label>
              <input
                type="number"
                value={editedData.financiero?.iva10 || 0}
                onChange={(e) => handleFieldChange('financiero', 'iva10', parseFloat(e.target.value))}
              />
            </div>
            <div className="field-group">
              <label>IVA 5%</label>
              <input
                type="number"
                value={editedData.financiero?.iva5 || 0}
                onChange={(e) => handleFieldChange('financiero', 'iva5', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Mensajes de Validación */}
        {validationResult && (
          <div className="validation-box">
            <div className={`validation-status ${validationResult.valid ? 'valid' : 'invalid'}`}>
              {validationResult.valid ? '✅ Datos válidos' : '❌ Hay errores de validación'}
            </div>
            {validationResult.errors && validationResult.errors.length > 0 && (
              <div className="validation-errors">
                <h4>Errores:</h4>
                <ul>
                  {validationResult.errors.map((err, idx) => (
                    <li key={idx}>
                      <strong>{err.field}:</strong> {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {validationResult.warnings && validationResult.warnings.length > 0 && (
              <div className="validation-warnings">
                <h4>Advertencias:</h4>
                <ul>
                  {validationResult.warnings.map((warn, idx) => (
                    <li key={idx}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Botones de Acción */}
        <div className="action-buttons">
          <button className="btn btn-secondary" onClick={() => setStep('upload')}>
            ← Otra factura
          </button>
          <button className="btn btn-info" onClick={handleValidate} disabled={loading}>
            ✓ Validar Datos
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={loading || !validationResult?.valid}
          >
            {loading ? '⏳ Exportando...' : '📥 Descargar Excel'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="importar-documentos">
      <div className="card">
        <div className="header">
          <h1>📄 Importar Documentos</h1>
          <p>OCR y procesamiento de facturas para Marangatu</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {step === 'upload' && renderUploadStep()}
        {step === 'processing' && (
          <div className="processing">
            <div className="spinner"></div>
            <p>Procesando documento...</p>
            <p className="subtitle">Esto puede tomar unos segundos</p>
          </div>
        )}
        {step === 'review' && renderReviewStep()}
      </div>
    </div>
  )
}

export default ImportarDocumentos
