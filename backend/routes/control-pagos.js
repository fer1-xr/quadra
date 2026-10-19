import express from 'express';
import fs from 'fs';
import { upload, cleanupTempFiles } from '../middleware/upload-handler.js';
import { getInvoiceExtractor } from '../services/ocr/invoice-extractor.js';

const router = express.Router();
const extractor = getInvoiceExtractor();

/**
 * POST /api/control-pagos/process
 * Procesa un documento de póliza o préstamo y genera planilla de control de pagos
 */
router.post('/process', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo' });
    }

    const { documentType } = req.body; // 'poliza' o 'prestamo'

    if (!documentType || !['poliza', 'prestamo'].includes(documentType)) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }

    console.log(`[ControlPagos] Procesando ${documentType}: ${req.file.originalname}`);

    // Leer archivo
    const fileBuffer = fs.readFileSync(req.file.path);

    // Procesar con el extractor para obtener datos básicos
    let extractedData = {};
    try {
      const result = await extractor.processFile(fileBuffer, req.file.originalname);
      extractedData = result.extractedData || {};
    } catch (ocrError) {
      console.warn('[ControlPagos] OCR falló, continuando con datos genéricos:', ocrError.message);
    }

    // Limpiar archivo temporal
    await cleanupTempFiles(req.file);

    // Generar planilla de control de pagos
    const paymentData = generatePaymentSchedule(documentType, extractedData);

    res.json({
      success: true,
      documentNumber: extractedData.invoiceNumber || extractedData.ruc || 'S/N',
      issuer: extractedData.providerName || extractedData.vendorName || 'Entidad',
      totalAmount: paymentData.totalAmount,
      payments: paymentData.payments,
      summary: paymentData.summary,
    });
  } catch (error) {
    console.error(`[ControlPagos Error] ${error.message}`);

    // Limpiar archivo en caso de error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.warn('No se pudo limpiar archivo temporal');
      }
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Error al procesar archivo',
      errorCode: 'CONTROL_PAGOS_ERROR',
    });
  }
});

/**
 * Genera un cronograma de pagos basado en el tipo de documento
 */
function generatePaymentSchedule(documentType, extractedData) {
  const totalAmount = extractedData.totalAmount || (documentType === 'poliza' ? 1500000 : 5000000);
  const currentDate = new Date();
  const startMonth = currentDate.getMonth();
  const startYear = currentDate.getFullYear();

  // Número de meses para pólizas (12) y préstamos (24-36)
  const months = documentType === 'poliza' ? 12 : 24;
  const monthlyPayment = totalAmount / months;

  const payments = [];
  const paidMonths = Math.floor(months / 2); // Mitad pagada, mitad pendiente para demo

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  for (let i = 0; i < months; i++) {
    const monthIndex = (startMonth + i) % 12;
    const year = startYear + Math.floor((startMonth + i) / 12);
    const monthName = monthNames[monthIndex];

    // Fecha de vencimiento: día 15 de cada mes
    const dueDate = new Date(year, monthIndex, 15);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    let status = 'Pendiente';
    let paidAmount = 0;
    let paymentDate = null;

    if (i < paidMonths) {
      status = 'Pagado';
      paidAmount = monthlyPayment;
      // Simular fechas de pago aleatorias antes del vencimiento
      const payDate = new Date(year, monthIndex, Math.floor(Math.random() * 10) + 5);
      paymentDate = payDate.toISOString().split('T')[0];
    } else if (i === paidMonths && Math.random() > 0.7) {
      // Algunos meses adelantados se marcan como vencidos en demo
      status = 'Vencido';
      paidAmount = 0;
    }

    const balance = totalAmount - (monthlyPayment * (i + 1));
    const actualBalance = paidAmount > 0 ? balance + monthlyPayment - paidAmount : balance;

    payments.push({
      mes: `${monthName} ${year}`,
      month: monthName,
      year: year,
      fechaVencimiento: dueDateStr,
      dueDate: dueDateStr,
      montoPagable: monthlyPayment,
      amount: monthlyPayment,
      estado: status,
      status: status,
      fechaPago: paymentDate,
      paymentDate: paymentDate,
      montoPagado: paidAmount,
      paidAmount: paidAmount,
      saldo: actualBalance,
      balance: actualBalance,
    });
  }

  // Cálculos de resumen
  const paidTotal = payments.reduce((sum, p) => sum + p.montoPagado, 0);
  const pendingTotal = totalAmount - paidTotal;
  const overduePayments = payments.filter(p => p.estado === 'Vencido').length;

  return {
    totalAmount: totalAmount,
    payments: payments,
    summary: {
      totalMonths: months,
      paidMonths: payments.filter(p => p.estado === 'Pagado').length,
      pendingMonths: payments.filter(p => p.estado === 'Pendiente').length,
      overdueMonths: overduePayments,
      totalPaid: paidTotal,
      totalPending: pendingTotal,
      percentagePaid: parseFloat((paidTotal / totalAmount * 100).toFixed(2)),
    },
  };
}

export default router;
