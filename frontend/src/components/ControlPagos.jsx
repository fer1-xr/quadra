import React, { useState } from 'react'
import axios from 'axios'
import { utils, writeFile } from 'xlsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import '../styles/ControlPagos.css'

const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://quadra-45d6.onrender.com'

function ControlPagos() {
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [step, setStep] = useState('upload') // upload, processing, preview, complete
  const [processingProgress, setProcessingProgress] = useState('')
  const [paymentData, setPaymentData] = useState(null)
  const [documentType, setDocumentType] = useState('poliza') // poliza or prestamo

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
      const droppedFile = e.dataTransfer.files[0]
      validateAndSetFile(droppedFile)
    }
  }

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const validateAndSetFile = (newFile) => {
    const isPDF = /\.pdf$/i.test(newFile.name)
    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(newFile.name)
    const isExcel = /\.(xlsx|xls)$/i.test(newFile.name)

    if (!isPDF && !isImage && !isExcel) {
      setError('Formato no soportado. Usa PDF, imágenes (JPG, PNG) o Excel.')
      setFile(null)
      return
    }

    setFile(newFile)
    setError('')
  }

  const removeFile = () => {
    setFile(null)
    setError('')
  }

  const processFile = async () => {
    if (!file) {
      setError('Selecciona un archivo')
      return
    }

    setLoading(true)
    setStep('processing')
    setError('')
    setSuccess('')
    setProcessingProgress('Procesando archivo...')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', documentType)

      const token = localStorage.getItem('quaedra_token')
      const response = await axios.post(`${API_BASE_URL}/api/control-pagos/process`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      })

      setPaymentData(response.data)
      setStep('preview')
      setSuccess('✅ Archivo procesado correctamente')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar archivo. Intenta de nuevo.')
      setStep('upload')
    } finally {
      setLoading(false)
      setProcessingProgress('')
    }
  }

  const exportToExcel = () => {
    if (!paymentData) return

    const ws = utils.json_to_sheet(paymentData.payments)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Control Pagos')

    // Estilos básicos
    ws['!cols'] = [
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
    ]

    writeFile(wb, `control-pagos-${documentType}-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const exportToPDF = async () => {
    if (!paymentData) return

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

    pdf.save(`control-pagos-${documentType}-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const renderUploadStep = () => (
    <div className="upload-container">
      <div className="type-selector">
        <label>Tipo de documento:</label>
        <div className="radio-group">
          <label className="radio-option">
            <input
              type="radio"
              value="poliza"
              checked={documentType === 'poliza'}
              onChange={(e) => setDocumentType(e.target.value)}
            />
            <span>Póliza de Seguros</span>
          </label>
          <label className="radio-option">
            <input
              type="radio"
              value="prestamo"
              checked={documentType === 'prestamo'}
              onChange={(e) => setDocumentType(e.target.value)}
            />
            <span>Liquidación de Préstamo</span>
          </label>
        </div>
      </div>

      <div
        className={`drop-zone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="drop-icon">📋</div>
        <h3>Arrastra el documento aquí</h3>
        <p>o haz clic para seleccionar un archivo</p>
        <p className="file-types">Soporta: PDF, JPG, PNG, Excel</p>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.xlsx,.xls"
          onChange={handleFileInput}
          className="file-input"
        />
      </div>

      {file && (
        <div className="file-selected">
          <div className="file-item">
            <span className="file-icon">📎</span>
            <span className="file-name">{file.name}</span>
            <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
            <button
              className="btn-remove"
              onClick={removeFile}
              title="Eliminar archivo"
            >
              ✕
            </button>
          </div>

          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={processFile}
              disabled={loading || !file}
            >
              {loading ? '⏳ Procesando...' : '📥 Procesar Archivo'}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  const renderPreviewStep = () => {
    if (!paymentData) return null

    return (
      <div className="preview-container">
        <div className="preview-header">
          <h2>📊 Planilla de Control de Pagos</h2>
          <div className="document-info">
            <p><strong>Tipo:</strong> {documentType === 'poliza' ? 'Póliza de Seguros' : 'Liquidación de Préstamo'}</p>
            {paymentData.documentNumber && <p><strong>Documento:</strong> {paymentData.documentNumber}</p>}
            {paymentData.issuer && <p><strong>Emisor:</strong> {paymentData.issuer}</p>}
            {paymentData.totalAmount && <p><strong>Monto Total:</strong> {paymentData.totalAmount.toLocaleString('es-PY', { minimumFractionDigits: 2 })}</p>}
          </div>
        </div>

        <div id="payment-preview" className="preview-table">
          <table>
            <thead>
              <tr>
                <th>Mes</th>
                <th>Fecha Vencimiento</th>
                <th>Monto Pagable</th>
                <th>Estado</th>
                <th>Fecha Pago</th>
                <th>Monto Pagado</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {paymentData.payments && paymentData.payments.map((payment, idx) => (
                <tr key={idx}>
                  <td>{payment.mes || payment.month}</td>
                  <td>{payment.fechaVencimiento || payment.dueDate}</td>
                  <td className="amount">{payment.montoPagable || payment.amount ? (payment.montoPagable || payment.amount).toLocaleString('es-PY', { minimumFractionDigits: 2 }) : '-'}</td>
                  <td><span className={`status ${payment.estado?.toLowerCase() || payment.status?.toLowerCase() || 'pendiente'}`}>{payment.estado || payment.status || 'Pendiente'}</span></td>
                  <td>{payment.fechaPago || payment.paymentDate || '-'}</td>
                  <td className="amount">{payment.montoPagado || payment.paidAmount ? (payment.montoPagado || payment.paidAmount).toLocaleString('es-PY', { minimumFractionDigits: 2 }) : '-'}</td>
                  <td className="amount">{payment.saldo || payment.balance ? (payment.saldo || payment.balance).toLocaleString('es-PY', { minimumFractionDigits: 2 }) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="action-buttons">
          <button className="btn btn-success" onClick={exportToExcel}>
            📊 Descargar Excel
          </button>
          <button className="btn btn-info" onClick={exportToPDF}>
            📄 Descargar PDF
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setStep('upload')
              setPaymentData(null)
              setFile(null)
            }}
          >
            ➕ Procesar otro archivo
          </button>
        </div>
      </div>
    )
  }

  const renderCompleteStep = () => (
    <div className="complete-container">
      <div className="complete-icon">✅</div>
      <h2>¡Proceso completado!</h2>
      <p>Tu planilla de control de pagos está lista para descargar</p>
      <button
        className="btn btn-primary"
        onClick={() => {
          setStep('upload')
          setSuccess('')
          setPaymentData(null)
        }}
      >
        ➕ Procesar otro archivo
      </button>
    </div>
  )

  return (
    <div className="control-pagos">
      <div className="card">
        <div className="header">
          <h1>💳 Control de Pagos</h1>
          <p>Carga facturas electrónicas de pólizas o liquidaciones de préstamos y obtén una planilla de control</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {step === 'upload' && renderUploadStep()}
        {step === 'processing' && (
          <div className="processing">
            <div className="spinner"></div>
            <p>{processingProgress || 'Procesando archivo...'}</p>
            <p className="subtitle">Esto puede tomar unos segundos</p>
          </div>
        )}
        {step === 'preview' && renderPreviewStep()}
        {step === 'complete' && renderCompleteStep()}
      </div>
    </div>
  )
}

export default ControlPagos
