import express from 'express';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { upload, cleanupTempFiles } from '../middleware/upload-handler.js';

const router = express.Router();

const MODELO = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

const MIME = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
};

const PROMPT = (tipo) => `Este documento es ${tipo === 'poliza' ? 'una póliza de seguros (o su factura/plan de pagos)' : 'una liquidación o plan de pagos de un préstamo'} de Paraguay.
Extraé SOLO datos que estén escritos en el documento. No calcules, no supongas y no completes nada.
Si un dato no aparece, usá null. Respondé SOLO con JSON válido, sin explicaciones:

{
  "emisor": "aseguradora o entidad financiera",
  "numeroDocumento": "número de póliza, préstamo u operación",
  "moneda": "PYG o USD (código ISO)",
  "montoTotal": número total a pagar (prima total o total del préstamo),
  "cantidadCuotas": número entero,
  "montoCuota": número (monto de cada cuota si es fija),
  "primerVencimiento": "YYYY-MM-DD",
  "tasaInteresAnual": número en porcentaje (ej. 18.5),
  "cuotas": [
    { "numero": 1, "vencimiento": "YYYY-MM-DD", "monto": número }
  ]
}

"cuotas" solo si el documento trae el detalle cuota por cuota; si no, [].
Los montos van sin separadores de miles (ej. 1500000).`;

const num = (v) => {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const fecha = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null);
const texto = (v) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 200) : null);

/** Normaliza lo que devuelve Gemini: solo valores válidos, el resto null. */
export function normalizar(raw = {}) {
  const cuotas = Array.isArray(raw.cuotas)
    ? raw.cuotas
      .map((c, i) => ({ numero: Number(c?.numero) || i + 1, vencimiento: fecha(c?.vencimiento), monto: num(c?.monto) }))
      .filter((c) => c.vencimiento && c.monto)
    : [];
  const moneda = typeof raw.moneda === 'string' && /^(PYG|USD)$/i.test(raw.moneda.trim()) ? raw.moneda.trim().toUpperCase() : null;
  const cantidad = Number.isInteger(Number(raw.cantidadCuotas)) && Number(raw.cantidadCuotas) > 0 && Number(raw.cantidadCuotas) <= 600
    ? Number(raw.cantidadCuotas)
    : null;

  return {
    emisor: texto(raw.emisor),
    numeroDocumento: texto(raw.numeroDocumento),
    moneda,
    montoTotal: num(raw.montoTotal),
    cantidadCuotas: cantidad ?? (cuotas.length || null),
    montoCuota: num(raw.montoCuota),
    primerVencimiento: fecha(raw.primerVencimiento) ?? cuotas[0]?.vencimiento ?? null,
    tasaInteresAnual: num(raw.tasaInteresAnual),
    cuotas,
  };
}

async function leerDocumento(buffer, filename, tipo) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY no configurada');

  const mimeType = MIME[path.extname(filename).toLowerCase()];
  if (!mimeType) throw new Error('Tipo de archivo no soportado');

  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: MODELO });
  const response = await model.generateContent([
    { inlineData: { data: buffer.toString('base64'), mimeType } },
    { text: PROMPT(tipo) },
  ]);
  const json = response.response.text().match(/\{[\s\S]*\}/);
  if (!json) throw new Error('La lectura del documento no devolvió datos');
  return normalizar(JSON.parse(json[0]));
}

/**
 * POST /api/control-pagos/process
 * Lee una póliza o liquidación de préstamo y devuelve los datos encontrados.
 * No genera cuotas ni pagos: la planilla se arma en la app con datos confirmados por el usuario.
 */
router.post('/process', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo' });
    }

    const { documentType } = req.body;
    if (!['poliza', 'prestamo'].includes(documentType)) {
      await cleanupTempFiles(req.file);
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }

    const buffer = fs.readFileSync(req.file.path);
    await cleanupTempFiles(req.file);

    let documento;
    try {
      documento = await leerDocumento(buffer, req.file.originalname, documentType);
    } catch (err) {
      console.error('[ControlPagos] No se pudo leer el documento:', err.message);
      return res.status(422).json({
        error: 'No se pudieron leer los datos del documento. Podés cargarlos a mano.',
      });
    }

    const faltantes = ['montoTotal', 'cantidadCuotas', 'primerVencimiento']
      .filter((k) => documento[k] == null && !(k === 'montoTotal' && documento.montoCuota));

    res.json({ success: true, documentType, documento, faltantes });
  } catch (error) {
    console.error(`[ControlPagos Error] ${error.message}`);
    await cleanupTempFiles(req.file);
    res.status(500).json({ error: 'Error al procesar el documento' });
  }
});

export default router;
