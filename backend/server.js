import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import XLSX from 'xlsx';
import ocrRoutes from './routes/ocr.js';
import controlPagosRoutes from './routes/control-pagos.js';
import { uploadErrorHandler } from './middleware/upload-handler.js';
import { cotizacionDelDia, MONEDAS_DNIT, FUENTE_URL } from './services/cotizaciones-dnit.js';

dotenv.config();

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
// En producción: FRONTEND_URL = dominio(s) del frontend separados por coma (ej. https://quadra.vercel.app).
// En desarrollo (sin FRONTEND_URL) se permite cualquier origen.
const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true, exposedHeaders: ['X-Ocr-Resumen', 'Content-Disposition'] }));
app.use(express.json({ limit: '50mb' }));

// ==================== CONFIGURACIÓN DE LA CONCILIACIÓN ====================
// Diferencia máxima tolerada (en guaraníes) entre Libro y RG90 para considerar que un monto coincide.
const TOL = 1;
// false = una diferencia en Razón Social solo se marca como advertencia (amarillo) y la fila sigue como "coincide".
// true  = una diferencia en Razón Social cuenta como error (rojo).
const RAZON_SOCIAL_ES_ERROR = false;

// ==================== AUTH ====================
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  supabase.auth.getUser(token)
    .then(({ data: { user }, error }) => {
      // Token vencido o inválido: respuesta normal, sin ensuciar los logs.
      if (error || !user) return res.status(401).json({ error: 'Token inválido' });
      req.user = { id: user.id, email: user.email };
      // Cliente con el token del usuario: las consultas pasan por RLS como ese usuario.
      req.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      next();
    })
    .catch((err) => {
      console.error('verifyToken: no se pudo validar el token con Supabase:', err.message);
      res.status(401).json({ error: 'Token inválido' });
    });
};

// ==================== UTILIDADES DE LECTURA ====================
const fail = (msg) => Object.assign(new Error(msg), { status: 400 });

const clean = (v) => String(v ?? '').replace(/\u00a0/g, ' ').trim();

// Normaliza encabezados: minúsculas, sin tildes, sin símbolos. "GRAV. 10%" -> "grav 10"
const normHeader = (v) => clean(v)
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Número -> entero en guaraníes.
// Si la celda ya es número (Excel) se redondea; si es texto se interpreta el formato (1.234.567 / 1,234,567 / 1.234,56).
const toNum = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : 0;
  let s = String(v).replace(/[^\d.,\-()]/g, '').trim();
  if (!s) return 0;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (s.startsWith('-')) { neg = true; s = s.slice(1); }
  s = s.replace(/-/g, '');
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) {
    const dec = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
    const th = dec === '.' ? ',' : '.';
    s = s.split(th).join('').replace(dec, '.');
  } else if (hasComma) {
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (hasDot) {
    s = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s;
  }
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return Math.round(neg ? -n : n);
};

// CSV con comillas, saltos de línea dentro de celdas y delimitador , ; o tab
const parseCSV = (text) => {
  text = text.replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/).find((l) => l.trim()) || '';
  const delim = [',', ';', '\t']
    .map((d) => [d, firstLine.split(d).length])
    .sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
};

const readWorkbook = (b64) => {
  try {
    const wb = XLSX.read(Buffer.from(b64, 'base64'), { type: 'buffer' });
    // raw:true => números reales (sin formato), sin pasar por CSV
    return wb.SheetNames.map((name) => ({
      name,
      rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '' })
    }));
  } catch {
    throw fail('No se pudo leer el archivo Excel. Verificá que no esté dañado ni protegido con contraseña.');
  }
};

// Devuelve la lista de hojas [{ name, rows }] a partir de un data URL base64 (Excel) o de texto CSV
const loadSheets = (data) => {
  if (typeof data !== 'string' || !data.trim()) throw fail('Falta uno de los archivos o está vacío.');
  if (data.startsWith('data:')) {
    const comma = data.indexOf(',');
    const meta = data.slice(0, comma);
    const body = data.slice(comma + 1);
    if (/^data:(text\/|application\/csv)/i.test(meta)) {
      return [{ name: 'CSV', rows: parseCSV(Buffer.from(body, 'base64').toString('utf8')) }];
    }
    return readWorkbook(body);
  }
  if (/^(UEsDB|0M8R4KGx)/.test(data)) return readWorkbook(data); // xlsx / xls en base64 sin prefijo
  return [{ name: 'CSV', rows: parseCSV(data) }];
};

// Busca la fila de encabezados entre las primeras filas
const findHeaderRow = (rows, test, maxScan = 30) => {
  for (let i = 0; i < Math.min(rows.length, maxScan); i++) {
    const hs = (rows[i] || []).map(normHeader);
    if (test(hs)) return { index: i, headers: hs };
  }
  return null;
};

// Busca la hoja (primero la activa, luego las demás) que tenga una fila de encabezados válida
const pickSheet = (sheets, test) => {
  for (const sh of sheets) {
    const head = findHeaderRow(sh.rows, test);
    if (head) return { rows: sh.rows, head, sheetName: sh.name };
  }
  return null;
};

// Resumen de lo que se leyó, para que un error de reconocimiento sea diagnosticable
const describeFile = (sheets) => {
  const sh = sheets.find((s) => s.rows.length) || sheets[0];
  if (!sh) return '';
  const muestra = sh.rows
    .filter((r) => (r || []).some((c) => clean(c) !== ''))
    .slice(0, 8)
    .map((r) => r.map((c) => clean(c).slice(0, 25)).filter(Boolean).slice(0, 10).join(' | '))
    .join(' // ');
  return ` Hojas: ${sheets.map((s) => `"${s.name}" (${s.rows.length} filas)`).join(', ')}. Primeras filas leídas: ${muestra || '(vacío)'}`;
};

