import { GoogleGenerativeAI } from '@google/generative-ai';
import { validateRG90Data, calculateConfidence, detectMissingFields } from './field-validator.js';

const logger = {
  info: (msg) => console.log(`[OCR] ${msg}`),
  error: (msg) => console.error(`[OCR ERROR] ${msg}`),
  warn: (msg) => console.warn(`[OCR WARN] ${msg}`),
};

const MODELO = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

const MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  pdf: 'application/pdf',
};

export const extensionSoportada = (filename) => Boolean(MIME[String(filename).toLowerCase().split('.').pop()]);

const PROMPT = `Sos un asistente contable de Paraguay. Leé esta factura (puede ser preimpresa y estar
completada a mano, fotografiada con el celular) y devolvé TODOS sus datos en JSON.

Reglas:
- El EMISOR es quien vende: su nombre, RUC, timbrado y actividad están en el encabezado impreso.
- El CLIENTE es quien compra: "Nombre o razón social", "RUC o C.I. N°" y "Dirección" escritos en la factura.
- Montos en guaraníes como números enteros, sin separadores de miles: "17.574.498" → 17574498.
- Fechas en formato AAAA-MM-DD ("2 de Setiembre de 2026" → "2026-09-02"; "25-03-2024" → "2024-03-25").
- RUC con guion y dígito verificador tal como aparece: "4898174-5".
- Número de factura con el formato establecimiento-punto-número de 7 dígitos: "002-001-0000010".
- En la tabla, las columnas "Exentas", "5%" y "10%" son el valor de venta de cada ítem, IVA incluido.
- "Liquidación del IVA" trae el IVA 5% y el IVA 10%; si no está escrito, usá null.
- Si un dato no se ve o no está, usá null. No inventes datos.

Devolvé solo este JSON:
{
  "tipoComprobante": "Factura" | "Nota de crédito" | "Nota de débito" | "Autofactura" | "Otro",
  "emisor": { "nombre": string, "ruc": string, "actividad": string, "direccion": string, "telefono": string, "email": string },
  "timbrado": string,
  "vigenciaDesde": "AAAA-MM-DD",
  "vigenciaHasta": "AAAA-MM-DD",
  "numero": "000-000-0000000",
  "fechaEmision": "AAAA-MM-DD",
  "condicion": "Contado" | "Crédito",
  "vencimiento": "AAAA-MM-DD",
  "moneda": "PYG" | "USD",
  "cliente": { "nombre": string, "ruc": string, "direccion": string },
  "notaRemision": string,
  "items": [ { "cantidad": number, "descripcion": string, "precioUnitario": number, "exentas": number, "gravado5": number, "gravado10": number } ],
  "totales": { "exentas": number, "gravado5": number, "gravado10": number, "total": number, "iva5": number, "iva10": number, "totalIva": number, "totalEnLetras": string },
  "observaciones": string
}`;

/* ── normalización ─────────────────────────────────────────── */

const entero = (v) => {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : null;
  const limpio = String(v).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(limpio);
  return Number.isFinite(n) && limpio !== '' ? Math.round(n) : null;
};

const texto = (v) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());

