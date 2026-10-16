import Tesseract from 'tesseract.js';
import * as pdfParse from 'pdf-parse';
import sharp from 'sharp';
import { fieldPatterns, extractField } from './utils/field-patterns.js';
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
   * Extrae texto de imagen usando Tesseract
   */
  async extractTextFromImage(imageBuffer) {
    try {
      logger.info('Iniciando OCR con Tesseract...');

      const result = await Tesseract.recognize(
        imageBuffer,
        'spa', // Español
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              logger.info(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          },
        }
      );

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        language: result.data.psm,
      };
    } catch (error) {
      logger.error(`Error en OCR: ${error.message}`);
      throw new Error(`Falló el OCR: ${error.message}`);
    }
  }

  /**
   * Procesa un PDF y extrae imágenes/texto
   */
  async extractFromPDF(pdfBuffer) {
    try {
      logger.info('Procesando PDF...');

      const pdfData = await pdfParse(pdfBuffer);
      const text = pdfData.text || '';

      logger.info(`PDF procesado: ${pdfData.numpages} páginas`);

      // Si el PDF tiene texto extractable, usarlo
      if (text.trim().length > 50) {
        return {
          text,
          source: 'pdf-text',
          pages: pdfData.numpages,
        };
      }

      // Sino, convertir a imagen y hacer OCR
      // (Requiere más procesamiento, aquí simplificado)
      return {
        text,
        source: 'pdf-text-minimal',
        pages: pdfData.numpages,
        warning: 'PDF con poco texto. Recomendado convertir a imagen primero.',
      };
    } catch (error) {
      logger.error(`Error procesando PDF: ${error.message}`);
      throw new Error(`Falló el procesamiento de PDF: ${error.message}`);
    }
  }

  /**
   * Preprocesa imagen para mejorar OCR
   */
  async preprocessImage(imageBuffer) {
    try {
      logger.info('Preprocesando imagen...');

      const processed = await sharp(imageBuffer)
        .grayscale() // Convertir a escala de grises
        .normalize() // Normalizar contraste
        .sharpen() // Aumentar nitidez
        .toBuffer();

      logger.info('Imagen preprocesada exitosamente');
      return processed;
    } catch (error) {
      logger.warn(`No se pudo preprocesar imagen: ${error.message}, usando original`);
      return imageBuffer;
    }
  }

  /**
   * Extrae campos específicos del texto
   */
  extractFields(text) {
    logger.info('Extrayendo campos de texto...');

    const extracted = {};
    let totalFieldsFound = 0;

    // Agrupar patrones por categoría
    const categories = {
      informante: ['ruc', 'nombre'],
      informado: ['ruc', 'tipoIdentificacion', 'nombre'],
      comprobante: [
        'tipoRegistro',
        'tipoComprobante',
        'fecha',
        'periodo',
        'timbrado',
        'numeroComprobante',
        'cdc',
        'condicionOperacion',
        'monedaExtranjera',
      ],
      financiero: [
        'montoGravado10',
        'iva10',
        'montoGravado5',
        'iva5',
        'montoNoGravado',
        'monto', // total
      ],
    };

    // Extraer cada field
    for (const [category, fields] of Object.entries(categories)) {
      extracted[category] = {};

      fields.forEach((field) => {
        let fieldKey = field;
        let pattern = fieldPatterns[field];

        // Si no existe patrón directo, intentar variaciones
        if (!pattern) {
          for (const [key, pat] of Object.entries(fieldPatterns)) {
            if (key.includes(field)) {
              pattern = pat;
              break;
            }
          }
        }

        if (pattern) {
          const result = extractField(text, pattern);
          if (result.found) {
            extracted[category][fieldKey] = result.value;
            totalFieldsFound++;
            logger.info(`✓ ${category}.${fieldKey}: ${result.value}`);
          }
        }
      });
    }

    // Renombrar algunos campos para coincidir con template
    if (extracted.comprobante?.fecha) {
      extracted.comprobante.fechaEmision = extracted.comprobante.fecha;
      delete extracted.comprobante.fecha;
    }
    if (extracted.comprobante?.periodo) {
      extracted.comprobante.periodoEmision = extracted.comprobante.periodo;
      delete extracted.comprobante.periodo;
    }
    if (extracted.comprobante?.numeroComprobante) {
      extracted.comprobante.numero = extracted.comprobante.numeroComprobante;
      delete extracted.comprobante.numeroComprobante;
    }
    if (extracted.comprobante?.timbrado) {
      extracted.comprobante.timbrado = extracted.comprobante.timbrado;
    }
    if (extracted.financiero?.monto) {
      extracted.financiero.totalComprobante = extracted.financiero.monto;
      delete extracted.financiero.monto;
    }

    logger.info(`Total campos encontrados: ${totalFieldsFound}`);
    return extracted;
  }

  /**
   * Procesa un archivo (imagen o PDF) y extrae datos para RG90
   */
  async processFile(fileBuffer, filename) {
    try {
      logger.info(`Procesando archivo: ${filename}`);

      let ocrResult;
      const isImage = /\.(jpg|jpeg|png|gif|bmp)$/i.test(filename);
      const isPDF = /\.pdf$/i.test(filename);

      // 1. Extraer texto según tipo de archivo
      if (isImage) {
        const preprocessed = await this.preprocessImage(fileBuffer);
        ocrResult = await this.extractTextFromImage(preprocessed);
      } else if (isPDF) {
        ocrResult = await this.extractFromPDF(fileBuffer);
      } else {
        throw new Error('Tipo de archivo no soportado. Use JPG, PNG o PDF.');
      }

      // 2. Extraer campos del texto
      const extractedFields = this.extractFields(ocrResult.text);

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
            informante: extractedFields.informante ? 90 : 0,
            informado: extractedFields.informado ? 85 : 0,
            comprobante: extractedFields.comprobante ? 80 : 0,
            financiero: extractedFields.financiero ? 95 : 0,
          },
        },
        missingFields,
        ocrStats: {
          ocrConfidence: ocrResult.confidence,
          textLength: ocrResult.text.length,
        },
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
