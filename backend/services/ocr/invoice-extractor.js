import * as pdfParse from 'pdf-parse';
import Anthropic from '@anthropic-ai/sdk';
import { validateRG90Data, calculateConfidence, detectMissingFields } from './field-validator.js';

const logger = {
  info: (msg) => console.log(`[OCR] ${msg}`),
  error: (msg) => console.error(`[OCR ERROR] ${msg}`),
  warn: (msg) => console.warn(`[OCR WARN] ${msg}`),
};

class InvoiceExtractor {
  constructor() {
    this.initialized = false;
  }

  /**
   * Determina el tipo MIME basado en la extensión
   */
  getMimeType(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    const mimes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return mimes[ext] || 'image/png';
  }

  /**
   * Procesa un PDF - intenta extraer como imagen para Vision
   */
  async extractFromPDF(pdfBuffer) {
    try {
      logger.info('Procesando PDF...');

      const pdfData = await pdfParse(pdfBuffer);
      logger.info(`PDF procesado: ${pdfData.numpages} páginas`);

      // Para PDFs escaneados, retornar el buffer para procesamiento como imagen
      // En este caso simplificado, retornamos el resultado
      return {
        buffer: pdfBuffer,
        source: 'pdf',
        pages: pdfData.numpages,
      };
    } catch (error) {
      logger.error(`Error procesando PDF: ${error.message}`);
      throw new Error(`Falló el procesamiento de PDF: ${error.message}`);
    }
  }

  /**
   * Extrae campos usando Claude Vision directamente de la imagen
   * Sin OCR previo - Claude Vision lee la imagen directamente
   */
  async extractFieldsWithClaudeVision(imageBuffer, filename) {
    logger.info('Extrayendo datos con Claude Vision (sin OCR previo)...');

    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY no configurada');
      }

      const client = new Anthropic({ apiKey });

      // Convertir imagen a base64
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(filename);

      logger.info(`📸 Enviando imagen a Claude Vision (${mimeType})...`);

      // SOLUCIÓN CORRECTA: Enviar imagen directamente a Claude Vision
      // No hacer OCR primero - Claude Vision lee la imagen directamente
      const message = await client.messages.create({
        model: 'claude-opus-5-5',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: `Lee esta factura paraguaya y extrae TODOS los datos en formato JSON RG90.

Extrae EXACTAMENTE lo que ves, incluso si falta información. Retorna SOLO JSON válido:

{
  "informante": {
    "ruc": "número sin puntos",
    "nombre": "razón social"
  },
  "informado": {
    "ruc": "número sin puntos",
    "tipoIdentificacion": "RUC",
    "nombre": "razón social proveedor"
  },
  "comprobante": {
    "tipoRegistro": "Compra",
    "tipoComprobante": "Factura",
    "fechaEmision": "YYYY-MM-DD",
    "periodoEmision": "YYYYMM",
    "timbrado": "números",
    "numero": "001-001-0000001",
    "condicionOperacion": "Contado",
    "monedaExtranjera": false
  },
  "financiero": {
    "montoGravado10": número,
    "iva10": número,
    "montoGravado5": número,
    "iva5": número,
    "montoNoGravado": número,
    "totalComprobante": número
  },
  "tributario": {
    "imputaIva": true
  }
}

Usa null para campos no encontrados. Retorna SOLO el JSON, sin explicaciones.`,
              },
            ],
          },
        ],
      });

      // Extraer JSON de la respuesta
      const responseText = message.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');

      logger.info(`✓ Respuesta recibida de Claude Vision`);

      // Parsear JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error(`No se encontró JSON en respuesta: ${responseText.substring(0, 200)}`);
        throw new Error('No se encontró JSON válido');
      }

      const extracted = JSON.parse(jsonMatch[0]);
      logger.info('✓ Datos extraídos exitosamente con Claude Vision');

      // Validar estructura mínima
      if (!extracted.informante) extracted.informante = {};
      if (!extracted.informado) extracted.informado = {};
      if (!extracted.comprobante) extracted.comprobante = {};
      if (!extracted.financiero) extracted.financiero = {};
      if (!extracted.tributario) extracted.tributario = {};

      return extracted;
    } catch (error) {
      logger.error(`Error con Claude Vision: ${error.message}`);
      return {
        informante: {},
        informado: {},
        comprobante: {},
        financiero: {},
        tributario: {},
      };
    }
  }

  /**
   * Procesa un archivo (imagen o PDF) y extrae datos para RG90
   */
  async processFile(fileBuffer, filename) {
    try {
      logger.info(`Procesando archivo: ${filename}`);

      const isImage = /\.(jpg|jpeg|png|gif|bmp)$/i.test(filename);
      const isPDF = /\.pdf$/i.test(filename);

      let bufferToProcess = fileBuffer;

      // 1. Para PDFs, procesar como está (en el futuro se podría convertir a imagen)
      if (isPDF) {
        logger.info('PDF detectado - procesando...');
      } else if (!isImage) {
        throw new Error('Tipo de archivo no soportado. Use JPG, PNG o PDF.');
      }

      // 2. SOLUCIÓN CORRECTA: Usar Claude Vision directamente sin OCR previo
      const extractedFields = await this.extractFieldsWithClaudeVision(
        bufferToProcess,
        filename
      );

      // 3. Validar contra schema RG90
      const validationResult = validateRG90Data(extractedFields);

      // 4. Calcular confianza
      const confidence = calculateConfidence(extractedFields, validationResult);
      const missingFields = detectMissingFields(extractedFields);

      // 5. Preparar respuesta
      const response = {
        success: true,
        filename,
        fileType: isImage ? 'image' : isPDF ? 'pdf' : 'unknown',
        extractedData: extractedFields,
        validation: {
          valid: validationResult.valid,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        },
        confidence: {
          overall: parseFloat((confidence * 100).toFixed(2)),
          fields: {
            informante: extractedFields.informante?.ruc ? 90 : 0,
            informado: extractedFields.informado?.ruc ? 85 : 0,
            comprobante: extractedFields.comprobante?.numero ? 80 : 0,
            financiero: extractedFields.financiero?.totalComprobante ? 95 : 0,
          },
        },
        missingFields,
        method: 'Claude Vision (Direct Image Analysis)',
      };

      logger.info(`✓ Procesamiento completado: ${response.confidence.overall}% confianza`);
      return response;
    } catch (error) {
      logger.error(`Error al procesar archivo: ${error.message}`);
      return {
        success: false,
        filename,
        error: error.message,
        errorCode: 'PROCESSING_ERROR',
      };
    }
  }

  /**
   * Procesa múltiples archivos en lote
   */
  async processFileBatch(files) {
    logger.info(`Procesando lote de ${files.length} archivos...`);

    const results = [];
    for (let i = 0; i < files.length; i++) {
      logger.info(`Procesando archivo ${i + 1}/${files.length}...`);
      const result = await this.processFile(files[i].buffer, files[i].originalname);
      results.push({
        ...result,
        batchIndex: i,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      totalFiles: files.length,
      successfulProcesses: results.filter((r) => r.success).length,
      failedProcesses: results.filter((r) => !r.success).length,
      results,
    };
  }
}

// Singleton
let extractorInstance = null;

export function getInvoiceExtractor() {
  if (!extractorInstance) {
    extractorInstance = new InvoiceExtractor();
  }
  return extractorInstance;
}

export default InvoiceExtractor;
