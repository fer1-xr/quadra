import express from 'express';
import fs from 'fs';
import { getInvoiceExtractor } from '../services/ocr/invoice-extractor.js';
import { RG90Exporter } from '../services/ocr/rg90-exporter.js';
import { upload, cleanupTempFiles } from '../middleware/upload-handler.js';

const router = express.Router();
const extractor = getInvoiceExtractor();

/**
 * POST /api/ocr/upload
 * Procesa un archivo (imagen o PDF) y extrae datos
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo' });
    }

    console.log(`[OCR] Procesando archivo: ${req.file.originalname}`);

    // Leer archivo
    const fileBuffer = fs.readFileSync(req.file.path);

    // Procesar con el extractor
    const result = await extractor.processFile(fileBuffer, req.file.originalname);

    // Limpiar archivo temporal
    await cleanupTempFiles(req.file);

    // Retornar resultado
    res.json({
      success: result.success,
      data: result.extractedData || null,
      validation: result.validation || null,
      confidence: result.confidence || {},
      errors: result.error ? [result.error] : result.validation?.errors || [],
      warnings: result.validation?.warnings || [],
      missingFields: result.missingFields || [],
    });
  } catch (error) {
    console.error(`[OCR Error] ${error.message}`);

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
      error: error.message,
      errorCode: 'OCR_PROCESSING_ERROR',
    });
  }
});

/**
 * POST /api/ocr/validate
 * Valida datos extraídos contra schema RG90
 */
router.post('/validate', async (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({
        error: 'Datos requeridos en body',
      });
    }

    // Importar validador
    const { validateRG90Data, calculateConfidence } = await import(
      '../services/ocr/field-validator.js'
    );

    const validationResult = validateRG90Data(data);
    const confidence = calculateConfidence(data, validationResult);

    res.json({
      valid: validationResult.valid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      confidence: parseFloat((confidence * 100).toFixed(2)),
      cleanedData: validationResult.data,
    });
  } catch (error) {
    console.error(`[Validation Error] ${error.message}`);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * POST /api/ocr/export
 * Exporta datos a Excel, JSON o CSV
 */
router.post('/export', async (req, res) => {
  try {
    const { invoices, format = 'excel' } = req.body;

    if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
      return res.status(400).json({
        error: 'Se requiere array de facturas',
      });
    }

    let exportData;
    let filename;
    let contentType;

    const timestamp = new Date().toISOString().split('T')[0];

    switch (format.toLowerCase()) {
      case 'excel':
      case 'xlsx': {
        const workbook = await RG90Exporter.exportToExcel(invoices);
        filename = `RG90_${timestamp}.xlsx`;

        // Guardar en memoria y retornar como buffer
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(buffer);
      }

      case 'json': {
        exportData = RG90Exporter.exportToJSON(invoices);
        filename = `RG90_${timestamp}.json`;
        contentType = 'application/json';
        break;
      }

      case 'csv': {
        exportData = RG90Exporter.exportToCSV(invoices);
        filename = `RG90_${timestamp}.csv`;
        contentType = 'text/csv';
        break;
      }

      default:
        return res.status(400).json({
          error: 'Formato no soportado. Use: excel, json, csv',
        });
    }

    // Para JSON y CSV
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportData);
  } catch (error) {
    console.error(`[Export Error] ${error.message}`);
    res.status(500).json({
      error: error.message,
      errorCode: 'EXPORT_ERROR',
    });
  }
});

/**
 * POST /api/ocr/batch
 * Procesa múltiples archivos
 */
router.post('/batch', upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron archivos' });
    }

    console.log(`[OCR] Procesando lote de ${req.files.length} archivos`);

    const filesToProcess = req.files.map((file) => ({
      buffer: fs.readFileSync(file.path),
      originalname: file.originalname,
      path: file.path,
    }));

    // Procesar lote
    const batchResult = await extractor.processFileBatch(filesToProcess);

    // Limpiar archivos
    await cleanupTempFiles(req.files);

    res.json({
      success: true,
      ...batchResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[Batch Error] ${error.message}`);

    // Limpiar en caso de error
    if (req.files) {
      await cleanupTempFiles(req.files);
    }

    res.status(500).json({
      success: false,
      error: error.message,
      errorCode: 'BATCH_PROCESSING_ERROR',
    });
  }
});

/**
 * GET /api/ocr/health
 * Chequea que el servicio esté operativo
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'OCR Invoice Extractor',
    version: '1.0.0',
    capabilities: ['jpeg', 'png', 'pdf'],
  });
});

export default router;