const isRg90Header = (hs) =>
  hs.some((h) => h.includes('identificacion del informado')) && hs.includes('numero de comprobante');
const isLibroHeader = (hs) =>
  !isRg90Header(hs) &&
  hs.some((h) => h === 'ruc' || h === 'r u c' || h.startsWith('ruc ')) &&
  hs.some((h) => h.includes('documento') || h.includes('comprobante') || h.includes('razon social'));

const colOf = (headers, match, fallback) => {
  const i = headers.findIndex(match);
  return i >= 0 ? i : fallback;
};
// Prueba varios criterios en orden y devuelve el primero que encuentre
const colOfAny = (headers, matchers, fallback) => {
  for (const m of matchers) {
    const i = headers.findIndex(m);
    if (i >= 0) return i;
  }
  return fallback;
};

// Columnas por texto de encabezado; el número es el índice de respaldo (desde 0) si no se encuentra el encabezado
const rg90Cols = (hs) => ({
  informante: colOf(hs, (h) => h.includes('ruc del informante'), 0),
  ruc:    colOf(hs, (h) => h.includes('identificacion del informado'), 2),
  razon:  colOf(hs, (h) => h.includes('razon social del informado'), 4),
  tipo:   colOf(hs, (h) => h === 'tipo de comprobante', 6),
  comp:   colOf(hs, (h) => h === 'numero de comprobante', 12),
  iva10:  colOf(hs, (h) => h === 'iva 10', 15),
  iva5:   colOf(hs, (h) => h === 'iva 5', 17),
  exenta: colOf(hs, (h) => h.startsWith('monto no gravado'), 18),
  total:  colOf(hs, (h) => h === 'total comprobante', 19)
});

const libroCols = (hs) => ({
  comp:   colOfAny(hs, [
    (h) => h === 'documento',
    (h) => h.includes('documento') && !h.includes('cdc') && !h.includes('tipo'),
    (h) => h.includes('comprobante')
  ], 2),
  razon:  colOfAny(hs, [(h) => h === 'razon social', (h) => h.includes('razon social')], 7),
  ruc:    colOfAny(hs, [(h) => h === 'ruc', (h) => h === 'r u c', (h) => h.startsWith('ruc ')], 8),
  dv:     colOfAny(hs, [(h) => h === 'dv', (h) => h === 'd v'], 9),
  iva10:  colOf(hs, (h) => h === 'iva 10', 12),
  iva5:   colOf(hs, (h) => h === 'iva 5', 13),
  exenta: colOf(hs, (h) => h === 'exenta' || h === 'exentas', 14),
  total:  colOf(hs, (h) => h === 'total', 17)
});

// Columnas para el padrón de timbrados (no se usan para cruzar: -1 si no están).
// En el libro de Marangatu "TIMB." y "CDC DOCUMENTO" están en la fila de arriba del encabezado,
// así que se mira también esa fila.
const headersConArriba = (rows, head) => {
  const arriba = (rows[head.index - 1] || []).map(normHeader);
  const n = Math.max(head.headers.length, arriba.length);
  return Array.from({ length: n }, (_, i) => head.headers[i] || arriba[i] || '');
};
const esColTimbrado = (h) => h === 'timb' || h === 'timbrado' ||
  (h.includes('timbrado') && !/tipo|venc|vigencia|fecha|inicio/.test(h));
const extraCols = (hs) => ({
  timbrado:   hs.findIndex(esColTimbrado),
  cdc:        hs.findIndex((h) => h === 'cdc' || h.startsWith('cdc ')),
  registro:   hs.findIndex((h) => h === 'tipo registro' || h.includes('tipo de registro')),
  informanteNombre: hs.findIndex((h) => h.includes('informante') && (h.includes('nombre') || h.includes('razon')))
});
const celda = (row, i) => (i >= 0 ? clean(row[i]) : '');

// ==================== NORMALIZACIÓN DE RUC / COMPROBANTE / NOMBRE ====================
// RUC sin guion ni DV (acepta "80132459", "80132459-9" o RUC y DV en celdas separadas)
const splitRuc = (v, dvCell = '') => {
  let s = clean(v);
  let dv = clean(dvCell);
  if (s.includes('-')) {
    const [a, b] = s.split('-');
    s = a;
    if (!dv) dv = b;
  }
  return { ruc: s.replace(/\D/g, '').replace(/^0+/, ''), dv: dv.replace(/\D/g, '') };
};

// Dígito verificador (módulo 11, base máxima 11)
const calcDV = (ruc) => {
  let k = 2;
  let total = 0;
  for (const ch of String(ruc).split('').reverse()) {
    if (k > 11) k = 2;
    total += Number(ch) * k;
    k++;
  }
  const resto = total % 11;
  return resto > 1 ? 11 - resto : 0;
};

const fmtRuc = (ruc, dv) => (ruc ? `${ruc}-${dv !== '' ? dv : calcDV(ruc)}` : '');

const compDigits = (v) => clean(v).replace(/\D/g, '');

// 0010010000755 -> 001-001-0000755
const fmtComp = (v) => {
  const raw = clean(v);
  const d = raw.replace(/\D/g, '');
  return d.length === 13 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : raw;
};

const normNameCache = new Map();
const normName = (s) => {
  if (normNameCache.has(s)) return normNameCache.get(s);
  const norm = clean(s)
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/SOCIEDAD DE RESPONSABILIDAD LIMITADA/g, 'SRL')
    .replace(/SOCIEDAD ANONIMA/g, 'SA')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
  normNameCache.set(s, norm);
  return norm;
};

const sameName = (a, b) => {
  const na = normName(a);
  const nb = normName(b);
  return na === nb || na.startsWith(nb) || nb.startsWith(na);
};