const fecha = (v) => {
  const s = texto(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
};

/** dígito verificador del RUC (módulo 11, SET) */
export const dvRuc = (base) => {
  const d = String(base).replace(/\D/g, '');
  if (!d) return null;
  let total = 0;
  let k = 2;
  for (let i = d.length - 1; i >= 0; i--) {
    if (k > 11) k = 2;
    total += Number(d[i]) * k;
    k++;
  }
  const r = total % 11;
  return r > 1 ? 11 - r : 0;
};

/** "4.898.174 - 5" → { ruc: '4898174', dv: '5', completo: '4898174-5' } */
export const partirRuc = (v) => {
  const s = texto(v).replace(/\./g, '');
  const m = s.match(/(\d{3,9})\s*-\s*(\d)\b/);
  if (m) return { ruc: m[1], dv: m[2], completo: `${m[1]}-${m[2]}` };
  const solo = s.replace(/\D/g, '');
  return { ruc: solo, dv: '', completo: solo };
};

const numeroFactura = (v) => {
  const s = texto(v);
  const m = s.match(/(\d{1,3})\D+(\d{1,3})\D+(\d{1,7})/);
  return m ? `${m[1].padStart(3, '0')}-${m[2].padStart(3, '0')}-${m[3].padStart(7, '0')}` : s;
};

/**
 * Deja la factura leída lista para el Excel: montos enteros, fechas ISO, RUC
 * separado del DV, totales completados desde los ítems y controles de IVA,
 * total y dígito verificador anotados en `observaciones`.
 */
export const normalizarFactura = (crudo = {}) => {
  const obs = [];
  if (texto(crudo.observaciones)) obs.push(texto(crudo.observaciones));

  const items = (Array.isArray(crudo.items) ? crudo.items : [])
    .map((it) => ({
      cantidad: it?.cantidad == null ? null : Number(String(it.cantidad).replace(',', '.')) || null,
      descripcion: texto(it?.descripcion),
      precioUnitario: entero(it?.precioUnitario),
      exentas: entero(it?.exentas) || 0,
      gravado5: entero(it?.gravado5) || 0,
      gravado10: entero(it?.gravado10) || 0,
    }))
    .filter((it) => it.descripcion || it.exentas || it.gravado5 || it.gravado10);

  const sumaItems = (k) => items.reduce((s, it) => s + (it[k] || 0), 0);
  const t = crudo.totales || {};
  const exentas = entero(t.exentas) ?? sumaItems('exentas');
  const gravado5 = entero(t.gravado5) ?? sumaItems('gravado5');
  const gravado10 = entero(t.gravado10) ?? sumaItems('gravado10');
  const total = entero(t.total) ?? exentas + gravado5 + gravado10;

  // IVA incluido: 10 % → G/11; 5 % → G/21
  const iva10Calc = Math.round(gravado10 / 11);
  const iva5Calc = Math.round(gravado5 / 21);
  const iva10Leido = entero(t.iva10);
  const iva5Leido = entero(t.iva5);
  if (iva10Leido != null && Math.abs(iva10Leido - iva10Calc) > 2) obs.push(`IVA 10% escrito ${iva10Leido.toLocaleString('es-PY')}, calculado ${iva10Calc.toLocaleString('es-PY')}`);
  if (iva5Leido != null && Math.abs(iva5Leido - iva5Calc) > 2) obs.push(`IVA 5% escrito ${iva5Leido.toLocaleString('es-PY')}, calculado ${iva5Calc.toLocaleString('es-PY')}`);
  if (total !== exentas + gravado5 + gravado10) obs.push(`El total (${total.toLocaleString('es-PY')}) no coincide con la suma de exentas, 5% y 10%`);

  const emisorRuc = partirRuc(crudo.emisor?.ruc);
  const clienteRuc = partirRuc(crudo.cliente?.ruc);
  if (emisorRuc.dv && dvRuc(emisorRuc.ruc) !== Number(emisorRuc.dv)) obs.push(`Revisá el RUC del emisor ${emisorRuc.completo}: el dígito verificador no coincide`);
  if (clienteRuc.dv && dvRuc(clienteRuc.ruc) !== Number(clienteRuc.dv)) obs.push(`Revisá el RUC del cliente ${clienteRuc.completo}: el dígito verificador no coincide`);

  const fechaEmision = fecha(crudo.fechaEmision);
  const vigenciaHasta = fecha(crudo.vigenciaHasta);
  if (fechaEmision && vigenciaHasta && fechaEmision > vigenciaHasta) obs.push('La fecha de emisión es posterior al vencimiento del timbrado');
  if (!fechaEmision) obs.push('No se pudo leer la fecha de emisión');
  if (!texto(crudo.timbrado)) obs.push('No se pudo leer el timbrado');
  if (!total) obs.push('No se pudo leer el total');

  return {
    tipoComprobante: texto(crudo.tipoComprobante) || 'Factura',
    emisor: {
      nombre: texto(crudo.emisor?.nombre),
      ruc: emisorRuc.ruc,
      dv: emisorRuc.dv,
      rucCompleto: emisorRuc.completo,
      actividad: texto(crudo.emisor?.actividad),
      direccion: texto(crudo.emisor?.direccion),
      telefono: texto(crudo.emisor?.telefono),
      email: texto(crudo.emisor?.email),
    },
    timbrado: texto(crudo.timbrado).replace(/\D/g, ''),
    vigenciaDesde: fecha(crudo.vigenciaDesde),
    vigenciaHasta,
    numero: numeroFactura(crudo.numero),
    fechaEmision,
    condicion: /cr[eé]d/i.test(crudo.condicion || '') ? 'Crédito' : 'Contado',
    vencimiento: fecha(crudo.vencimiento),
    moneda: /usd|d[oó]lar/i.test(crudo.moneda || '') ? 'USD' : 'PYG',
    cliente: {
      nombre: texto(crudo.cliente?.nombre),
      ruc: clienteRuc.ruc,
      dv: clienteRuc.dv,
      rucCompleto: clienteRuc.completo,
      direccion: texto(crudo.cliente?.direccion),
    },
    notaRemision: texto(crudo.notaRemision),
    items,
    totales: {
      exentas,
      gravado5,
      gravado10,
      total,
      iva5: iva5Leido ?? iva5Calc,
      iva10: iva10Leido ?? iva10Calc,
      totalIva: entero(t.totalIva) ?? (iva5Leido ?? iva5Calc) + (iva10Leido ?? iva10Calc),
      totalEnLetras: texto(t.totalEnLetras),
    },
    observaciones: obs,
  };
};

/** forma RG90 que usan /upload, /validate y /export */
export const aRG90 = (f) => ({
  informante: { ruc: f.cliente.rucCompleto, nombre: f.cliente.nombre },
  informado: { ruc: f.emisor.rucCompleto, tipoIdentificacion: 'RUC', nombre: f.emisor.nombre },
  comprobante: {
    tipoRegistro: 'Compra',
    tipoComprobante: /cr[eé]dito/i.test(f.tipoComprobante) ? 'NC' : /d[eé]bito/i.test(f.tipoComprobante) ? 'ND' : 'Factura',
    fechaEmision: f.fechaEmision,
    periodoEmision: f.fechaEmision ? f.fechaEmision.slice(0, 7).replace('-', '') : '',
    timbrado: f.timbrado,
    numero: f.numero,
    condicionOperacion: f.condicion,
    monedaExtranjera: f.moneda !== 'PYG',
  },
  financiero: {
    montoGravado10: f.totales.gravado10,
    iva10: f.totales.iva10,
    montoGravado5: f.totales.gravado5,
    iva5: f.totales.iva5,
    montoNoGravado: f.totales.exentas,
    totalComprobante: f.totales.total,
  },
  tributario: { imputaIva: true },
});

class InvoiceExtractor {
  getMimeType(filename) {
    return MIME[String(filename).toLowerCase().split('.').pop()] || null;
  }

  /**
   * Lee la imagen o PDF con Gemini y devuelve el JSON crudo. Si algo falla,
   * lanza el error: una factura que no se pudo leer no puede salir en blanco.
   */
  async leerConGemini(buffer, filename) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_API_KEY no configurada en el servidor');
    const mimeType = this.getMimeType(filename);
    if (!mimeType) throw new Error('Tipo de archivo no soportado. Use JPG, PNG, WEBP o PDF.');

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: MODELO,
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    });
    logger.info(`Leyendo ${filename} con ${MODELO} (${mimeType})`);
    const response = await model.generateContent([
      { inlineData: { data: buffer.toString('base64'), mimeType } },
      { text: PROMPT },
    ]);
    const salida = response.response.text();
    const json = salida.match(/\{[\s\S]*\}/);
    if (!json) throw new Error('La lectura de la factura no devolvió datos');
    return JSON.parse(json[0]);
  }

  /** factura completa normalizada; lanza error si no se pudo leer nada útil */
  async extraerFactura(buffer, filename) {
    const factura = normalizarFactura(await this.leerConGemini(buffer, filename));
    const util = factura.totales.total || factura.timbrado || factura.numero || factura.emisor.ruc;
    if (!util) throw new Error('No se encontraron datos de factura en el archivo');
    return factura;
  }

  /** un archivo, en la forma RG90 (ruta /upload) */
  async processFile(fileBuffer, filename) {
    try {
      const factura = await this.extraerFactura(fileBuffer, filename);
      const extractedData = aRG90(factura);
      const validationResult = validateRG90Data(extractedData);
      const confidence = calculateConfidence(extractedData, validationResult);
      return {
        success: true,
        filename,
        factura,
        extractedData,
        validation: { valid: validationResult.valid, errors: validationResult.errors, warnings: validationResult.warnings },
        confidence: { overall: parseFloat((confidence * 100).toFixed(2)) },
        missingFields: detectMissingFields(extractedData),
        method: `Google Gemini (${MODELO})`,
      };
    } catch (error) {
      logger.error(`${filename}: ${error.message}`);
      return { success: false, filename, error: error.message, errorCode: 'PROCESSING_ERROR' };
    }
  }

  /** varias facturas, de a 5 en paralelo; cada resultado trae la factura o el motivo del error */
  async processFileBatch(files) {
    logger.info(`Procesando lote de ${files.length} archivos...`);
    const MAX_CONCURRENT = 5;
    const results = [];
    for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
      const parte = await Promise.all(files.slice(i, i + MAX_CONCURRENT).map(async (file) => {
        try {
          const factura = await this.extraerFactura(file.buffer, file.originalname);
          return { success: true, filename: file.originalname, factura };
        } catch (error) {
          logger.error(`${file.originalname}: ${error.message}`);
          return { success: false, filename: file.originalname, error: error.message };
        }
      }));
      results.push(...parte);
    }
    return {
      totalFiles: files.length,
      totalExtracted: results.filter((r) => r.success).length,
      totalFailed: results.filter((r) => !r.success).length,
      results,
    };
  }
}

let extractorInstance = null;

export function getInvoiceExtractor() {
  if (!extractorInstance) extractorInstance = new InvoiceExtractor();
  return extractorInstance;
}

export default InvoiceExtractor;
