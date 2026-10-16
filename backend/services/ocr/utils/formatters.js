/**
 * Formatea una fecha
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
}

/**
 * Formatea un monto como moneda
 */
export function formatMoney(amount, currency = 'Gs') {
  if (!amount || isNaN(amount)) return `${currency} 0.00`;
  const num = parseFloat(amount);
  return `${currency} ${num.toLocaleString('es-PY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Normaliza un RUC
 */
export function normalizeRuc(ruc) {
  return ruc?.toString().replace(/[\D]/g, '').substring(0, 9) || '';
}

/**
 * Limpia texto para OCR
 */
export function cleanText(text) {
  return text
    ?.replace(/[\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || '';
}

/**
 * Extrae números de un string
 */
export function extractNumbers(text) {
  const matches = text?.match(/\d+(?:[.,]\d+)?/g) || [];
  return matches.map((m) => parseFloat(m.replace(',', '.')));
}

/**
 * Valida estructura de comprobante
 */
export function validateComprobanteNumber(numero) {
  // Formato: 001-001-0000001 o similar
  const parts = numero?.split('-') || [];
  return parts.length === 3 && parts.every((p) => /^\d+$/.test(p));
}

export default {
  formatDate,
  formatMoney,
  normalizeRuc,
  cleanText,
  extractNumbers,
  validateComprobanteNumber,
};
