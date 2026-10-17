import * as pdfParse from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
   * Extrae campos usando Google Gemini Vision directamente de la imagen
   * Sin OCR previo - Gemini Vision lee la imagen directamente
   * GRATIS: 60 requests/minuto en free tier
   */
  async extractFieldsWithGeminiVision(imageBuffer, filename) {
    logger.info('Extrayendo datos con Google Gemini Vision (gratis)...');

    try {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_API_KEY no configurada. Obtén una en https://ai.google.dev/');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

      // Convertir imagen a base64
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(filename);

      logger.info(`📸 Enviando imagen a Gemini Vision (${mimeType})...`);

      // Enviar imagen directamente a Gemini Vision
      const response = await model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        },
        {
          text: `Lee esta factura paraguaya y extrae TODOS los datos en formato JSON RG90.

Extrae EXACTAMENTE lo que ves. Retorna SOLO JSON válido, sin explicaciones:

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

Usa null para campos no encontrados.`,
        },
      ]);

      const responseText = response.response.text();
      logger.info(`✓ Respuesta recibida de Gemini Vision`);

      // Parsear JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error(`No se encontró JSON en respuesta: ${responseText.substring(0, 200)}`);
        throw new Error('No se encontró JSON válido');
      }

      const extracted = JSON.parse(jsonMatch[0]);
      logger.info('✓ Datos extraídos exitosamente con Gemini Vision');

      // Validar estructura mínima
      if (!extracted.informante) extracted.informante = {};
      if (!extracted.informado) extracted.informado = {};
      if (!extracted.comprobante) extracted.comprobante = {};
      if (!extracted.financiero) extracted.financiero = {};
      if (!extracted.tributario) extracted.tributario = {};

      return extracted;
    } catch (error) {
      logger.error(`Error con Gemini Vision: ${error.message}`);
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
   * Procesa un archivo (solo imágenes) y extrae datos para RG90
   */
  async processFile(fileBuffer, filename) {
    try {
      logger.info(`Procesando archivo: ${filename}`);

      const isImage = /\.(jpg|jpeg|png|gif|bmp)$/i.test(filename);
      const isPDF = /\.pdf$/i.test(filename);

      // Solo aceptar imágenes
      if (isPDF) {
        throw new Error('PDFs no soportados directamente. Convierte a JPG/PNG primero.');
      } else if (!isImage) {
        throw new Error('Tipo de archivo no soportado. Use JPG, PNG, GIF o BMP.');
      }

      // Procesar imagen con Gemini Vision
      const extractedFields = await this.extractFieldsWithGeminiVision(
        fileBuffer,
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
        method: 'Google Gemini Vision (Free, No OCR)',
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
   * Procesa múltiples archivos en lote (solo imágenes)
   * Procesa en paralelo hasta 5 archivos simultáneamente
   * Retorna array con todas las facturas extraídas
   */
  async processFileBatch(files) {
    logger.info(`Procesando lote de ${files.length} archivos en paralelo...`);
    const MAX_CONCURRENT = 5;

    const allResults = [];
    const fileQueue = files.map((file, idx) => ({ file, index: idx }));

    // Procesar en paralelo
    const processChunk = async (items) => {
      return Promise.all(
        items.map(async (item) => {
          logger.info(`Procesando archivo ${item.index + 1}/${files.length}: ${item.file.originalname}`);

          try {
            const result = await this.processFile(item.file.buffer, item.file.originalname);

            return {
              success: true,
              filename: item.file.originalname,
              extractedData: result,
              timestamp: new Date().toISOString(),
            };
          } catch (error) {
            return {
              success: false,
              filename: item.file.originalname,
              error: error.message,
              timestamp: new Date().toISOString(),
            };
          }
        })
      );
    };

    // Procesar en chunks de MAX_CONCURRENT
    for (let i = 0; i < fileQueue.length; i += MAX_CONCURRENT) {
      const chunk = fileQueue.slice(i, i + MAX_CONCURRENT);
      const results = await processChunk(chunk);
      allResults.push(...results);
    }

    return {
      totalFiles: files.length,
      totalExtracted: allResults.filter((r) => r.success).length,
      totalFailed: allResults.filter((r) => !r.success).length,
      results: allResults,
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