// Contribuyente y período desde las filas de título del Libro
const extractMeta = (libroRows, headIndex) => {
  let contribuyente = '';
  let periodo = '';
  for (let i = 0; i < Math.min(headIndex, 10); i++) {
    for (const c of libroRows[i] || []) {
      const t = clean(c);
      let m;
      if (!contribuyente && (m = t.match(/contribuyente\s*:\s*(.+)$/i))) contribuyente = m[1].trim();
      if (!periodo && (m = t.match(/per[ií]odo\s*:\s*(.+)$/i))) periodo = m[1].split(/\s+-\s+actividad/i)[0].trim();
    }
  }
  return { contribuyente, periodo };
};

// ==================== MOTOR DE CONCILIACIÓN ====================
const computeEstados = (lib, rg) => {
  if (!lib || !rg) {
    return { ruc: 'error', razon: 'error', comp: 'error', total: 'error', iva10: 'error', iva5: 'error', exenta: 'error' };
  }
  const n = (a, b) => (Math.abs(a - b) <= TOL ? 'ok' : 'error');
  return {
    ruc: 'ok',   // la llave de cruce ya garantiza que RUC y comprobante son iguales
    comp: 'ok',
    razon: sameName(lib.razon, rg.razon) ? 'ok' : (RAZON_SOCIAL_ES_ERROR ? 'error' : 'warn'),
    total: n(lib.total, rg.total),
    iva10: n(lib.iva10, rg.iva10),
    iva5: n(lib.iva5, rg.iva5),
    exenta: n(lib.exenta, rg.exenta)
  };
};

const buildRow = (lib, rg) => {
  const estados = computeEstados(lib, rg);
  const esNC = !!rg && normHeader(rg.tipo).includes('nota de credito');
  let mensaje;
  let status;
  if (!rg) { mensaje = 'Ausente en RG90'; status = 'error'; }
  else if (!lib) { mensaje = 'En RG90 pero no en Libro'; status = 'error'; }
  else {
    const errores = [];
    if (estados.total === 'error') errores.push('Total');
    if (estados.iva10 === 'error') errores.push('IVA 10%');
    if (estados.iva5 === 'error') errores.push('IVA 5%');
    if (estados.exenta === 'error') errores.push('Exenta');
    if (estados.razon === 'error') errores.push('Razón Social');
    if (errores.length) { mensaje = 'No coincide en: ' + errores.join(', '); status = 'error'; }
    else if (estados.razon === 'warn') { mensaje = 'Coincide (revisar Razón Social)'; status = 'success'; }
    else { mensaje = 'Coincide perfectamente'; status = 'success'; }
  }
  if (esNC) mensaje += ' — Nota de Crédito';

  return {
    rucLibro: lib ? lib.rucFmt : null,       rucRG90: rg ? rg.rucFmt : null,
    razonLibro: lib ? lib.razon : null,      razonRG90: rg ? rg.razon : null,
    compLibro: lib ? lib.comp : null,        compRG90: rg ? rg.comp : null,
    totalLibro: lib ? lib.total : null,      totalRG90: rg ? rg.total : null,
    iva10Libro: lib ? lib.iva10 : null,      iva10RG90: rg ? rg.iva10 : null,
    iva5Libro: lib ? lib.iva5 : null,        iva5RG90: rg ? rg.iva5 : null,
    exentaLibro: lib ? lib.exenta : null,    exentaRG90: rg ? rg.exenta : null,
    tipo: rg ? rg.tipo : '',
    estados, mensaje, status
  };
};

// ==================== PADRÓN DE TIMBRADOS ====================
// La DNIT no ofrece timbrado → RUC; Quadra lo aprende de cada conciliación.
// La regla para saber quién emitió el comprobante:
//  - con CDC (factura electrónica) el RUC del emisor está dentro del CDC: es seguro;
//  - sin CDC depende del libro y del tipo: en compras la factura la emite el proveedor,
//    pero la nota de crédito y la autofactura las emite el propio contribuyente;
//    en ventas es al revés. Si no se sabe si es compra o venta, no se aprende nada.

// CDC de 44 dígitos: tipo(2) + RUC emisor(8) + DV(1) + …
const emisorDeCDC = (v) => {
  const d = clean(v).replace(/\D/g, '');
  if (d.length !== 44) return null;
  const ruc = d.slice(2, 10).replace(/^0+/, '');
  const dv = d[10];
  if (!ruc || String(calcDV(ruc)) !== dv) return null;
  return { ruc, dv };
};

const sentidoDe = (texto) => {
  const t = normHeader(texto);
  if (/compra|egreso/.test(t)) return 'compra';
  if (/venta|ingreso/.test(t)) return 'venta';
  return '';
};

// Compras o ventas según el título del archivo ("LIBRO COMPRAS LEY 125/91")
const sentidoDelTitulo = (rows, headIndex) => {
  for (let i = 0; i < Math.min(headIndex, 10); i++) {
    for (const c of rows[i] || []) {
      const t = normHeader(c);
      if (/^libro (de )?compras?\b|registro de compras/.test(t)) return 'compra';
      if (/^libro (de )?ventas?\b|registro de ventas/.test(t)) return 'venta';
    }
  }
  return '';
};

const claseDoc = (tipo) => {
  const t = normHeader(tipo);
  if (!t) return 'factura';
  if (t.includes('nota de credito')) return 'nc';
  if (t.includes('autofactura')) return 'auto';
  if (/factura|boleta|ticket|nota de debito/.test(t)) return 'factura';
  return ''; // despachos, extractos, etc.: no se aprende
};

const timbradoLimpio = (v) => {
  const t = clean(v).replace(/\D/g, '');
  return /^\d{8}$/.test(t) && t !== '00000000' ? t : '';
};

/**
 * Pares timbrado → RUC emisor de un comprobante.
 * doc: { timbrado, cdc, sentido, tipo, ruc, dv, razon }; contrib: { ruc, nombre }
 */
