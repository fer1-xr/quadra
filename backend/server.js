import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import XLSX from 'xlsx';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
// En producción: FRONTEND_URL = dominio(s) del frontend separados por coma (ej. https://quadra.vercel.app).
// En desarrollo (sin FRONTEND_URL) se permite cualquier origen.
const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
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
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// ==================== VALIDACIONES DE AUTENTICACIÓN ====================
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  if (!/[@$!%*?&]/.test(password)) return false;
  return true;
};

// Para testing: simulamos envío de email mostrando enlace en consola
const sendPasswordResetEmail = (email, resetToken, resetLink) => {
  console.log(`\n📧 EMAIL SIMULADO ENVIADO A: ${email}`);
  console.log(`🔗 ENLACE DE RESET: ${resetLink}`);
  console.log(`🔐 TOKEN: ${resetToken}\n`);
  // En producción, aquí se integraría SendGrid, Mailgun, etc.
};

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Contraseña débil. Debe tener mínimo 8 caracteres, mayúsculas, minúsculas, números y símbolos especiales' });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
    }

    // Verificar si el email ya existe
    const { data: existingUser } = await supabase.from('users').select().eq('email', email).single();
    if (existingUser) {
      return res.status(400).json({ error: 'Este email ya está registrado' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('users').insert([{ email, password_hash, name: name.trim() }]).select();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Este email ya está registrado' });
      }
      return res.status(400).json({ error: error.message });
    }

    const token = jwt.sign({ id: data[0].id, email: data[0].email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: data[0].id, email: data[0].email, name: data[0].name } });
  } catch (e) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    const { data, error } = await supabase.from('users').select().eq('email', email).single();
    if (error || !data) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const valid = await bcrypt.compare(password, data.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ id: data.id, email: data.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: data.id, email: data.email, name: data.name } });
  } catch (e) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// ==================== FORGOT PASSWORD ====================
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'El email es requerido' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    // Verificar que el email existe
    const { data: user } = await supabase.from('users').select().eq('email', email).single();
    if (!user) {
      // Por seguridad, no revelamos si el email existe o no
      return res.json({ message: 'Si el email existe, recibirás un enlace de recuperación' });
    }

    // Generar token JWT corta duración (15 minutos)
    const resetToken = jwt.sign(
      { id: user.id, email: user.email, type: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Frontend URL para el enlace (en desarrollo localhost, en producción el dominio real)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}?token=${resetToken}`;

    // Enviar email (simulado en consola para testing)
    sendPasswordResetEmail(email, resetToken, resetLink);

    res.json({ message: 'Enlace de recuperación enviado' });
  } catch (e) {
    console.error('Error en forgot-password:', e);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// ==================== RESET PASSWORD ====================
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token y contraseña son requeridos' });
    }

    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ error: 'El enlace de recuperación ha expirado' });
    }

    if (decoded.type !== 'password-reset') {
      return res.status(400).json({ error: 'Token inválido' });
    }

    // Validar la nueva contraseña
    if (!validatePassword(newPassword)) {
      return res.status(400).json({ error: 'Contraseña débil. Debe tener mínimo 8 caracteres, mayúsculas, minúsculas, números y símbolos especiales' });
    }

    // Hashear nueva contraseña
    const password_hash = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña en BD
    const { error } = await supabase
      .from('users')
      .update({ password_hash })
      .eq('id', decoded.id);

    if (error) {
      return res.status(400).json({ error: 'Error al actualizar contraseña' });
    }

    res.json({ message: 'Contraseña actualizada. Por favor inicia sesión con tu nueva contraseña' });
  } catch (e) {
    console.error('Error en reset-password:', e);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

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

const normName = (s) => clean(s)
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/\./g, '')
  .replace(/SOCIEDAD DE RESPONSABILIDAD LIMITADA/g, 'SRL')
  .replace(/SOCIEDAD ANONIMA/g, 'SA')
  .replace(/[^A-Z0-9]+/g, ' ')
  .trim();

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

const reconcile = (rg90Data, libroData) => {
  const rg90Sheets = loadSheets(rg90Data);
  const libroSheets = loadSheets(libroData);

  const rgPick = pickSheet(rg90Sheets, isRg90Header);
  const lbPick = pickSheet(libroSheets, isLibroHeader);

  if (!rgPick) {
    if (pickSheet(rg90Sheets, isLibroHeader)) {
      throw fail('El archivo cargado como RG90 parece ser el Libro de Compras. Revisá que no estén invertidos.');
    }
    throw fail('No se reconoció el RG90: no se encontró la fila de encabezados (RUC / Nº de Identificación del Informado, Número de Comprobante).' + describeFile(rg90Sheets));
  }
  if (!lbPick) {
    if (pickSheet(libroSheets, isRg90Header)) {
      throw fail('El archivo cargado como Libro de Compras parece ser el RG90. Revisá que no estén invertidos.');
    }
    throw fail('No se reconoció el Libro de Compras: no se encontró la fila de encabezados (RUC, Documento).' + describeFile(libroSheets));
  }
  const rg90Rows = rgPick.rows;
  const libroRows = lbPick.rows;
  const rgHead = rgPick.head;
  const lbHead = lbPick.head;

  const rc = rg90Cols(rgHead.headers);
  const lc = libroCols(lbHead.headers);
  const avisos = [];

  // ---- RG90 -> mapa por llave RUC_Comprobante ----
  const rg90Map = new Map();
  let informanteRG90 = '';
  for (let i = rgHead.index + 1; i < rg90Rows.length; i++) {
    const row = rg90Rows[i];
    if (!row) continue;
    const { ruc, dv } = splitRuc(row[rc.ruc]);
    const compKey = compDigits(row[rc.comp]);
    if (!ruc || !compKey) continue;
    if (!informanteRG90) informanteRG90 = splitRuc(row[rc.informante]).ruc;
    const entry = {
      ruc,
      rucFmt: fmtRuc(ruc, dv),
      razon: clean(row[rc.razon]),
      comp: fmtComp(row[rc.comp]),
      tipo: clean(row[rc.tipo]),
      total: toNum(row[rc.total]),
      iva10: toNum(row[rc.iva10]),
      iva5: toNum(row[rc.iva5]),
      exenta: toNum(row[rc.exenta]),
      processed: false
    };
    const key = ruc + '_' + compKey;
    if (!rg90Map.has(key)) rg90Map.set(key, []);
    rg90Map.get(key).push(entry);
  }

  // ---- Libro -> cruce contra el RG90 ----
  const discrepancies = [];
  let omitidasSinRuc = 0;
  for (let i = lbHead.index + 1; i < libroRows.length; i++) {
    const row = libroRows[i];
    if (!row) continue;
    const { ruc, dv } = splitRuc(row[lc.ruc], row[lc.dv]);
    const compDig = compDigits(row[lc.comp]);
    if (!ruc || !compDig) {
      if (compDig.length >= 9) omitidasSinRuc++;
      continue; // filas de título, totales o pie de página
    }
    const lib = {
      ruc,
      rucFmt: fmtRuc(ruc, dv),
      razon: clean(row[lc.razon]),
      comp: fmtComp(row[lc.comp]),
      total: toNum(row[lc.total]),
      iva10: toNum(row[lc.iva10]),
      iva5: toNum(row[lc.iva5]),
      exenta: toNum(row[lc.exenta])
    };
    const list = rg90Map.get(ruc + '_' + compDig);
    const rg = list ? (list.find((e) => !e.processed) || list[0]) : null;
    if (rg) rg.processed = true;
    discrepancies.push(buildRow(lib, rg));
  }

  // ---- RG90 sin pareja en el Libro ----
  for (const list of rg90Map.values()) {
    for (const e of list) if (!e.processed) discrepancies.push(buildRow(null, e));
  }

  // ---- Metadatos y avisos ----
  const { contribuyente: contribLibro, periodo } = extractMeta(libroRows, lbHead.index);
  const contribuyente = contribLibro || (informanteRG90 ? `RUC ${informanteRG90}` : '');
  const rucContribLibro = (contribLibro.match(/(\d[\d.]*)\s*-\s*\d/) || [])[1]?.replace(/\D/g, '');
  if (rucContribLibro && informanteRG90 && rucContribLibro !== informanteRG90) {
    avisos.push(`El RUC del informante en el RG90 (${informanteRG90}) no coincide con el del contribuyente en el Libro (${rucContribLibro}). Verificá que ambos archivos sean del mismo cliente.`);
  }
  if (omitidasSinRuc > 0) {
    avisos.push(`${omitidasSinRuc} fila(s) del Libro sin RUC no se incluyeron en la conciliación.`);
  }

  return { discrepancies, contribuyente, periodo, avisos };
};

app.post('/api/reconciliation', verifyToken, async (req, res) => {
  try {
    const { rg90Data, libroData } = req.body;
    const { discrepancies, contribuyente, periodo, avisos } = reconcile(rg90Data, libroData);

    const totalDiscrepancies = discrepancies.filter((d) => d.status === 'error').length;
    const totalCoincidencias = discrepancies.filter((d) => d.status === 'success').length;

    const { data: session, error: se } = await supabase.from('reconciliation_sessions')
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
    const { data: session, error } = await supabase.from('reconciliation_sessions').select().eq('id', req.params.sessionId).eq('user_id', req.user.id).single();
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
    const { data, error } = await supabase.from('reconciliation_sessions').select().eq('user_id', req.user.id).order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/session/:sessionId', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase.from('reconciliation_sessions').select().eq('id', req.params.sessionId).eq('user_id', req.user.id).single();
    if (error || !data) return res.status(404).json({ error: 'Sesión no encontrada' });
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ QUΔDRA - Servidor corriendo en puerto ${PORT}`));
