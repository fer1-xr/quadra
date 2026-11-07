// Cotizaciones oficiales de la DNIT (Dirección Nacional de Ingresos Tributarios).
// Fuente: https://www.dnit.gov.py/web/portal-institucional/cotizaciones
// La página publica una tabla por mes (desde 2010) con compra y venta diaria de
// dólar, real, peso argentino, yen, euro y libra. Se lee y se guarda en memoria.

export const FUENTE_URL = 'https://www.dnit.gov.py/web/portal-institucional/cotizaciones';

// Orden de columnas en la tabla de la DNIT → código ISO
const COLUMNAS = {
  'DÓLAR': 'USD',
  'DOLAR': 'USD',
  'REAL': 'BRL',
  'PESO ARG.': 'ARS',
  'YEN': 'JPY',
  'EURO': 'EUR',
  'LIBRA': 'GBP',
};
export const MONEDAS_DNIT = ['USD', 'BRL', 'ARS', 'JPY', 'EUR', 'GBP'];

const MESES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7,
  agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

const VIGENCIA_MS = 3 * 60 * 60 * 1000; // releer la página cada 3 horas

let cache = { datos: null, ultimaFecha: null, leidoEn: 0 };
let lecturaEnCurso = null;

const limpiar = (html) => html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// "5.910,01" → 5910.01 ; vacío → null
const aNumero = (txt) => {
  const s = limpiar(txt).replace(/\./g, '').replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const pad = (n) => String(n).padStart(2, '0');

/** Convierte el HTML de la página en { 'YYYY-MM-DD': { USD: { compra, venta }, ... } } */
export function parsearPagina(html) {
  const datos = {};
  const bloques = html.split(/<h4[^>]*section__midtitle[^>]*>/i).slice(1);

  for (const bloque of bloques) {
    const titulo = limpiar(bloque.split(/<\/h4>/i)[0]).toLowerCase();
    const m = titulo.match(/mes de\s+([a-záéíóú]+)\s+(\d{4})/i);
    if (!m || !MESES[m[1]]) continue;
    const mes = MESES[m[1]];
    const anio = Number(m[2]);

    const tabla = bloque.split(/<\/table>/i)[0];
    const encabezado = [...tabla.matchAll(/<t[dh][^>]*colspan="2"[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map((x) => COLUMNAS[limpiar(x[1]).toUpperCase()] || null);
    if (!encabezado.length) continue;

    const cuerpo = tabla.split(/<tbody[^>]*>/i)[1] || '';
    for (const fila of cuerpo.split(/<tr[^>]*>/i).slice(1)) {
      const celdas = [...fila.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((x) => x[1]);
      const dia = Number(limpiar(celdas[0] || ''));
      if (!dia || dia > 31) continue;

      const fecha = `${anio}-${pad(mes)}-${pad(dia)}`;
      const valores = {};
      encabezado.forEach((codigo, i) => {
        if (!codigo) return;
        const compra = aNumero(celdas[1 + i * 2] || '');
        const venta = aNumero(celdas[2 + i * 2] || '');
        if (compra && venta) valores[codigo] = { compra, venta };
      });
      if (Object.keys(valores).length) datos[fecha] = valores;
    }
  }
  return datos;
}

async function leerPagina() {
  const res = await fetch(FUENTE_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; QuadraBot/1.0)' },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`La DNIT respondió ${res.status}`);
  const datos = parsearPagina(await res.text());
  const fechas = Object.keys(datos).sort();
  if (!fechas.length) throw new Error('No se encontraron cotizaciones en la página de la DNIT');
  cache = { datos, ultimaFecha: fechas[fechas.length - 1], leidoEn: Date.now() };
  return cache;
}

/** Devuelve el cache vigente; si venció, relee la página (y si falla, usa el anterior). */
async function obtenerCache({ forzar = false } = {}) {
  const vigente = cache.datos && Date.now() - cache.leidoEn < VIGENCIA_MS;
  if (vigente && !forzar) return cache;
  if (!lecturaEnCurso) {
    lecturaEnCurso = leerPagina().finally(() => { lecturaEnCurso = null; });
  }
  try {
    return await lecturaEnCurso;
  } catch (err) {
    if (cache.datos) {
      console.error('Cotizaciones DNIT: no se pudo actualizar, se usan los datos anteriores:', err.message);
      return cache;
    }
    throw err;
  }
}

/**
 * Cotización oficial de un día.
 * Devuelve { encontrada: true, fecha, moneda, comprador, vendedor }
 * o { encontrada: false, motivo, ultimaFecha }.
 */
export async function cotizacionDelDia(fecha, moneda) {
  let c = await obtenerCache();
  // Fecha posterior a lo publicado: puede que la DNIT ya haya cargado el día → releer una vez
  if (!c.datos[fecha] && fecha > c.ultimaFecha && Date.now() - c.leidoEn > 10 * 60 * 1000) {
    c = await obtenerCache({ forzar: true });
  }
  const dia = c.datos[fecha];
  if (!dia) {
    return {
      encontrada: false,
      ultimaFecha: c.ultimaFecha,
      motivo: fecha > c.ultimaFecha ? 'no-publicada' : 'sin-dato',
    };
  }
  const valor = dia[moneda];
  if (!valor) return { encontrada: false, ultimaFecha: c.ultimaFecha, motivo: 'sin-moneda' };
  return { encontrada: true, fecha, moneda, comprador: valor.compra, vendedor: valor.venta };
}