const emisorDe = (doc, contrib) => {
  const timbrado = timbradoLimpio(doc.timbrado);
  if (!timbrado) return null;
  const porCDC = emisorDeCDC(doc.cdc);
  if (porCDC) {
    const nombre = porCDC.ruc === doc.ruc ? doc.razon : porCDC.ruc === contrib.ruc ? contrib.nombre : '';
    return { timbrado, ruc: porCDC.ruc, dv: porCDC.dv, nombre };
  }
  const clase = claseDoc(doc.tipo);
  if (!clase || !doc.sentido) return null;
  const loEmiteElOtro = doc.sentido === 'compra' ? clase === 'factura' : clase === 'nc';
  if (loEmiteElOtro) return doc.ruc ? { timbrado, ruc: doc.ruc, dv: doc.dv, nombre: doc.razon } : null;
  return contrib.ruc ? { timbrado, ruc: contrib.ruc, dv: String(calcDV(contrib.ruc)), nombre: contrib.nombre } : null;
};

// Acepta un archivo (string) o varios (array de strings); descarta huecos vacíos.
const fileList = (data) => (Array.isArray(data) ? data : [data])
  .filter((d) => typeof d === 'string' && d.trim());

const reconcile = (rg90Data, libroData) => {
  normNameCache.clear();
  const rg90Files = fileList(rg90Data);
  const libroFiles = fileList(libroData);
  if (!rg90Files.length) throw fail('Falta el archivo RG90 o está vacío.');
  if (!libroFiles.length) throw fail('Falta el Libro de Compras o está vacío.');

  const nro = (i, n) => (n > 1 ? ` (archivo ${i + 1})` : '');

  // Cada archivo RG90 se lee con sus propios encabezados (pueden ser meses distintos)
  const rgParts = rg90Files.map((data, i) => {
    const sheets = loadSheets(data);
    const pick = pickSheet(sheets, isRg90Header);
    if (!pick) {
      if (pickSheet(sheets, isLibroHeader)) {
        throw fail(`El archivo cargado como RG90${nro(i, rg90Files.length)} parece ser el Libro de Compras. Revisá que no estén invertidos.`);
      }
      throw fail(`No se reconoció el RG90${nro(i, rg90Files.length)}: no se encontró la fila de encabezados (RUC / Nº de Identificación del Informado, Número de Comprobante).` + describeFile(sheets));
    }
    return pick;
  });
  const lbParts = libroFiles.map((data, i) => {
    const sheets = loadSheets(data);
    const pick = pickSheet(sheets, isLibroHeader);
    if (!pick) {
      if (pickSheet(sheets, isRg90Header)) {
        throw fail(`El archivo cargado como Libro de Compras${nro(i, libroFiles.length)} parece ser el RG90. Revisá que no estén invertidos.`);
      }
      throw fail(`No se reconoció el Libro de Compras${nro(i, libroFiles.length)}: no se encontró la fila de encabezados (RUC, Documento).` + describeFile(sheets));
    }
    return pick;
  });

  const avisos = [];

  const rg90Map = new Map();
  let informanteRG90 = '';
  let informanteNombre = '';
  for (const { rows, head } of rgParts) {
    const rc = rg90Cols(head.headers);
    const xc = extraCols(headersConArriba(rows, head));
    const sentidoArchivo = sentidoDelTitulo(rows, head.index);
    for (let i = head.index + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const { ruc, dv } = splitRuc(row[rc.ruc]);
      const compKey = compDigits(row[rc.comp]);
      if (!ruc || !compKey) continue;
      if (!informanteRG90) informanteRG90 = splitRuc(row[rc.informante]).ruc;
      if (!informanteNombre) informanteNombre = celda(row, xc.informanteNombre);
      const entry = {
        ruc, rucFmt: fmtRuc(ruc, dv), razon: clean(row[rc.razon]), comp: fmtComp(row[rc.comp]),
        tipo: clean(row[rc.tipo]), total: toNum(row[rc.total]), iva10: toNum(row[rc.iva10]),
        iva5: toNum(row[rc.iva5]), exenta: toNum(row[rc.exenta]), processed: false,
        dv: dv || String(calcDV(ruc)), timbrado: celda(row, xc.timbrado), cdc: celda(row, xc.cdc),
        sentido: sentidoDe(celda(row, xc.registro)) || sentidoArchivo
      };
      const key = ruc + '_' + compKey;
      if (!rg90Map.has(key)) rg90Map.set(key, []);
      rg90Map.get(key).push(entry);
    }
  }

  const discrepancies = [];
  let omitidasSinRuc = 0;
  const docsLibro = []; // para el padrón de timbrados
  for (const { rows, head } of lbParts) {
    const lc = libroCols(head.headers);
    const xc = extraCols(headersConArriba(rows, head));
    const sentidoArchivo = sentidoDelTitulo(rows, head.index);
    for (let i = head.index + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const { ruc, dv } = splitRuc(row[lc.ruc], row[lc.dv]);
      const compDig = compDigits(row[lc.comp]);
      if (!ruc || !compDig) {
        if (compDig.length >= 9) omitidasSinRuc++;
        continue;
      }
      const lib = {
        ruc, rucFmt: fmtRuc(ruc, dv), razon: clean(row[lc.razon]), comp: fmtComp(row[lc.comp]),
        total: toNum(row[lc.total]), iva10: toNum(row[lc.iva10]), iva5: toNum(row[lc.iva5]), exenta: toNum(row[lc.exenta])
      };
      const list = rg90Map.get(ruc + '_' + compDig);
      const rg = list ? (list.find((e) => !e.processed) || list[0]) : null;
      if (rg) rg.processed = true;
      discrepancies.push(buildRow(lib, rg));
      docsLibro.push({
        timbrado: celda(row, xc.timbrado) || rg?.timbrado, cdc: celda(row, xc.cdc) || rg?.cdc,
        sentido: rg?.sentido || sentidoArchivo, ruc, dv: dv || String(calcDV(ruc)), razon: lib.razon,
        // sin el RG90 no se sabe si es factura o nota de crédito: solo sirve si trae CDC
        tipo: rg ? rg.tipo : null
      });
    }
  }

  for (const list of rg90Map.values()) {
    for (const e of list) if (!e.processed) discrepancies.push(buildRow(null, e));
  }

  // Contribuyente y período: del primer Libro que los tenga
  let contribLibro = '';
  let periodo = '';
  for (const { rows, head } of lbParts) {
    const meta = extractMeta(rows, head.index);
    if (!contribLibro) contribLibro = meta.contribuyente;
    if (!periodo) periodo = meta.periodo;
  }
  const contribuyente = contribLibro || (informanteRG90 ? `RUC ${informanteRG90}` : '');
  const rucContribLibro = (contribLibro.match(/(\d[\d.]*)\s*-\s*\d/) || [])[1]?.replace(/\D/g, '');
  if (rucContribLibro && informanteRG90 && rucContribLibro !== informanteRG90) {
    avisos.push(`El RUC del informante en el RG90 (${informanteRG90}) no coincide con el del contribuyente en el Libro (${rucContribLibro}). Verificá que ambos archivos sean del mismo cliente.`);
  }
  if (omitidasSinRuc > 0) {
    avisos.push(`${omitidasSinRuc} fila(s) del Libro sin RUC no se incluyeron en la conciliación.`);
  }

  // Padrón de timbrados: cada par timbrado → RUC emisor de los dos archivos
  const contrib = {
    ruc: informanteRG90 || rucContribLibro || '',
    nombre: informanteNombre || (contribLibro.match(/^\s*[\d.]+\s*-\s*\d\s*-\s*(.+)$/) || [])[1]?.trim() || ''
  };
  const timbrados = [];
  for (const d of docsLibro) {
    const e = d.tipo === null ? (emisorDeCDC(d.cdc) ? emisorDe({ ...d, tipo: '' }, contrib) : null) : emisorDe(d, contrib);
    if (e) timbrados.push(e);
  }
  for (const list of rg90Map.values()) {
    for (const r of list) {
      const e = emisorDe(r, contrib);
      if (e) timbrados.push(e);
    }
  }

  return { discrepancies, contribuyente, periodo, avisos, timbrados };
};

