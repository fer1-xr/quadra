import * as pdfParse from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.js';
import { createCanvas } from 'canvas';
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
   * Convierte PDF a imágenes (una por página) para procesar con Gemini Vision
   */
  async convertPdfToImages(pdfBuffer) {
    try {
      logger.info('Convirtiendo PDF a imágenes...');

      const pdf = await getDocument({ data: pdfBuffer }).promise;
      const numPages = pdf.numPages;
      logger.info(`PDF detectado: ${numPages} páginas`);

      const images = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });

        // Renderizar página a canvas
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        // Convertir canvas a buffer JPG
        const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });

        images.push({
          buffer,
          pageNum,
          filename: `page-${pageNum}.jpg`,
        });

        logger.info(`✓ Página ${pageNum}/${numPages} convertida a imagen`);
      }

      logger.info(`✓ PDF convertido: ${images.length} imágenes generadas`);
      return images;
    } catch (error) {
      logger.error(`Error convirtiendo PDF: ${error.message}`);
      throw new Error(`Falló la conversión de PDF: ${error.message}`);
    }
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
   * Procesa un archivo (imagen o PDF) y extrae datos para RG90
   */
  async processFile(fileBuffer, filename) {
    try {
      logger.info(`Procesando archivo: ${filename}`);

      const isImage = /\.(jpg|jpeg|png|gif|bmp)$/i.test(filename);
      const isPDF = /\.pdf$/i.test(filename);

      let filesToProcess = [];

      // 1. Si es PDF, convertir a imágenes
      if (isPDF) {
        logger.info('PDF detectado - convirtiendo a imágenes...');
        const images = await this.convertPdfToImages(fileBuffer);
        filesToProcess = images;
      } else if (isImage) {
        filesToProcess = [{ buffer: fileBuffer, pageNum: 1, filename }];
      } else {
        throw new Error('Tipo de archivo no soportado. Use JPG, PNG o PDF.');
      }

      // 2. Procesar cada imagen/página
      const results = [];
      for (const file of filesToProcess) {
        const extractedFields = await this.extractFieldsWithGeminiVision(
          file.buffer,
          file.filename
        );

        results.push({
          pageNum: file.pageNum,
          data: extractedFields,
        });
      }

      // 3. Si hay múltiples páginas, retornar todas; si es una, retornar la primera
      const extractedFields = results.length === 1 ? results[0].data : results;

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
   * Procesa múltiples archivos en lote (imágenes y/o PDFs)
   * Retorna array con todas las facturas extraídas
   */
  async processFileBatch(files) {
    logger.info(`Procesando lote de ${files.length} archivos...`);

    const allResults = [];
    let fileIndex = 0;

    for (const file of files) {
      fileIndex++;
      logger.info(`Procesando archivo ${fileIndex}/${files.length}: ${file.originalname}`);

      try {
        const result = await this.processFile(file.buffer, file.originalname);

        // Si es un PDF con múltiples páginas, result será un array
        if (Array.isArray(result)) {
          result.forEach((pageResult, idx) => {
            allResults.push({
              success: true,
              filename: file.originalname,
              pageNum: pageResult.pageNum,
              extractedData: pageResult.data,
              timestamp: new Date().toISOString(),
            });
          });
        } else {
          // Si es una imagen o PDF con 1 página
          allResults.push({
            success: true,
            filename: file.originalname,
            extractedData: result,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        allResults.push({
          success: false,
          filename: file.originalname,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
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
