import React, { useState } from 'react'
import axios from 'axios'
import { utils, writeFile } from 'xlsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { Card, CardBody, CardHeader, Button, Spinner, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, RadioGroup, Radio, Chip } from '@heroui/react'
import { Upload, FileText, Download, CheckCircle } from 'lucide-react'
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
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-primary">Tipo de Documento</label>
        <RadioGroup
          value={documentType}
          onValueChange={setDocumentType}
          orientation="horizontal"
        >
          <Radio value="poliza">🛡️ Póliza de Seguros</Radio>
          <Radio value="prestamo">💰 Liquidación de Préstamo</Radio>
        </RadioGroup>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
          dragActive
            ? 'border-accent bg-accent bg-opacity-10'
            : 'border-border hover:border-accent'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 mx-auto mb-3 text-accent" />
        <h3 className="text-lg font-semibold text-primary mb-1">Arrastra el documento aquí</h3>
        <p className="text-text-secondary mb-2">o haz clic para seleccionar un archivo</p>
        <p className="text-xs text-text-secondary mb-4">Soporta: PDF, JPG, PNG, Excel</p>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.xlsx,.xls"
          onChange={handleFileInput}
          className="hidden"
          id="file-input"
        />
        <label htmlFor="file-input" className="cursor-pointer">
          <Button
            as="span"
            color="primary"
            variant="bordered"
            size="sm"
          >
            Seleccionar Archivo
          </Button>
        </label>
      </div>

      {file && (
        <Card>
          <CardBody className="flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <FileText className="w-6 h-6 text-accent flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-primary truncate">{file.name}</p>
                <p className="text-sm text-text-secondary">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onClick={removeFile}
            >
              ✕
            </Button>
          </CardBody>
        </Card>
      )}

      {file && (
        <Button
          color="primary"
          size="lg"
          className="w-full font-semibold"
          onClick={processFile}
          disabled={loading}
          startContent={loading ? <Spinner size="sm" /> : <Upload size={20} />}
        >
          {loading ? 'Procesando...' : 'Procesar Archivo'}
        </Button>
      )}
    </div>
  )

  const renderPreviewStep = () => {
    if (!paymentData) return null

    const getStatusColor = (status) => {
      const statusLower = (status || 'pendiente').toLowerCase()
      if (statusLower.includes('pagado') || statusLower.includes('paid')) return 'success'
      if (statusLower.includes('pendiente') || statusLower.includes('pending')) return 'warning'
      return 'default'
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col items-start gap-3">
            <h2 className="text-xl font-bold text-primary">📊 Planilla de Control de Pagos</h2>
            <div className="flex flex-wrap gap-4 w-full">
              <div>
                <p className="text-sm text-text-secondary">Tipo de Documento</p>
                <p className="font-semibold text-primary">{documentType === 'poliza' ? '🛡️ Póliza de Seguros' : '💰 Liquidación de Préstamo'}</p>
              </div>
              {paymentData.documentNumber && (
                <div>
                  <p className="text-sm text-text-secondary">Documento</p>
                  <p className="font-semibold text-primary">{paymentData.documentNumber}</p>
                </div>
              )}
              {paymentData.issuer && (
                <div>
                  <p className="text-sm text-text-secondary">Emisor</p>
                  <p className="font-semibold text-primary">{paymentData.issuer}</p>
                </div>
              )}
              {paymentData.totalAmount && (
                <div>
                  <p className="text-sm text-text-secondary">Monto Total</p>
                  <p className="font-semibold text-accent">{paymentData.totalAmount.toLocaleString('es-PY', { minimumFractionDigits: 2 })}</p>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        <div id="payment-preview">
          <Table
            aria-label="Tabla de control de pagos"
            isCompact
            removeWrapper
          >
            <TableHeader>
              <TableColumn>Mes</TableColumn>
              <TableColumn>Fecha Vencimiento</TableColumn>
              <TableColumn align="right">Monto Pagable</TableColumn>
              <TableColumn align="center">Estado</TableColumn>
              <TableColumn>Fecha Pago</TableColumn>
              <TableColumn align="right">Monto Pagado</TableColumn>
              <TableColumn align="right">Saldo</TableColumn>
            </TableHeader>
            <TableBody>
              {paymentData.payments && paymentData.payments.map((payment, idx) => (
                <TableRow key={idx}>
                  <TableCell>{payment.mes || payment.month}</TableCell>
                  <TableCell>{payment.fechaVencimiento || payment.dueDate}</TableCell>
                  <TableCell className="text-right font-semibold text-accent">
                    {payment.montoPagable || payment.amount ? (payment.montoPagable || payment.amount).toLocaleString('es-PY', { minimumFractionDigits: 2 }) : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Chip
                      size="sm"
                      color={getStatusColor(payment.estado || payment.status)}
                      variant="flat"
                    >
                      {payment.estado || payment.status || 'Pendiente'}
                    </Chip>
                  </TableCell>
                  <TableCell>{payment.fechaPago || payment.paymentDate || '-'}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {payment.montoPagado || payment.paidAmount ? (payment.montoPagado || payment.paidAmount).toLocaleString('es-PY', { minimumFractionDigits: 2 }) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {payment.saldo || payment.balance ? (payment.saldo || payment.balance).toLocaleString('es-PY', { minimumFractionDigits: 2 }) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button
            color="success"
            startContent={<Download size={18} />}
            onClick={exportToExcel}
          >
            Descargar Excel
          </Button>
          <Button
            color="secondary"
            startContent={<Download size={18} />}
            onClick={exportToPDF}
          >
            Descargar PDF
          </Button>
          <Button
            color="primary"
            variant="bordered"
            onClick={() => {
              setStep('upload')
              setPaymentData(null)
              setFile(null)
            }}
          >
            ➕ Procesar otro archivo
          </Button>
        </div>
      </div>
    )
  }

  const renderCompleteStep = () => (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <CheckCircle className="w-16 h-16 text-success" />
      <h2 className="text-2xl font-bold text-primary">¡Proceso completado!</h2>
      <p className="text-text-secondary">Tu planilla de control de pagos está lista para descargar</p>
      <Button
        color="primary"
        onClick={() => {
          setStep('upload')
          setSuccess('')
          setPaymentData(null)
        }}
      >
        ➕ Procesar otro archivo
      </Button>
    </div>
  )

  return (
    <Card className="max-w-4xl">
      <CardHeader className="flex flex-col items-start gap-2">
        <h1 className="text-2xl font-bold text-primary">💳 Control de Pagos</h1>
        <p className="text-text-secondary">Carga facturas electrónicas de pólizas o liquidaciones de préstamos y obtén una planilla de control</p>
      </CardHeader>
      <CardBody className="gap-6">
        {error && (
          <div className="bg-red-100 dark:bg-red-950 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 dark:bg-green-950 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-200 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {step === 'upload' && renderUploadStep()}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Spinner size="lg" color="primary" />
            <p className="text-lg font-semibold text-primary">{processingProgress || 'Procesando archivo...'}</p>
            <p className="text-sm text-text-secondary">Esto puede tomar unos segundos</p>
          </div>
        )}
        {step === 'preview' && renderPreviewStep()}
        {step === 'complete' && renderCompleteStep()}
      </CardBody>
    </Card>
  )
}

export default ControlPagos