app.post('/api/reconciliation', verifyToken, async (req, res) => {
  try {
    const { rg90Data, libroData } = req.body;
    const { discrepancies, contribuyente, periodo, avisos, timbrados } = reconcile(rg90Data, libroData);

    // padrón propio de timbrados: si falla, la conciliación sigue igual
    if (timbrados.length) {
      req.supabase.rpc('aprender_timbrados', { items: timbrados })
        .then(({ error }) => { if (error) console.warn('aprender_timbrados:', error.message); })
        .catch((err) => console.warn('aprender_timbrados:', err.message));
    }

    const totalDiscrepancies = discrepancies.filter((d) => d.status === 'error').length;
    const totalCoincidencias = discrepancies.filter((d) => d.status === 'success').length;

    const { data: session, error: se } = await req.supabase.from('reconciliation_sessions')
      .insert([{
        user_id: req.user.id,
        status: 'completed',
        total_discrepancies: totalDiscrepancies,
        data: { discrepancies, contribuyente, periodo, avisos, timestamp: new Date().toISOString() }
      }])
      .select();
    if (se) return res.status(400).json({ error: se.message });

    res.json({
      sessionId: session[0].id,
      discrepancies,
      contribuyente,
      periodo,
      avisos,
      totalDiscrepancies,
      totalCoincidencias
    });
  } catch (e) {
    if (!e.status) console.error(e); // los errores de validación (400) no necesitan stack trace
    res.status(e.status || 500).json({ error: e.message });
  }
});

// ==================== EXCEL EXPORT ====================
// Sesiones guardadas con el formato anterior (sin pares) se siguen pudiendo exportar
const normalizeRow = (d) => {
  const base = {
    rucLibro: d.rucLibro ?? d.ruc ?? null,
    rucRG90: d.rucRG90 ?? d.ruc ?? null,
    razonLibro: d.razonLibro ?? d.razonSocial ?? null,
    razonRG90: d.razonRG90 ?? d.razonSocial ?? null,
    compLibro: d.compLibro ?? null,
    compRG90: d.compRG90 ?? null,
    totalLibro: d.totalLibro ?? null, totalRG90: d.totalRG90 ?? null,
    iva10Libro: d.iva10Libro ?? null, iva10RG90: d.iva10RG90 ?? null,
    iva5Libro: d.iva5Libro ?? null,   iva5RG90: d.iva5RG90 ?? null,
    exentaLibro: d.exentaLibro ?? null, exentaRG90: d.exentaRG90 ?? null,
    mensaje: d.mensaje || '',
    status: d.status
  };
  const n = (a, b) => (Math.abs((a || 0) - (b || 0)) <= TOL ? 'ok' : 'error');
  base.estados = d.estados || {
    ruc: 'ok', razon: 'ok', comp: 'ok',
    total: n(base.totalLibro, base.totalRG90),
    iva10: n(base.iva10Libro, base.iva10RG90),
    iva5: n(base.iva5Libro, base.iva5RG90),
    exenta: n(base.exentaLibro, base.exentaRG90)
  };
  return base;
};

const ESTADO_STYLE = {
  ok:    { fill: 'FFC6EFCE', font: 'FF006100' },
  warn:  { fill: 'FFFFEB9C', font: 'FF9C5700' },
  error: { fill: 'FFFFC7CE', font: 'FF9C0006' }
};

