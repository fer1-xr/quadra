import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * QUADRA · llamadas a Gemini con reintentos y modelo de respaldo.
 *
 * Cuando Google responde 503 (modelo saturado), 429 (cuota) o 500, se reintenta
 * el mismo modelo con espera creciente; si sigue fallando se prueba con otros
 * modelos "flash" habilitados para la clave (GEMINI_MODELOS_RESPALDO, o los que
 * devuelve la API). Cualquier otro error se lanza enseguida.
 */

export const MODELO_PRINCIPAL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const ESPERAS_MS = [2000, 5000, 10000];
const MAX_RESPALDOS = 2;

const log = (msg) => console.warn(`[Gemini] ${msg}`);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms + Math.round(Math.random() * 500)));

/** error que se resuelve esperando: 429, 500, 503 o red */
export const esTransitorio = (err) => {
  const status = err?.status ?? Number(String(err?.message || '').match(/\[(\d{3})[^\]]*\]/)?.[1]);
  if ([429, 500, 502, 503, 504].includes(status)) return true;
  return /overloaded|high demand|unavailable|ECONNRESET|ETIMEDOUT|fetch failed/i.test(err?.message || '');
};

/** error para el usuario: saturación de Google, sin detalles técnicos */
export class GeminiSaturado extends Error {
  constructor(detalle) {
    super('El servicio de lectura de Google está saturado en este momento. Esperá unos minutos y volvé a intentar.');
    this.code = 'GEMINI_SATURADO';
    this.detalle = detalle;
  }
}

let respaldoCache = { hasta: 0, modelos: [] };

/** modelos flash estables habilitados para la clave, del más nuevo al más viejo (cache de 1 hora) */
const modelosRespaldo = async (apiKey, principal) => {
  const env = (process.env.GEMINI_MODELOS_RESPALDO || '').split(',').map((m) => m.trim()).filter(Boolean);
  if (env.length) return env.filter((m) => m !== principal);
  if (Date.now() < respaldoCache.hasta) return respaldoCache.modelos.filter((m) => m !== principal);
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': apiKey } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const { models = [] } = await r.json();
    const version = (n) => Number(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] || 0);
    const modelos = models
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      // solo flash estables: gemini-X.Y-flash o gemini-X.Y-flash-lite (sin preview, tts, imagen, etc.)
      .filter((n) => /^gemini-\d+(\.\d+)?-flash(-lite)?$/.test(n))
      .sort((a, b) => version(b) - version(a) || a.length - b.length);
    respaldoCache = { hasta: Date.now() + 3600000, modelos };
    return modelos.filter((m) => m !== principal);
  } catch (err) {
    log(`No se pudo listar modelos de respaldo: ${err.message}`);
    return [];
  }
};

/**
 * generateContent con reintentos y respaldo. Devuelve { texto, modelo }.
 * partes: lo mismo que recibe model.generateContent().
 */
export async function generarConGemini(partes, { generationConfig, modelo = MODELO_PRINCIPAL } = {}) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY no configurada en el servidor');
  const genAI = new GoogleGenerativeAI(apiKey);

  const intentar = async (nombre, esperas) => {
    let ultimo;
    for (let i = 0; i <= esperas.length; i++) {
      try {
        const res = await genAI.getGenerativeModel({ model: nombre, generationConfig }).generateContent(partes);
        return { texto: res.response.text(), modelo: nombre };
      } catch (err) {
        ultimo = err;
        if (!esTransitorio(err)) throw err;
        if (i < esperas.length) {
          log(`${nombre} no disponible (${err.status || 'transitorio'}); reintento ${i + 1}/${esperas.length}`);
          await dormir(esperas[i]);
        }
      }
    }
    throw ultimo;
  };

  let ultimo;
  try {
    return await intentar(modelo, ESPERAS_MS);
  } catch (err) {
    if (!esTransitorio(err)) throw err;
    ultimo = err;
  }
  for (const alt of (await modelosRespaldo(apiKey, modelo)).slice(0, MAX_RESPALDOS)) {
    log(`Probando modelo de respaldo ${alt}`);
    try {
      return await intentar(alt, [3000]);
    } catch (err) {
      ultimo = err;
      // un modelo inexistente o no habilitado no corta la búsqueda de respaldo
      if (!esTransitorio(err) && !/\[(400|403|404)/.test(err.message || '')) throw err;
    }
  }
  throw new GeminiSaturado(ultimo?.message);
}
