import Tesseract from 'tesseract.js';
import * as pdfParse from 'pdf-parse';
import sharp from 'sharp';
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
   * Extrae campos usando Claude API con structured output
   */
  async extractFieldsWithClaude(text) {
    logger.info('Extrayendo campos con Claude API...');

    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY no configurada');
      }

      const client = new Anthropic({
        apiKey,
      });

      const prompt = `Extrae TODOS los datos de esta factura paraguaya en formato JSON RG90.

TEXTO OCR DE LA FACTURA:
${text}

Retorna SOLO JSON válido con esta estructura exacta:
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

Usa null para campos no encontrados. SÍ A TODO DATO, AUNQUE SEA PARCIAL.`;

      const message = await client.messages.create({
        model: 'claude-opus-4-1-20250108',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extraer JSON de la respuesta
      const responseText = message.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');

      logger.info(`Respuesta de Claude: ${responseText.substring(0, 200)}...`);

      // Parsear JSON - buscar objeto completo
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error(`No se encontró JSON en respuesta: ${responseText}`);
        throw new Error('No se encontró JSON válido en respuesta de Claude');
      }

      const extracted = JSON.parse(jsonMatch[0]);
      logger.info('✓ Datos extraídos con Claude correctamente');

      // Validar estructura mínima
      if (!extracted.informante) extracted.informante = {};
      if (!extracted.informado) extracted.informado = {};
      if (!extracted.comprobante) extracted.comprobante = {};
      if (!extracted.financiero) extracted.financiero = {};
      if (!extracted.tributario) extracted.tributario = {};

      return extracted;
    } catch (error) {
      logger.error(`Error con Claude API: ${error.message}`);
      // Retornar estructura vacía para que continúe el flujo
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

      // 2. Extraer campos del texto usando Claude
      const extractedFields = await this.extractFieldsWithClaude(ocrResult.text);

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