const paint = (cell, estado, isNum) => {
  const s = ESTADO_STYLE[estado] || ESTADO_STYLE.error;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: s.fill } };
  cell.font = { color: { argb: s.font }, bold: true };
  if (isNum) {
    cell.numFmt = '#,##0';
    cell.alignment = { horizontal: cell.value === '—' ? 'center' : 'right', vertical: 'middle' };
  } else {
    cell.alignment = { horizontal: cell.value === '—' ? 'center' : 'left', vertical: 'middle', wrapText: true };
  }
};

app.get('/api/export/:sessionId', verifyToken, async (req, res) => {
  try {
    const { data: session, error } = await req.supabase.from('reconciliation_sessions').select().eq('id', req.params.sessionId).eq('user_id', req.user.id).single();
    if (error || !session) return res.status(404).json({ error: 'Sesión no encontrada' });

    const rows = (session.data.discrepancies || []).map(normalizeRow);
    const contribuyente = session.data.contribuyente || 'No identificado';
    const periodo = session.data.periodo || 'No identificado';
    const coinciden = rows.filter((r) => r.status === 'success').length;
    const discrepancias = rows.filter((r) => r.status === 'error').length;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'QUΔDRA';
    const ws = wb.addWorksheet('Conciliación', { views: [{ state: 'frozen', ySplit: 6 }] });

    const NAVY = 'FF1B2A4A';
    const GOLD = 'FFD4AF37';
    const LAST = 'O'; // 15 columnas: A..O

    const widths = [16, 16, 32, 32, 18, 18, 16, 16, 15, 15, 15, 15, 15, 15, 38];
    widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    // Filas de título
    const titleRows = [
      ['QUΔDRA — Conciliación RG90 vs Libro de Compras', { size: 14, navy: true }],
      [`Contribuyente: ${contribuyente}`, { size: 11 }],
      [`Período: ${periodo}   |   Generado: ${new Date().toLocaleString('es-PY')}`, { size: 11 }],
      [`Coinciden: ${coinciden}   |   Discrepancias: ${discrepancias}`, { size: 11 }]
    ];
    titleRows.forEach(([text, opt], i) => {
      const r = i + 1;
      ws.mergeCells(`A${r}:${LAST}${r}`);
      const c = ws.getCell(`A${r}`);
      c.value = text;
      c.alignment = { horizontal: 'left', vertical: 'middle' };
      if (opt.navy) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
        c.font = { bold: true, size: opt.size, color: { argb: GOLD } };
        ws.getRow(r).height = 28;
      } else {
        c.font = { bold: true, size: opt.size, color: { argb: NAVY } };
        ws.getRow(r).height = 20;
      }
    });

    // Encabezado de dos niveles: campo (fila 5, combinado) y origen Libro / RG90 (fila 6)
    const grupos = ['RUC', 'Razón Social', 'N° Comprobante', 'Total', 'IVA 10%', 'IVA 5%', 'Exenta'];
    grupos.forEach((g, i) => {
      const c1 = 1 + i * 2;
      ws.getCell(5, c1).value = g;
      ws.mergeCells(5, c1, 5, c1 + 1);
      ws.getCell(6, c1).value = 'Libro';
      ws.getCell(6, c1 + 1).value = 'RG90';
    });
    ws.getCell(6, 15).value = 'Mensaje';

    const hStyle = {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } },
      font: { bold: true, color: { argb: GOLD }, size: 11 },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }
    };
    for (const r of [5, 6]) {
      for (let c = 1; c <= 15; c++) ws.getCell(r, c).style = hStyle;
      ws.getRow(r).height = 22;
    }

    // Datos
    const show = (v) => (v === null || v === undefined || v === '' ? '—' : v);
    rows.forEach((d) => {
      const row = ws.addRow([
        show(d.rucLibro), show(d.rucRG90),
        show(d.razonLibro), show(d.razonRG90),
        show(d.compLibro), show(d.compRG90),
        show(d.totalLibro), show(d.totalRG90),
        show(d.iva10Libro), show(d.iva10RG90),
        show(d.iva5Libro), show(d.iva5RG90),
        show(d.exentaLibro), show(d.exentaRG90),
        d.mensaje
      ]);
      const e = d.estados;
      const pares = [
        [1, e.ruc, false], [3, e.razon, false], [5, e.comp, false],
        [7, e.total, true], [9, e.iva10, true], [11, e.iva5, true], [13, e.exenta, true]
      ];
      pares.forEach(([col, estado, isNum]) => {
        paint(row.getCell(col), estado, isNum);
        paint(row.getCell(col + 1), estado, isNum);
      });
      paint(row.getCell(15), d.status === 'error' ? 'error' : 'ok', false);
    });

    ws.autoFilter = { from: 'A6', to: `${LAST}6` };

    res.setHeader('Content-Disposition', 'attachment; filename=quadra-conciliacion.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await wb.xlsx.write(res);
    res.end();
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ==================== HISTORIAL ====================
app.get('/api/sessions', verifyToken, async (req, res) => {
  try {
    const { data, error } = await req.supabase.from('reconciliation_sessions').select().eq('user_id', req.user.id).order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/session/:sessionId', verifyToken, async (req, res) => {
  try {
    const { data, error } = await req.supabase.from('reconciliation_sessions').select().eq('id', req.params.sessionId).eq('user_id', req.user.id).single();
    if (error || !data) return res.status(404).json({ error: 'Sesión no encontrada' });
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== LIQUIDACIÓN SALARIAL ====================
// Conceptos de la liquidación. Versiones nuevas envían haberes/descuentos;
// las guardadas antes traen los campos sueltos.
function conceptosLiquidacion(d) {
  if (Array.isArray(d.haberes)) return { haberes: d.haberes, descuentos: d.descuentos || [] };
  const lista = (xs) => xs.filter(([, m]) => Number(m) > 0).map(([concepto, monto]) => ({ concepto, monto: Number(monto), detalle: '' }));
  return {
    haberes: lista([
      ['Salario devengado', d.salarioDevengado], ['Horas extras', d.horasExtras], ['Aguinaldo proporcional', d.decimotercera],
      ['Vacaciones no gozadas', d.vacaciones], ['Bonificaciones', d.bonificaciones], ['Indemnización', d.indemnizacion], ['Preaviso', d.preaviso]
    ]),
    descuentos: lista([['Descuento AFP', d.descuentoAFP], ['Descuento IPS', d.descuentoIPS], ['Impuesto a la Renta', d.impuestoRenta]])
  };
}

const MODALIDAD_LIQ = {
  'renuncia': 'Renuncia',
  'despido-injustificado': 'Despido sin causa',
  'despido-justificado': 'Despido con causa',
  'retiro-justificado': 'Retiro con causa'
};

const LEYES_LIQ = [
  'Código del Trabajo (Ley 213/93 y Ley 496/95)',
  'Art. 87 y 90: preaviso de 30, 45, 60 o 90 días según antigüedad',
  'Art. 91 y 92: indemnización de 15 días de salario por año o fracción de más de 6 meses',
  'Art. 218 a 221: vacaciones de 12, 18 o 30 días',
  'Art. 243 y 244: aguinaldo, la doceava parte de lo ganado en el año',
  'IPS: aporte del trabajador del 9 % sobre lo que es salario'
];

function antiguedadTexto(a) {
  if (!a) return '';
  const p = [];
  if (a.y) p.push(`${a.y} ${a.y === 1 ? 'año' : 'años'}`);
  if (a.m) p.push(`${a.m} ${a.m === 1 ? 'mes' : 'meses'}`);
  if (a.d || !p.length) p.push(`${a.d} ${a.d === 1 ? 'día' : 'días'}`);
  return p.join(', ');
}

app.post('/api/liquidacion/excel', verifyToken, async (req, res) => {
  try {
    const datos = req.body;
    const { haberes, descuentos } = conceptosLiquidacion(datos);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Liquidación');

    const headerStyle = {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } },
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }
    };
    const gsFormat = '#,##0';
    const bold = { bold: true, color: { argb: 'FF333333' } };

    ws.columns = [{ width: 32 }, { width: 46 }, { width: 18 }];

    ws.addRow(['LIQUIDACIÓN DE HABERES']);
    ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF2C3E50' } };
    ws.mergeCells('A1:C1');
    ws.addRow([]);

    const info = [
      ['Empleado', datos.nombreEmpleado],
      ['Cédula de identidad', datos.cedula],
      ['Cargo', datos.cargo || ''],
      ['Modalidad', MODALIDAD_LIQ[datos.modalidad] || datos.modalidad || ''],
      ['Fecha de ingreso', datos.fechaIngreso || ''],
      ['Último día trabajado', datos.fechaEgreso || ''],
      ['Antigüedad', antiguedadTexto(datos.antiguedad)],
      ['Salario mensual (Gs.)', Number(datos.salarioMensual) || 0]
    ];
    info.forEach(([k, v]) => {
      const r = ws.addRow([k, v]);
      r.getCell(1).font = bold;
      if (typeof v === 'number') r.getCell(2).numFmt = gsFormat;
    });
    ws.addRow([]);

    const header = ws.addRow(['Concepto', 'Cálculo', 'Monto (Gs.)']);
    header.eachCell((c) => { c.style = headerStyle; });

    const seccion = (titulo, items, totalLabel, total) => {
      ws.addRow([titulo]).getCell(1).font = bold;
      items.forEach((it) => {
        const r = ws.addRow([it.concepto, it.detalle || '', Number(it.monto) || 0]);
        r.getCell(3).numFmt = gsFormat;
      });
      const t = ws.addRow([totalLabel, '', Number(total) || 0]);
      t.font = bold;
      t.getCell(3).numFmt = gsFormat;
      ws.addRow([]);
    };
    seccion('HABERES', haberes, 'TOTAL HABERES', datos.totalDevengado);
    seccion('DESCUENTOS', descuentos, 'TOTAL DESCUENTOS', datos.totalDescuentos);

    const neto = ws.addRow(['NETO A COBRAR', '', Number(datos.neto) || 0]);
    neto.eachCell((c) => {
      c.font = { bold: true, size: 13, color: { argb: 'FF27AE60' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FFF0' } };
    });
    neto.getCell(3).numFmt = gsFormat;

    ws.addRow([]);
    ws.addRow(['MARCO LEGAL']).getCell(1).font = { ...bold, size: 10 };
    LEYES_LIQ.forEach((ley) => {
      ws.addRow([ley]).getCell(1).font = { size: 9, color: { argb: 'FF666666' } };
    });

    res.setHeader('Content-Disposition', `attachment; filename=Liquidacion_${encodeURIComponent(datos.nombreEmpleado || 'empleado')}_${Date.now()}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/liquidacion/pdf', verifyToken, async (req, res) => {
  try {
    const datos = req.body;
    const { haberes, descuentos } = conceptosLiquidacion(datos);
    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 40;
    const lineHeight = 15;
    let y = height - 50;
    const ink = rgb(0.2, 0.2, 0.2);
    const soft = rgb(0.45, 0.45, 0.45);
    // Helvetica estándar sólo codifica WinAnsi: el signo del guaraní no existe, se escribe "Gs.".
    const gs = (n) => `Gs. ${Math.round(Number(n) || 0).toLocaleString('es-PY')}`;
    const limpio = (t) => String(t ?? '').replace(/₲/g, 'Gs.').replace(/[−–]/g, '-').replace(/[^\x20-\xFF]/g, '');

    const texto = (t, x, size = 10, font = fontNormal, color = ink) => page.drawText(limpio(t), { x, y, size, font, color });
    const derecha = (t, size = 10, font = fontNormal, color = ink) => {
      const w = font.widthOfTextAtSize(limpio(t), size);
      page.drawText(limpio(t), { x: width - margin - w, y, size, font, color });
    };
    const linea = () => {
      page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
      y -= lineHeight;
    };

    texto('LIQUIDACIÓN DE HABERES', margin, 16, fontBold, rgb(0.18, 0.24, 0.31));
    y -= lineHeight * 1.6;

    [
      ['Empleado', datos.nombreEmpleado],
      ['Cédula', datos.cedula],
      ['Cargo', datos.cargo || ''],
      ['Modalidad', MODALIDAD_LIQ[datos.modalidad] || datos.modalidad || ''],
      ['Período', datos.fechaIngreso && datos.fechaEgreso ? `${datos.fechaIngreso} al ${datos.fechaEgreso}` : ''],
      ['Antigüedad', antiguedadTexto(datos.antiguedad)],
      ['Salario mensual', datos.salarioMensual ? gs(datos.salarioMensual) : '']
    ].filter(([, v]) => v).forEach(([k, v]) => {
      texto(`${k}:`, margin, 10, fontBold);
      texto(v, margin + 110, 10);
      y -= lineHeight;
    });

    y -= 6;
    linea();

    const seccion = (titulo, items, totalLabel, total) => {
      texto(titulo, margin, 12, fontBold);
      y -= lineHeight * 1.2;
      items.forEach((it) => {
        texto(it.concepto, margin + 10, 10);
        derecha(gs(it.monto));
        if (it.detalle) {
          y -= 11;
          texto(it.detalle, margin + 10, 8, fontNormal, soft);
        }
        y -= lineHeight;
      });
      if (!items.length) {
        texto('Sin conceptos', margin + 10, 10, fontNormal, soft);
        y -= lineHeight;
      }
      texto(totalLabel, margin, 11, fontBold);
      derecha(gs(total), 11, fontBold);
      y -= lineHeight * 1.2;
      linea();
    };
    seccion('HABERES', haberes, 'TOTAL HABERES', datos.totalDevengado);
    seccion('DESCUENTOS', descuentos, 'TOTAL DESCUENTOS', datos.totalDescuentos);

    const verde = rgb(0.15, 0.6, 0.35);
    texto('NETO A COBRAR', margin, 13, fontBold, verde);
    derecha(gs(datos.neto), 13, fontBold, verde);
    y -= lineHeight * 2;
    linea();

    texto('MARCO LEGAL', margin, 10, fontBold);
    y -= lineHeight;
    LEYES_LIQ.forEach((ley) => {
      texto(ley, margin + 10, 8, fontNormal, soft);
      y -= lineHeight * 0.8;
    });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Disposition', `attachment; filename=Liquidacion_${encodeURIComponent(datos.nombreEmpleado || 'empleado')}_${Date.now()}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(pdfBytes));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ==================== COTIZACIÓN DNIT ====================
// Tipos de cambio oficiales publicados por la DNIT (ver services/cotizaciones-dnit.js).
// Nunca se devuelve otro día en silencio: si la fecha no está publicada, se informa.
const fFechaPY = (iso) => iso.split('-').reverse().join('/');

app.post('/api/cotizacion', verifyToken, async (req, res) => {
  try {
    const { fecha, moneda } = req.body || {};

    if (!fecha || !moneda) {
      return res.status(400).json({ success: false, message: 'Fecha y moneda son requeridas' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha))) {
      return res.status(400).json({ success: false, message: 'Fecha inválida' });
    }
    if (!MONEDAS_DNIT.includes(moneda)) {
      return res.status(400).json({
        success: false,
        message: `La DNIT no publica cotización para ${moneda}. Monedas disponibles: ${MONEDAS_DNIT.join(', ')}`
      });
    }

    let resultado;
    try {
      resultado = await cotizacionDelDia(fecha, moneda);
    } catch (err) {
      console.error('Cotización DNIT no disponible:', err.message);
      return res.status(503).json({
        success: false,
        message: 'No se pudo consultar la página de cotizaciones de la DNIT. Intentá de nuevo en unos minutos.'
      });
    }

    if (!resultado.encontrada) {
      const ultima = resultado.ultimaFecha ? fFechaPY(resultado.ultimaFecha) : null;
      const message = resultado.motivo === 'no-publicada'
        ? `La DNIT todavía no publicó la cotización del ${fFechaPY(fecha)}. Última fecha publicada: ${ultima}.`
        : `La DNIT no tiene cotización de ${moneda} para el ${fFechaPY(fecha)}.`;
      return res.status(404).json({ success: false, message, ultimaFecha: resultado.ultimaFecha });
    }

    // Registro de consultas (no bloquea la respuesta)
    const { error: insertError } = await req.supabase.from('cotizaciones')
      .insert([{
        user_id: req.user.id,
        fecha: resultado.fecha,
        moneda,
        comprador: resultado.comprador,
        vendedor: resultado.vendedor
      }]);
    if (insertError) console.error('No se pudo guardar la cotización en el historial:', insertError.message);

    res.json({
      success: true,
      data: {
        fecha: resultado.fecha,
        moneda,
        comprador: resultado.comprador,
        vendedor: resultado.vendedor,
        fuente: 'DNIT',
        fuenteUrl: FUENTE_URL
      }
    });
  } catch (err) {
    console.error('Error en /api/cotizacion:', err);
    res.status(500).json({ success: false, message: 'Error al consultar la cotización' });
  }
});

// ==================== OCR ROUTES ====================
app.use('/api/ocr', verifyToken, ocrRoutes);

// ==================== CONTROL PAGOS ROUTES ====================
app.use('/api/control-pagos', verifyToken, controlPagosRoutes);

app.use(uploadErrorHandler);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ QUΔDRA - Servidor corriendo en puerto ${PORT}`));
